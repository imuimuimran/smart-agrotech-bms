import mongoose from "mongoose";
import ApiError from "../../shared/ApiError.js";
import HTTP_STATUS from "../../constants/httpStatus.js";
import { Purchase } from "./purchase.model.js"; 
import { GoodsReceipt } from "./goodsReceipt.model.js";
import Product from "../products/product.model.js";
import { PurchaseReturn } from "./purchaseReturn.model.js";
import { getNextSequence } from "../../utils/sequence.util.js";
import generatePublicId from "../../utils/generatePublicId.js"; 
import { ActivityLogService } from "../activity-logs/activityLog.service.js";
import { InventoryService } from "../inventory/inventory.service.js";
import ROLES from "../../constants/roles.js";
import { 
  PURCHASE_RETURN_STATUS, 
  isPurchaseReturnTransitionAllowed 
} from "./purchaseReturn.constants.js";

/**
 * Phase 12.4.2 — Consecutive Return Number Generation Engine
 * Generates unique document numbers sequentially on final document creation.
 */
const generatePurchaseReturnNumber = async (session) => {
  const sequence = await getNextSequence("purchase_return", session);
  return `PRRET-${String(sequence).padStart(6, "0")}`;
};

/**
 * Phase 12.4.3.2 — Purchase Order Validation Helper
 * Confirms PO exists and belongs to the specified vendor parameter.
 */
const getValidPurchase = async (purchaseId, supplierId, session = null) => {
  const query = Purchase.findById(purchaseId);
  if (session) query.session(session);
  
  const purchase = await query;
  if (!purchase) {
    throw new ApiError(HTTP_STATUS.NOT_FOUND, "Original purchase order record not found.");
  }
  if (String(purchase.supplierId) !== String(supplierId)) {
    throw new ApiError(HTTP_STATUS.BAD_REQUEST, "The selected purchase order does not belong to the specified supplier.");
  }
  return purchase;
};

/**
 * Phase 12.4.3.3 — Goods Receipt Note (GRN) Validation Helper
 * Enforces strict multi-entity referential matching constraints across the chain.
 */
const getValidGoodsReceipt = async (goodsReceiptId, purchaseId, supplierId, warehouseId, session = null) => {
  const query = GoodsReceipt.findById(goodsReceiptId);
  if (session) query.session(session);

  const goodsReceipt = await query;
  if (!goodsReceipt) {
    throw new ApiError(HTTP_STATUS.NOT_FOUND, "Goods receipt note not found.");
  }
  if (String(goodsReceipt.purchaseId) !== String(purchaseId)) {
    throw new ApiError(HTTP_STATUS.BAD_REQUEST, "The goods receipt note does not belong to the specified purchase order.");
  }
  if (String(goodsReceipt.supplierId) !== String(supplierId)) {
    throw new ApiError(HTTP_STATUS.BAD_REQUEST, "The goods receipt note does not belong to the specified supplier.");
  }
  if (String(goodsReceipt.warehouseId) !== String(warehouseId)) {
    throw new ApiError(HTTP_STATUS.BAD_REQUEST, "The goods receipt note does not match the designated inventory warehouse.");
  }
  return goodsReceipt;
};

/**
 * Phase 12.4.4.2 — Get Eligible Return Quantity Helper
 * Computes historical quantities already returned under completed vouchers.
 */
const getEligibleReturnQuantity = async ({
  purchaseId,
  goodsReceiptId,
  purchaseItemId,
  goodsReceiptItemId,
}) => {
  const existingReturns = await PurchaseReturn.find({
    purchaseId,
    goodsReceiptId,
    isDeleted: false,
    status: "COMPLETED",
    "items.purchaseItemId": purchaseItemId,
    "items.goodsReceiptItemId": goodsReceiptItemId,
  }).select("items");

  let previouslyReturnedQuantity = 0;
  for (const purchaseReturn of existingReturns) {
    for (const item of purchaseReturn.items) {
      if (
        String(item.purchaseItemId) === String(purchaseItemId) &&
        String(item.goodsReceiptItemId) === String(goodsReceiptItemId)
      ) {
        previouslyReturnedQuantity += item.returnQuantity;
      }
    }
  }
  return previouslyReturnedQuantity;
};

/**
 * Phase 12.4.4.3 — Determine Authoritative Received Quantity Helper
 */
const findGoodsReceiptItem = (goodsReceipt, goodsReceiptItemId) => {
  const item = goodsReceipt.items.find(
    (receiptItem) => String(receiptItem._id) === String(goodsReceiptItemId)
  );
  if (!item) {
    throw new ApiError(
      HTTP_STATUS.BAD_REQUEST,
      "Goods receipt item does not belong to the specified goods receipt"
    );
  }
  return item;
};

/**
 * Phase 12.4.4.4 — Calculate Remaining Eligible Quantity Helper
 */
const calculateRemainingEligibleQuantity = async ({
  purchaseId,
  goodsReceiptId,
  goodsReceiptItem,
}) => {
  const previouslyReturnedQuantity = await getEligibleReturnQuantity({
    purchaseId,
    goodsReceiptId,
    purchaseItemId: goodsReceiptItem.purchaseItemId || goodsReceiptItem._id, 
    goodsReceiptItemId: goodsReceiptItem._id,
  });

  const receivedQuantity = Number(goodsReceiptItem.acceptedQuantity ?? 0);
  const remainingQuantity = receivedQuantity - previouslyReturnedQuantity;
  return Math.max(remainingQuantity, 0);
};

/**
 * Phase 12.4.5 — Return Item Eligibility Validation
 * Builds item-level snapshots authoritatively while rejecting over-return entries.
 */
const prepareAuthoritativeReturnItems = async ({
  requestedItems,
  purchaseId,
  goodsReceipt,
}) => {
  const verifiedSnapshots = [];

  for (const requestedItem of requestedItems) {
    const product = await Product.findOne({
      _id: requestedItem.productId,
      isDeleted: false,
    });

    if (!product) {
      throw new ApiError(
        HTTP_STATUS.NOT_FOUND,
        `Master product record not found for ID ${requestedItem.productId}.`
      );
    }

    const goodsReceiptItem = findGoodsReceiptItem(goodsReceipt, requestedItem.goodsReceiptItemId);

    if (String(goodsReceiptItem.productId) !== String(requestedItem.productId)) {
      throw new ApiError(
        HTTP_STATUS.BAD_REQUEST,
        `Mismatched identity: Goods receipt line item product does not match product ${product.productName}.`
      );
    }

    const remainingEligible = await calculateRemainingEligibleQuantity({
      purchaseId,
      goodsReceiptId: goodsReceipt._id,
      goodsReceiptItem,
    });

    if (requestedItem.returnQuantity > remainingEligible) {
      throw new ApiError(
        HTTP_STATUS.BAD_REQUEST,
        `Fulfillment violation: Return quantity for "${product.productName}" exceeds remaining eligible volume of ${remainingEligible}.`
      );
    }

    const authoritativeUnitCost = Number(goodsReceiptItem.unitCost);
    const calculatedLineTotal = requestedItem.returnQuantity * authoritativeUnitCost;

    verifiedSnapshots.push({
      productId: product._id,
      productNameSnapshot: product.productName,
      skuSnapshot: product.sku,
      purchaseItemId: goodsReceiptItem.purchaseItemId || requestedItem.purchaseItemId, 
      goodsReceiptItemId: goodsReceiptItem._id,
      receivedQuantity: Number(goodsReceiptItem.acceptedQuantity ?? 0),
      returnQuantity: requestedItem.returnQuantity,
      unitCost: mongoose.Types.Decimal128.fromString(authoritativeUnitCost.toFixed(2)),
      lineTotal: mongoose.Types.Decimal128.fromString(calculatedLineTotal.toFixed(2)),
      reason: requestedItem.reason || "Damaged/Defective lot returned.",
      batchNumber: goodsReceiptItem.batchNumber || null,
      serialNumbers: goodsReceiptItem.serialNumbers || [],
    });
  }

  return verifiedSnapshots;
};

/**
 * Phase 12.4.6 — Authoritative Financial & Quantity Aggregate Calculation
 */
const calculateReturnTotals = (verifiedReturnItems) => {
  let totalQuantity = 0;
  let totalAmountAccumulator = 0;

  for (const item of verifiedReturnItems) {
    totalQuantity += item.returnQuantity;
    totalAmountAccumulator += Number(item.lineTotal.toString());
  }

  return {
    totalQuantity,
    totalAmount: mongoose.Types.Decimal128.fromString(totalAmountAccumulator.toFixed(2)),
  };
};

/**
 * Phase 12.4.7 — Replacement Item Validation for Exchanges
 * Builds server-side snapshots for incoming exchange variants using authoritative costs.
 */
const prepareAuthoritativeReplacementItems = async (replacementItemsInput, returnType) => {
  if (returnType === "RETURN") {
    if (replacementItemsInput && replacementItemsInput.length > 0) {
      throw new ApiError(
        HTTP_STATUS.BAD_REQUEST,
        "Replacement items are not allowed for a standard RETURN."
      );
    }
    return [];
  }

  if (returnType === "EXCHANGE") {
    if (!replacementItemsInput || replacementItemsInput.length === 0) {
      throw new ApiError(
        HTTP_STATUS.BAD_REQUEST,
        "Replacement items are required for an EXCHANGE workflow."
      );
    }
  }

  const replacementSnapshots = [];

  for (const item of replacementItemsInput) {
    const product = await Product.findOne({ _id: item.productId, isDeleted: false });
    if (!product) {
      throw new ApiError(
        HTTP_STATUS.NOT_FOUND,
        `Replacement master product record not found for ID ${item.productId}.`
      );
    }

    if (product.status !== "ACTIVE") {
      throw new ApiError(
        HTTP_STATUS.BAD_REQUEST,
        `Replacement product "${product.productName}" is not eligible for inventory operations.`
      );
    }

    const authoritativeCostBasis = Number(product.pricing?.purchasePrice || 0);
    const calculatedLineTotal = item.quantity * authoritativeCostBasis;

    replacementSnapshots.push({
      productId: product._id,
      productNameSnapshot: product.productName,
      skuSnapshot: product.sku,
      quantity: item.quantity,
      unitCost: mongoose.Types.Decimal128.fromString(authoritativeCostBasis.toFixed(2)),
      lineTotal: mongoose.Types.Decimal128.fromString(calculatedLineTotal.toFixed(2)),
      batchNumber: item.batchNumber || null,
      serialNumbers: item.serialNumbers || [],
    });
  }

  return replacementSnapshots;
};

/**
 * Phase 12.4.8 — Build the Authoritative Purchase Return Document
 * Master creation pipeline orchestrating deep procurement validations and persisting 
 * the draft voucher transaction cleanly inside a managed session.
 */
const createPurchaseReturn = async (payload, reqUser) => {
  // Ensure requesting identity presence exists before transaction starts
  if (!reqUser?.id) {
    throw new ApiError(HTTP_STATUS.UNAUTHORIZED, "Authenticated user identity context is required.");
  }

  const session = await mongoose.startSession();

  session.startTransaction();

  try {
    // 1. Cross-reference top-level procurement entities
    await getValidPurchase(payload.purchaseId, payload.supplierId, session);
    const goodsReceipt = await getValidGoodsReceipt(
      payload.goodsReceiptId,
      payload.purchaseId,
      payload.supplierId,
      payload.warehouseId,
      session
    );

    // 2. Build authoritative item maps and verify return ceilings
    const verifiedReturnItems = await prepareAuthoritativeReturnItems({
      requestedItems: payload.items,
      purchaseId: payload.purchaseId,
      goodsReceipt,
    });

    // 3. Process exchange replacement fields if applicable
    const verifiedReplacementItems = await prepareAuthoritativeReplacementItems(
      payload.replacementItems,
      payload.returnType
    );

    // 4. Calculate final quantities and aggregate costs server-side
    const totals = calculateReturnTotals(verifiedReturnItems);
    const returnNumber = await generatePurchaseReturnNumber(session);
    const publicId = generatePublicId("PR");

    // 5. Construct and save the authoritative PurchaseReturn document [Page 1]
    const purchaseReturn = new PurchaseReturn({
      publicId,
      returnNumber,
      supplierId: payload.supplierId,
      purchaseId: payload.purchaseId,
      goodsReceiptId: payload.goodsReceiptId,
      discrepancyId: payload.discrepancyId || null,
      warehouseId: payload.warehouseId,
      returnType: payload.returnType,
      items: verifiedReturnItems,
      replacementItems: verifiedReplacementItems,
      reason: payload.reason,
      remarks: payload.remarks || "",
      totalQuantity: totals.totalQuantity,
      totalAmount: totals.totalAmount,
      status: "DRAFT", // Secure baseline initialization state [Page 1]
      createdBy: reqUser.id,
      updatedBy: reqUser.id,
    });
    
    await purchaseReturn.save({ session });

    // 6. Create systemic audit trail integration footprint [Page 1]
    await ActivityLogService.logActivity({
      user: reqUser.id,
      action: "CREATE",
      module: "PURCHASES",
      entityId: purchaseReturn._id,
      description: `Purchase return record ${returnNumber} (${payload.returnType}) successfully created in DRAFT state.`,
      metadata: {
        returnNumber,
        returnType: payload.returnType,
        totalQuantity: totals.totalQuantity,
        totalAmount: totals.totalAmount.toString(),
      },
      session,
    });

    await session.commitTransaction();
    return purchaseReturn;
  } catch (error) {
    await session.abortTransaction();
    throw error;
  } finally {
    session.endSession();
  }
};


/**
 * Phase 12.5.5 — Enhanced Controlled Purchase Return Workflow Service
 * Multi-layer defense: Validates roles, checks transition matrix, and prevents state bypassing.
 */
export const transitionPurchaseReturnStatus = async (returnPublicId, nextStatus, reqUser) => {
  if (!reqUser?.id) {
    throw new ApiError(httpStatus.UNAUTHORIZED, "Authenticated user identity context is required.");
  }

  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const purchaseReturn = await PurchaseReturn.findOne({
      publicId: returnPublicId,
      isDeleted: false,
    }).session(session);

    if (!purchaseReturn) {
      throw new ApiError(httpStatus.NOT_FOUND, "Purchase return record not found.");
    }

    const currentStatus = purchaseReturn.status;

    // 1. Phase 12.5.5 Service-Level Security Boundary: Enforce strict role authorization
    const actorRole = reqUser.role;

    // Administrative Transitions: Approval and Rejection are isolated to ADMIN only
    if (nextStatus === PURCHASE_RETURN_STATUS.APPROVED || nextStatus === PURCHASE_RETURN_STATUS.REJECTED) {
      if (actorRole !== ROLES.ADMIN) {
        throw new ApiError(
          httpStatus.FORBIDDEN,
          "Access Denied: Strict Admin privileges are required to approve or reject purchase returns."
        );
      }
    }

    // Operational Transitions: Submission and Cancellation are open to ADMIN and MODERATOR
    if (nextStatus === PURCHASE_RETURN_STATUS.PENDING_APPROVAL || nextStatus === PURCHASE_RETURN_STATUS.CANCELLED) {
      if (actorRole !== ROLES.ADMIN && actorRole !== ROLES.MODERATOR) {
        throw new ApiError(
          httpStatus.FORBIDDEN,
          "Access Denied: You do not hold the required procurement permissions to execute this action."
        );
      }
    }

    // 2. Validate the requested transition using the 12.5.1 state transition matrix
    const isAllowed = isPurchaseReturnTransitionAllowed(currentStatus, nextStatus);
    if (!isAllowed) {
      throw new ApiError(
        httpStatus.BAD_REQUEST,
        `Workflow Violation: Direct state bypass from "${currentStatus}" to "${nextStatus}" is completely blocked.`
      );
    }

    // 3. Apply state-specific modifications authoritatively (Server-controlled metadata)
    purchaseReturn.status = nextStatus;
    purchaseReturn.updatedBy = reqUser.id;

    if (currentStatus === PURCHASE_RETURN_STATUS.PENDING_APPROVAL && nextStatus === PURCHASE_RETURN_STATUS.APPROVED) {
      purchaseReturn.approvedBy = reqUser.id;
      purchaseReturn.approvedAt = new Date();
    }

    if (nextStatus === PURCHASE_RETURN_STATUS.COMPLETED) {
      throw new ApiError(
        httpStatus.BAD_REQUEST,
        "Workflow Guard Exception: Direct status jump to COMPLETED is blocked. Completion must be triggered after physical inventory transactions succeed."
      );
    }

    await purchaseReturn.save({ session });

    // 4. Record state transition through the existing system log helper
    await ActivityLogService.logActivity({
      user: reqUser.id,
      action: "UPDATE",
      module: "PURCHASES",
      entityId: purchaseReturn._id,
      description: `Purchase return ${purchaseReturn.returnNumber} advanced from "${currentStatus}" to "${nextStatus}" by user ${reqUser.name}.`,
      metadata: {
        returnNumber: purchaseReturn.returnNumber,
        previousStatus: currentStatus,
        newStatus: nextStatus,
      },
      session,
    });

    await session.commitTransaction();
    return purchaseReturn;
  } catch (error) {
    await session.abortTransaction();
    throw error;
  } finally {
    session.endSession();
  }
};

/**
 * Phase 12.5.3.1 — Submit Purchase Return For Approval
 * Workflow Shift: DRAFT → PENDING_APPROVAL
 */
export const submitPurchaseReturnForApproval = async (returnPublicId, reqUser) => {
  return await transitionPurchaseReturnStatus(
    returnPublicId, 
    PURCHASE_RETURN_STATUS.PENDING_APPROVAL, 
    reqUser
  );
};

/**
 * Phase 12.5.3.2 — Approve Purchase Return Document
 * Workflow Shift: PENDING_APPROVAL → APPROVED
 * (The underlying transition engine automatically records approval timestamps and actor IDs)
 */
export const approvePurchaseReturn = async (returnPublicId, reqUser) => {
  return await transitionPurchaseReturnStatus(
    returnPublicId, 
    PURCHASE_RETURN_STATUS.APPROVED, 
    reqUser
  );
};

/**
 * Phase 12.5.3.3 — Reject Purchase Return Request
 * Workflow Shift: PENDING_APPROVAL → REJECTED
 * 
 * Supports an optional payload update reason context mapped to the database 
 * remarks key before executing status mutations.
 */
export const rejectPurchaseReturn = async (returnPublicId, payload, reqUser) => {
  if (payload?.reason) {
    const session = await mongoose.startSession();
    session.startTransaction();
    try {
      // Append the explicit structural rejection reason to remarks field before transition
      await PurchaseReturn.updateOne(
        { publicId: returnPublicId, status: PURCHASE_RETURN_STATUS.PENDING_APPROVAL, isDeleted: false },
        { $set: { remarks: `REJECTION REASON: ${payload.reason.trim()}` } },
        { session }
      );
      await session.commitTransaction();
    } catch (error) {
      await session.abortTransaction();
      throw error;
    } finally {
      session.endSession();
    }
  }

  return await transitionPurchaseReturnStatus(
    returnPublicId, 
    PURCHASE_RETURN_STATUS.REJECTED, 
    reqUser
  );
};

/**
 * Phase 12.5.3.4 — Cancel Purchase Return Order
 * Workflow Shift: DRAFT → CANCELLED or PENDING_APPROVAL → CANCELLED
 * (The 12.5.1 matrix automatically blocks cancellation from processing or completed states)
 */
export const cancelPurchaseReturn = async (returnPublicId, reqUser) => {
  return await transitionPurchaseReturnStatus(
    returnPublicId, 
    PURCHASE_RETURN_STATUS.CANCELLED, 
    reqUser
  );
};



/**
 * Phase 12.6.2 — Prepare Inbound Inventory Movement Instructions (EXCHANGE only)
 * Converts exchange replacement arrays into explicit STOCK IN instructions.
 * 
 * @param {Object} purchaseReturn - The master PurchaseReturn document context
 * @param {string} userId - The object identifier of the authenticated processing user
 * @returns {Array<Object>} Array of explicit inventory IN instruction configurations
 */
const prepareInboundStockInstructions = (purchaseReturn, userId) => {
  if (purchaseReturn.returnType !== "EXCHANGE") {
    return [];
  }

  return purchaseReturn.replacementItems.map((item) => {
    const numericalCostBasis = Number(item.unitCost.toString());

    return {
      productId: item.productId,
      warehouseId: purchaseReturn.warehouseId,
      quantity: item.quantity,
      unitCost: numericalCostBasis,
      referenceType: "PURCHASE_RETURN",
      referenceId: purchaseReturn._id,
      postedBy: userId,
      remarks: `Inbound procurement replacement lot received under voucher ${purchaseReturn.returnNumber}`,
    };
  });
};


/**
 * Phase 12.6.2 — Internal Helper: Prepare Outbound Inventory Movement Instructions
 */
const prepareOutboundStockInstructions = (purchaseReturn, userId) => {
  return purchaseReturn.items.map((item) => {
    const numericalCostBasis = Number(item.unitCost.toString());
    return {
      productId: item.productId,
      warehouseId: purchaseReturn.warehouseId,
      quantity: item.returnQuantity, 
      unitCost: numericalCostBasis,
      referenceType: "PURCHASE_RETURN", // Identifies Purchase Return as the stock event [Page 1]
      referenceId: purchaseReturn._id,
      postedBy: userId,
      remarks: `Outbound procurement return shipment issued for voucher ${purchaseReturn.returnNumber}`,
    };
  });
};

/**
 * Phase 12.6.3 Master Pipeline Core — Execute Return Inventory Processing
 * Orchestrates status verification, loops over prepared instructions, dispatches 
 * stock deductions via InventoryService, and advances state cleanly to COMPLETED.
 * 
 * @param {string} returnPublicId - Unique public business trace identifier
 * @param {Object} reqUser - Request user context token data object
 * @returns {Promise<Object>} The updated PurchaseReturn document
 */
export const processPurchaseReturn = async (returnPublicId, reqUser) => {
  if (!reqUser?.id) {
    throw new ApiError(httpStatus.UNAUTHORIZED, "Authenticated user identity context is required.");
  }

  const session = await mongoose.startSession();
  session.startTransaction(); // Master transactional boundary initialized [Page 1]

  try {
    // 1. Fetch document and block duplicate executions against completed/terminal vouchers [Page 1]
    const purchaseReturn = await PurchaseReturn.findOne({
      publicId: returnPublicId,
      isDeleted: false,
    }).session(session);

    if (!purchaseReturn) {
      throw new ApiError(httpStatus.NOT_FOUND, "Purchase return record not found.");
    }

    if (purchaseReturn.status === "COMPLETED" || purchaseReturn.status === "CANCELLED" || purchaseReturn.status === "REJECTED") {
      throw new ApiError(
        httpStatus.BAD_REQUEST,
        `Inventory Boundary Error: Vouchers in terminal state "${purchaseReturn.status}" cannot be processed again.`
      );
    }

    // Strict State Firewall Check: Mandate status APPROVED to initiate processing [Page 1]
    if (purchaseReturn.status !== "APPROVED") {
      throw new ApiError(
        httpStatus.BAD_REQUEST,
        `Inventory Boundary Error: Only returns holding status "APPROVED" can be processed. Current: "${purchaseReturn.status}".`
      );
    }

    // 2. Revalidate the master database links to guarantee traceability integrity [Page 1]
    const goodsReceipt = await getValidGoodsReceipt(
      purchaseReturn.goodsReceiptId,
      purchaseReturn.purchaseId,
      purchaseReturn.supplierId,
      purchaseReturn.warehouseId,
      session
    );

    // Revalidate item line ceilings against live available procurement limits
    for (const item of purchaseReturn.items) {
      const goodsReceiptItem = findGoodsReceiptItem(goodsReceipt, item.goodsReceiptItemId);
      const remainingEligible = await calculateRemainingEligibleQuantity({
        purchaseId: purchaseReturn.purchaseId,
        goodsReceiptId: purchaseReturn.goodsReceiptId,
        goodsReceiptItem,
      });

      if (item.returnQuantity > remainingEligible) {
        throw new ApiError(
          httpStatus.BAD_REQUEST,
          `Fulfillment Conflict: Item "${item.productNameSnapshot}" return volume exceeds remaining available limit of ${remainingEligible}.`
        );
      }
    }

    // 3. Shift status to processing buffer stage [Page 1]
    purchaseReturn.status = "PROCESSING";
    purchaseReturn.processedBy = reqUser.id;
    purchaseReturn.processedAt = new Date();
    purchaseReturn.updatedBy = reqUser.id;
    await purchaseReturn.save({ session });

    // 4. Build return inventory instructions from validated snapshot parameters [Page 1]
    const outboundInstructions = prepareOutboundStockInstructions(purchaseReturn, reqUser.id);

    // 5. Execute Return Inventory OUT through the core project InventoryService [Page 1]
    // Processes loops over array vectors, passing the active session down for rollback guards
    for (const instruction of outboundInstructions) {
      await InventoryService.decreaseStock({
        productId: instruction.productId,
        warehouseId: instruction.warehouseId,
        quantity: instruction.quantity,
        referenceType: instruction.referenceType,
        referenceId: instruction.referenceId,
        unitCost: instruction.unitCost, // Accurate purchase price baseline cost passed
        postedBy: instruction.postedBy,
        remarks: instruction.remarks,
        session, // Strict transactional binding prevents un-audited direct document updates
      });
    }

    // 6. Transition state directly to COMPLETED only after inventory operation succeeds [Page 1]
    purchaseReturn.status = "COMPLETED";
    await purchaseReturn.save({ session });

    // 7. Append audit accountability trail record cleanly inside transaction session [Page 1]
    await ActivityLogService.logActivity({
      user: reqUser.id,
      action: "UPDATE",
      module: "PURCHASES",
      entityId: purchaseReturn._id,
      description: `Purchase return ${purchaseReturn.returnNumber} successfully processed. Physical inventory OUT transactions executed.`,
      metadata: {
        returnNumber: purchaseReturn.returnNumber,
        status: "COMPLETED",
        itemsProcessedCount: outboundInstructions.length,
      },
      session,
    });

    await session.commitTransaction(); // Everything commits atomically [Page 1]
    return purchaseReturn;
  } catch (error) {
    await session.abortTransaction(); // Error triggers full rollback loop, erasing partial inventory mutations [Page 1]
    throw error;
  } finally {
    session.endSession();
  }
};


export const PurchaseReturnService = {
  createPurchaseReturn,
  transitionPurchaseReturnStatus,
  submitPurchaseReturnForApproval,
  approvePurchaseReturn,
  rejectPurchaseReturn,
  cancelPurchaseReturn,
  processPurchaseReturn,
};

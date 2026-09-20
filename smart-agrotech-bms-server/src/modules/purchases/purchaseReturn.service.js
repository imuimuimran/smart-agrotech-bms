import mongoose from "mongoose";
import ApiError from "../../shared/ApiError.js";
import HTTP_STATUS from "../../constants/httpStatus.js";
import Purchase from "./purchase.model.js"; 
import GoodsReceipt from "./goodsReceipt.model.js";
import Product from "../products/product.model.js";
import { PurchaseReturn } from "./purchaseReturn.model.js";
import { getNextSequence } from "../../utils/sequence.util.js";
import generatePublicId from "../../utils/generatePublicId.js"; 
import { logActivity } from "../activityLogs/activityLog.service.js";  

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
    throw new ApiError(httpStatus.NOT_FOUND, "Original purchase order record not found.");
  }
  if (String(purchase.supplierId) !== String(supplierId)) {
    throw new ApiError(httpStatus.BAD_REQUEST, "The selected purchase order does not belong to the specified supplier.");
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
    throw new ApiError(httpStatus.NOT_FOUND, "Goods receipt note not found.");
  }
  if (String(goodsReceipt.purchaseId) !== String(purchaseId)) {
    throw new ApiError(httpStatus.BAD_REQUEST, "The goods receipt note does not belong to the specified purchase order.");
  }
  if (String(goodsReceipt.supplierId) !== String(supplierId)) {
    throw new ApiError(httpStatus.BAD_REQUEST, "The goods receipt note does not belong to the specified supplier.");
  }
  if (String(goodsReceipt.warehouseId) !== String(warehouseId)) {
    throw new ApiError(httpStatus.BAD_REQUEST, "The goods receipt note does not match the designated inventory warehouse.");
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
      httpStatus.BAD_REQUEST,
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
        httpStatus.NOT_FOUND,
        `Master product record not found for ID ${requestedItem.productId}.`
      );
    }

    const goodsReceiptItem = findGoodsReceiptItem(goodsReceipt, requestedItem.goodsReceiptItemId);

    if (String(goodsReceiptItem.productId) !== String(requestedItem.productId)) {
      throw new ApiError(
        httpStatus.BAD_REQUEST,
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
        httpStatus.BAD_REQUEST,
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
        httpStatus.BAD_REQUEST,
        "Replacement items are not allowed for a standard RETURN."
      );
    }
    return [];
  }

  if (returnType === "EXCHANGE") {
    if (!replacementItemsInput || replacementItemsInput.length === 0) {
      throw new ApiError(
        httpStatus.BAD_REQUEST,
        "Replacement items are required for an EXCHANGE workflow."
      );
    }
  }

  const replacementSnapshots = [];

  for (const item of replacementItemsInput) {
    const product = await Product.findOne({ _id: item.productId, isDeleted: false });
    if (!product) {
      throw new ApiError(
        httpStatus.NOT_FOUND,
        `Replacement master product record not found for ID ${item.productId}.`
      );
    }

    if (product.status !== "ACTIVE") {
      throw new ApiError(
        httpStatus.BAD_REQUEST,
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
    throw new ApiError(httpStatus.UNAUTHORIZED, "Authenticated user identity context is required.");
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
    await logActivity({
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

export const PurchaseReturnService = {
  createPurchaseReturn,
};


import mongoose from "mongoose";
import HTTP_STATUS from "../../constants/httpStatus.js";
import ApiError from "../../shared/ApiError.js";
import { Sale } from "./sale.model.js";
import { SaleReturn } from "./saleReturn.model.js";
import { 
  SALE_RETURN_TYPE,
  SALE_RETURN_STATUS,
  isSaleReturnTransitionAllowed 
} from "./saleReturn.constants.js";
import Customer from "../customers/customer.model.js";
import Product from "../products/product.model.js";
import { Warehouse } from "../warehouses/warehouse.model.js";
import generatePublicId from "../../utils/generatePublicId.js";
import Counter from "../../shared/schemas/counter.model.js";
import { ActivityLogService } from "../activity-logs/activityLog.service.js";

/**
 * ============================================================
 * BASIC HELPERS (Phase 13.4)
 * ============================================================
 */

/**
 * Safely compares MongoDB ObjectId values [INDEX].
 */
const sameObjectId = (left, right) => {
  if (!left || !right) return false;
  return left.toString() === right.toString();
};

/**
 * Round monetary values to two decimal places [INDEX].
 */
const roundMoney = (value) => {
  return Math.round((Number(value) + Number.EPSILON) * 100) / 100;
};

/**
 * Validate authenticated actor context [INDEX].
 * The global auth middleware exposes req.user.id. Do not depend on req.user._id.
 */
const validateActor = (reqUser) => {
  if (!reqUser?.id) {
    throw new ApiError(HTTP_STATUS.UNAUTHORIZED, "Authenticated user identity is required.");
  }
  return reqUser;
};

/* ============================================================
 * 1. ORIGINAL SALE VALIDATION (Phase 13.4)
 * ============================================================
 * Resolve the original Sale that the return belongs to [INDEX].
 * Historical Sale data is treated as authoritative. The original Sale itself is never modified here.
 */
const getValidSale = async (saleId, customerId, warehouseId, session = null) => {
  const query = Sale.findOne({ _id: saleId, isDeleted: false });
  if (session) query.session(session);
  const sale = await query;
  if (!sale) {
    throw new ApiError(HTTP_STATUS.NOT_FOUND, "Original sale not found.");
  }
  if (!sameObjectId(sale.customerId, customerId)) {
    throw new ApiError(HTTP_STATUS.BAD_REQUEST, "Customer does not match the original sale.");
  }
  if (!sameObjectId(sale.warehouseId, warehouseId)) {
    throw new ApiError(HTTP_STATUS.BAD_REQUEST, "Warehouse does not match the original sale.");
  }
  if (sale.status !== "CONFIRMED" && sale.status !== "COMPLETED") {
    throw new ApiError(
      HTTP_STATUS.BAD_REQUEST,
      `Sales return cannot be created from a sale with status "${sale.status}".`
    );
  }
  return sale;
};

/* ============================================================
 * 2. CUSTOMER VALIDATION (Phase 13.4)
 * ============================================================
 */
const getValidCustomer = async (customerId, session = null) => {
  const query = Customer.findOne({ _id: customerId, isDeleted: false, status: "active" });
  if (session) query.session(session);
  const customer = await query;
  if (!customer) {
    throw new ApiError(HTTP_STATUS.NOT_FOUND, "Active customer not found.");
  }
  return customer;
};

/* ============================================================
 * 3. WAREHOUSE VALIDATION (Phase 13.4)
 * ============================================================
 */
const getValidWarehouse = async (warehouseId, session = null) => {
  const query = Warehouse.findOne({ _id: warehouseId, isDeleted: false, status: "active" });
  if (session) query.session(session);
  const warehouse = await query;
  if (!warehouse) {
    throw new ApiError(HTTP_STATUS.NOT_FOUND, "Active warehouse not found.");
  }
  return warehouse;
};

/* ============================================================
 * 4. ORIGINAL SALE ITEM RESOLUTION (Phase 13.4)
 * ============================================================
 * Find the exact embedded Sale item referenced by originalSaleItemId [INDEX].
 */
const findOriginalSaleItem = (sale, originalSaleItemId) => {
  const saleItem = sale.products.find((item) => sameObjectId(item._id, originalSaleItemId));
  if (!saleItem) {
    throw new ApiError(HTTP_STATUS.NOT_FOUND, "Original sale item was not found in the referenced sale.");
  }
  return saleItem;
};

/* ============================================================
 * 5. PREVIOUS COMPLETED RETURNS (Phase 13.4)
 * ============================================================
 * Calculate how much of one original Sale item has already been returned [INDEX].
 * Only COMPLETED returns consume return eligibility.
 */
const getPreviouslyReturnedQuantity = async ({ saleId, originalSaleItemId, session = null }) => {
  const query = SaleReturn.find({
    saleId,
    status: "COMPLETED",
    isDeleted: false,
    "items.originalSaleItemId": originalSaleItemId,
  });
  if (session) query.session(session);
  const completedReturns = await query;
  return completedReturns.reduce((total, saleReturn) => {
    return (
      total +
      saleReturn.items.reduce((itemTotal, item) => {
        if (sameObjectId(item.originalSaleItemId, originalSaleItemId)) {
          return itemTotal + Number(item.returnQuantity || 0);
        }
        return itemTotal;
      }, 0)
    );
  }, 0);
};

/* ============================================================
 * 6. REMAINING ELIGIBLE RETURN QUANTITY (Phase 13.4)
 * ============================================================
 */
const calculateRemainingEligibleQuantity = async ({ saleId, originalSaleItemId, saleItem, session = null }) => {
  const soldQuantity = Number(saleItem.quantity || 0);
  if (!Number.isInteger(soldQuantity) || soldQuantity <= 0) {
    throw new ApiError(HTTP_STATUS.BAD_REQUEST, "Original sale item contains an invalid sold quantity.");
  }
  const previouslyReturnedQuantity = await getPreviouslyReturnedQuantity({
    saleId,
    originalSaleItemId,
    session,
  });

  const remainingEligibleQuantity = soldQuantity - previouslyReturnedQuantity;
  if (remainingEligibleQuantity < 0) {
    throw new ApiError(HTTP_STATUS.CONFLICT, "Return eligibility is inconsistent with completed return history.");
  }
  return { soldQuantity, previouslyReturnedQuantity, remainingEligibleQuantity };
};

/* ============================================================
 * 7. RETURN QUANTITY VALIDATION (Phase 13.4)
 * ============================================================
 */
const validateReturnQuantity = ({ requestedQuantity, soldQuantity, previouslyReturnedQuantity, remainingEligibleQuantity }) => {
  if (!Number.isInteger(requestedQuantity) || requestedQuantity <= 0) {
    throw new ApiError(HTTP_STATUS.BAD_REQUEST, "Return quantity must be a positive integer.");
  }
  if (requestedQuantity > soldQuantity) {
    throw new ApiError(HTTP_STATUS.BAD_REQUEST, "Return quantity cannot exceed the original sold quantity.");
  }
  if (requestedQuantity > remainingEligibleQuantity) {
    throw new ApiError(
      HTTP_STATUS.CONFLICT,
      `Return quantity exceeds the remaining eligible quantity. Sold: ${soldQuantity}, already returned: ${previouslyReturnedQuantity}, remaining: ${remainingEligibleQuantity}.`
    );
  }
};

/* ============================================================
 * 8. AUTHORITATIVE RETURN ITEM SNAPSHOT (Phase 13.4)
 * ============================================================
 * Build the return item from the immutable historical Sale snapshot [INDEX].
 * Client-provided details are NOT trusted.
 */
const buildAuthoritativeReturnItem = async ({ sale, requestedItem, session = null }) => {
  const originalSaleItem = findOriginalSaleItem(sale, requestedItem.originalSaleItemId);
  const eligibility = await calculateRemainingEligibleQuantity({
    saleId: sale._id,
    originalSaleItemId: originalSaleItem._id,
    saleItem: originalSaleItem,
    session,
  });
  
  validateReturnQuantity({
    requestedQuantity: requestedItem.returnQuantity,
    soldQuantity: eligibility.soldQuantity,
    previouslyReturnedQuantity: eligibility.previouslyReturnedQuantity,
    remainingEligibleQuantity: eligibility.remainingEligibleQuantity,
  });

  const returnQuantity = Number(requestedItem.returnQuantity);
  const unitPrice = roundMoney(Number(originalSaleItem.unitPrice || 0));
  const unitCost = roundMoney(Number(originalSaleItem.unitCost || 0));
  const lineTotal = roundMoney(returnQuantity * unitPrice);

  return {
    productId: originalSaleItem.productId,
    productNameSnapshot: originalSaleItem.productName,
    skuSnapshot: originalSaleItem.sku,
    originalSaleItemId: originalSaleItem._id,
    soldQuantity: eligibility.soldQuantity,
    returnQuantity,
    unitPrice,
    unitCost,
    lineTotal,
    reason: requestedItem.reason,
    batchNumber: requestedItem.batchNumber || undefined,
    serialNumbers: requestedItem.serialNumbers || [],
  };
};

/* ============================================================
 * 9. REPLACEMENT PRODUCT VALIDATION (Phase 13.4)
 * ============================================================
 * Replacement items are different from returned items [INDEX].
 * The replacement item is a new physical product leaving inventory, resolved separately.
 */
const getValidReplacementProducts = async (replacementItems, session = null) => {
  if (!replacementItems || replacementItems.length === 0) return new Map();
  const productIds = replacementItems.map((item) => item.productId);
  const uniqueProductIds = [...new Set(productIds.map((id) => id.toString()))];
  const query = Product.find({ _id: { $in: uniqueProductIds }, isDeleted: false });
  if (session) query.session(session);
  const products = await query;
  if (products.length !== uniqueProductIds.length) {
    throw new ApiError(HTTP_STATUS.NOT_FOUND, "One or more replacement products were not found.");
  }
  return new Map(products.map((product) => [product._id.toString(), product]));
};

/* ============================================================
    10. AUTHORITATIVE REPLACEMENT SNAPSHOTS (Phase 13.4)
============================================================
*/
const buildAuthoritativeReplacementItems = async ({ replacementItems, session = null }) => {
  if (!replacementItems || replacementItems.length === 0) return [];
  const productMap = await getValidReplacementProducts(replacementItems, session);
  return replacementItems.map((requestedItem) => {
    const product = productMap.get(requestedItem.productId.toString());
    if (!product) throw new ApiError(HTTP_STATUS.NOT_FOUND, "Replacement product not found.");
    if (product.status === "inactive" || product.status === "discontinued") {
      throw new ApiError(HTTP_STATUS.BAD_REQUEST, `Replacement product "${product.productName}" is not active.`);
    }
    if (product.inventoryConfig?.trackInventory === false) {
      throw new ApiError(HTTP_STATUS.BAD_REQUEST, `Inventory tracking is disabled for replacement product "${product.productName}".`);
    }
    const quantity = Number(requestedItem.quantity);
    if (!Number.isInteger(quantity) || quantity <= 0) {
      throw new ApiError(HTTP_STATUS.BAD_REQUEST, "Replacement quantity must be a positive integer.");
    }

    const unitPrice = roundMoney(Number(product.pricing?.sellingPrice || 0));
    const unitCost = roundMoney(Number(product.pricing?.purchasePrice || 0));

    if (!Number.isFinite(unitPrice) || unitPrice < 0) {
      throw new ApiError(HTTP_STATUS.BAD_REQUEST, `Invalid selling price configured for replacement product "${product.productName}".`);
    }
    if (!Number.isFinite(unitCost) || unitCost < 0) {
      throw new ApiError(HTTP_STATUS.BAD_REQUEST, `Invalid purchase cost configured for replacement product "${product.productName}".`);
    }

    return {
      productId: product._id,
      productNameSnapshot: product.productName,
      skuSnapshot: product.sku,quantity,
      unitPrice,
      unitCost,
      lineTotal: roundMoney(quantity * unitPrice),
      batchNumber: requestedItem.batchNumber || undefined,
      serialNumbers: requestedItem.serialNumbers || [],
    };
  });
};


/* ============================================================

    11. RETURN / EXCHANGE TYPE VALIDATION (Phase 13.4)

  ============================================================
*/

const validateReturnTypeRules = ({ returnType, replacementItems }) => {
    const hasReplacementItems = Array.isArray(replacementItems) && 
    replacementItems.length > 0;
    
    if (returnType === SALE_RETURN_TYPE.RETURN && hasReplacementItems) {
        throw new ApiError(
            HTTP_STATUS.BAD_REQUEST,
            "Replacement items are not allowed for a RETURN."
        );
    }
    
    if (returnType === SALE_RETURN_TYPE.EXCHANGE && !hasReplacementItems) {
        throw new ApiError(
            HTTP_STATUS.BAD_REQUEST,
            "At least one replacement item is required for an EXCHANGE."
        );
    }
};


/* ============================================================
 * 12. AUTHORITATIVE TOTAL CALCULATION (Phase 13.4)
 * ============================================================
 */

const calculateAuthoritativeReturnTotals = (returnItems) => {
    const totalQuantity = returnItems.reduce(
        (sum, item) => sum + Number(item.returnQuantity),
        0
    );
    const totalAmount = returnItems.reduce(
        (sum, item) => sum + Number(item.lineTotal),
        0
    );
    
    return {
        totalQuantity,
        totalAmount: roundMoney(totalAmount),
    };
};


/* ============================================================
 * 13. COMPLETE AUTHORITATIVE VALIDATION PIPELINE (Phase 13.4)
 * ============================================================
 */

const validateAndPrepareSaleReturn = async (payload, reqUser, session = null) => {
    validateActor(reqUser);
    validateReturnTypeRules({
        returnType: payload.returnType,
        replacementItems: payload.replacementItems,
    }
);

const customer = await getValidCustomer(
    payload.customerId, 
    session
);
const warehouse = await getValidWarehouse(
    payload.warehouseId, 
    session
);
const sale = await getValidSale(
    payload.saleId,
    customer._id,
    warehouse._id,
    session
);

const returnItems = [];
for (const requestedItem of payload.items) {
    const authoritativeItem = await buildAuthoritativeReturnItem({
        sale,
        requestedItem,
        session,
    });
    returnItems.push(authoritativeItem);
}

const replacementItems = await buildAuthoritativeReplacementItems({
    replacementItems: payload.replacementItems,
    session,
});

const totals = calculateAuthoritativeReturnTotals(returnItems);

if (Number(payload.totalQuantity) !== totals.totalQuantity) {
    throw new ApiError(
        HTTP_STATUS.BAD_REQUEST,
        "Submitted total quantity does not match the authoritative return quantity."
    );
}

if (Math.abs(Number(payload.totalAmount) - totals.totalAmount) > 0.01) {
    throw new ApiError(
        HTTP_STATUS.BAD_REQUEST,
        "Submitted total amount does not match the authoritative return amount."
    );
}

return {
    customer,
    warehouse,
    sale,
    returnType: payload.returnType,
    items: returnItems,
    replacementItems,
    reason: payload.reason,
    remarks: payload.remarks || "",
    totalQuantity: totals.totalQuantity,
    totalAmount: totals.totalAmount,
};
};

/* ============================================================
  RETURN NUMBER GENERATION (Creation Boundary)
============================================================
Updates business numbers sequentially on document creation inside the transaction.
*/
const generateSaleReturnNumber = async (session) => {
  const counter = await Counter.findOneAndUpdate(
    { key: "sale_return" },
    { $inc: { sequence: 1 } },
    { new: true, upsert: true, setDefaultsOnInsert: true, session }
  );
  
  return `SRRET-${String(counter.sequence).padStart(6, "0")}`; // Business-facing sequence number
};


/* ============================================================
  CREATE SALES RETURN (Creation Boundary)
============================================================
Master registration pipeline wrapping orchestration validations and persistingthe 
draft voucher request inside a transactional session.
*/
const createSaleReturn = async (payload, reqUser) => {
  if (!reqUser?.id) {
    throw new ApiError(HTTP_STATUS.UNAUTHORIZED, "Authenticated user identity is required.");
  }
  
  const session = await mongoose.startSession();
  session.startTransaction(); // Master transactional boundary initialized
  try {
    // 1. Authoritative Phase 13.4 Preparation Pipeline Execution
    const prepared = await validateAndPrepareSaleReturn(payload, reqUser, session);
    
    // 2. Generate sequential business and public identifiers
    const returnNumber = await generateSaleReturnNumber(session);
    const publicId = generatePublicId("SRET"); // API-facing public tracker string
    
    // 3. Construct and instantiate the SaleReturn draft document
    const saleReturn = new SaleReturn({
      publicId,
      returnNumber,
      customerId: prepared.customer._id,
      saleId: prepared.sale._id,
      warehouseId: prepared.warehouse._id,
      returnType: prepared.returnType,
      items: prepared.items,
      replacementItems: prepared.replacementItems,
      reason: prepared.reason,
      remarks: prepared.remarks,
      totalQuantity: prepared.totalQuantity,
      totalAmount: prepared.totalAmount,
      status: SALE_RETURN_STATUS.DRAFT, // Always forced to DRAFT at entry boundary
      createdBy: reqUser.id,
      updatedBy: reqUser.id,
      isDeleted: false,
      deletedAt: null,
      deletedBy: null,
    });
    
    await saleReturn.save({ session }); // Saved first inside the session map
    // 4. Record transactional activity audit trace footprint
    await ActivityLogService.logActivity({
      user: reqUser.id,
      action: "CREATE",
      module: "SALES_RETURN",
      entityId: saleReturn._id,
      description: `Sales ${prepared.returnType.toLowerCase()} ${returnNumber} created successfully.`,
      metadata: {
        returnPublicId: saleReturn.publicId,
        returnNumber: saleReturn.returnNumber,
        returnType: saleReturn.returnType,
        saleId: prepared.sale._id,
        salePublicId: prepared.sale.publicId,
        customerId: prepared.customer._id,
        warehouseId: prepared.warehouse._id,
        totalQuantity: prepared.totalQuantity,
        totalAmount: prepared.totalAmount,
        status: SALE_RETURN_STATUS.DRAFT,
      },
      session, // Shared session ensures full rollbacks if logging fails
    });
    
    await session.commitTransaction(); // Atomic commit applied safely
    return saleReturn;
  } catch (error) {
    await session.abortTransaction(); // Full database rollback if initialization breaks
    throw error;
  } finally {
    session.endSession();
  }
};


/* ============================================================
 * SALES RETURN WORKFLOW ENGINE
 * ============================================================
 */

/**
 * Validates the authenticated actor context.
 */
const validateWorkflowActor = (reqUser) => {
  if (!reqUser?.id) {
    throw new ApiError(
      HTTP_STATUS.UNAUTHORIZED,
      "Authenticated user identity is required."
    );
  }
  return reqUser.id;
};

/**
 * Performs one controlled Sales Return status transition.
 * This is the single state-transition authority across the domain.
 */
const transitionSaleReturnStatus = async (
  returnPublicId,
  nextStatus,
  reqUser,
  transitionMetadata = {}
) => {
  const actorId = validateWorkflowActor(reqUser);
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const saleReturn = await SaleReturn.findOne({
      publicId: returnPublicId,
      isDeleted: false,
    }).session(session);

    if (!saleReturn) {
      throw new ApiError(
        HTTP_STATUS.NOT_FOUND,
        "Sales return record not found."
      );
    }

    const currentStatus = saleReturn.status;

    /**
     * Central lifecycle matrix guard.
     */
    if (!isSaleReturnTransitionAllowed(currentStatus, nextStatus)) {
      throw new ApiError(
        HTTP_STATUS.BAD_REQUEST,
        `Sales return cannot transition from ${currentStatus} to ${nextStatus}.`
      );
    }

    const previousStatus = saleReturn.status;
    saleReturn.status = nextStatus;
    saleReturn.updatedBy = actorId;

    /**
     * Set explicit approval audit metadata.
     */
    if (nextStatus === SALE_RETURN_STATUS.APPROVED) {
      saleReturn.approvedBy = actorId;
      saleReturn.approvedAt = new Date();
    }

    /**
     * Set explicit processing audit metadata.
     * Note: PROCESSING -> COMPLETED is handled during inventory loops.
     */
    if (nextStatus === SALE_RETURN_STATUS.PROCESSING) {
      saleReturn.processedBy = actorId;
    }

    await saleReturn.save({ session });

    // Track workflow transition footprint atomically [63]
    await ActivityLogService.logActivity({
      user: actorId,
      action: "STATUS_CHANGED",
      module: "RETURNS_EXCHANGES",
      entityId: saleReturn._id,
      description: `Sales return ${saleReturn.returnNumber} transitioned from ${previousStatus} to ${nextStatus}.`,
      metadata: {
        returnPublicId: saleReturn.publicId,
        returnNumber: saleReturn.returnNumber,
        returnType: saleReturn.returnType,
        previousStatus,
        newStatus: nextStatus,
        saleId: saleReturn.saleId,
        customerId: saleReturn.customerId,
        warehouseId: saleReturn.warehouseId,
        ...transitionMetadata,
      },
      session,
    });

    await session.commitTransaction();
    return saleReturn;
  } catch (error) {
    await session.abortTransaction();
    throw error;
  } finally {
    session.endSession();
  }
};

/**
 * Workflow Submission Action: DRAFT -> PENDING_APPROVAL [64]
 */
const submitSaleReturn = async (returnPublicId, reqUser) => {
  return transitionSaleReturnStatus(
    returnPublicId,
    SALE_RETURN_STATUS.PENDING_APPROVAL,
    reqUser
  );
};

/**
 * Workflow Approval Action: PENDING_APPROVAL -> APPROVED [64]
 */
const approveSaleReturn = async (returnPublicId, reqUser) => {
  return transitionSaleReturnStatus(
    returnPublicId,
    SALE_RETURN_STATUS.APPROVED,
    reqUser
  );
};

/**
 * Workflow Rejection Action: PENDING_APPROVAL -> REJECTED [64]
 */
const rejectSaleReturn = async (returnPublicId, reqUser, remarks) => {
  return transitionSaleReturnStatus(
    returnPublicId,
    SALE_RETURN_STATUS.REJECTED,
    reqUser,
    { rejectionReason: remarks }
  );
};

/**
 * Workflow Cancellation Action: DRAFT/PENDING_APPROVAL -> CANCELLED [65]
 */
const cancelSaleReturn = async (returnPublicId, reqUser, remarks) => {
  return transitionSaleReturnStatus(
    returnPublicId,
    SALE_RETURN_STATUS.CANCELLED,
    reqUser,
    { cancellationReason: remarks }
  );
};



/* ============================================================
 * PUBLIC SERVICE API
 * ============================================================
 */

export const SaleReturnService = {
    getValidSale,
    getValidCustomer,
    getValidWarehouse,

    findOriginalSaleItem,

    getPreviouslyReturnedQuantity,
    calculateRemainingEligibleQuantity,
    validateReturnQuantity,

    buildAuthoritativeReturnItem,
    buildAuthoritativeReplacementItems,

    calculateAuthoritativeReturnTotals,
    
    validateAndPrepareSaleReturn,

    // Creation Boundary Entry Hook
    createSaleReturn,

    // New Workflow API State Machine hooks
  transitionSaleReturnStatus,
  submitSaleReturn,
  approveSaleReturn,
  rejectSaleReturn,
  cancelSaleReturn,
};






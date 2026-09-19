import ApiError from "../../shared/ApiError.js";
import HTTP_STATUS from "../../constants/httpStatus.js";
import Purchase from "./purchase.model.js"; 
import GoodsReceipt from "./goodsReceipt.model.js";
import { PurchaseReturn } from "./purchaseReturn.model.js";
import { getNextSequence } from "../../utils/sequence.util.js";

/**
 * Phase 12.4.2 - Consecutive Return Number Generation Engine
 */
const generatePurchaseReturnNumber = async (session) => {
  const sequence = await getNextSequence("purchase_return", session);
  return `PRRET-${String(sequence).padStart(6, "0")}`;
};

/**
 * Phase 12.4.3.2 - Purchase Order Validation Helper
 * Verifies the PO exists and matches the specified supplier parameter.
 */
const getValidPurchase = async (purchaseId, supplierId, session = null) => {
  const query = Purchase.findById(purchaseId);
  if (session) {
    query.session(session);
  }
  
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
 * Phase 12.4.3.3 - Goods Receipt Note (GRN) Validation Helper
 * Enforces strict multi-entity referential matching constraints across the chain.
 */
const getValidGoodsReceipt = async (goodsReceiptId, purchaseId, supplierId, warehouseId, session = null) => {
  const query = GoodsReceipt.findById(goodsReceiptId);
  if (session) {
    query.session(session);
  }

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
 * Phase 12.4.4.2 - Get Eligible Return Quantity Helper
 * Queries past completed purchase returns to sum up items already processed.
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
    status: "COMPLETED", // Only completed entries consume eligibility limits
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
 * Phase 12.4.4.3 - Determine Authoritative Received Quantity Helper
 * Isolates the correct embedded GRN item row to pull trusted stock metrics.
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
 * Phase 12.4.4.4 - Calculate Remaining Eligible Quantity Helper
 * Subtracts past returns from the server-authoritative accepted quantity.
 */
const calculateRemainingEligibleQuantity = async ({
  purchaseId,
  goodsReceiptId,
  goodsReceiptItem,
}) => {
  const previouslyReturnedQuantity = await getEligibleReturnQuantity({
    purchaseId,
    goodsReceiptId,
    purchaseItemId: goodsReceiptItem.purchaseItemId,
    goodsReceiptItemId: goodsReceiptItem._id,
  });

  // Safe read bounds check relies on accepted inventory
  const receivedQuantity = Number(goodsReceiptItem.acceptedQuantity ?? 0);
  const remainingQuantity = receivedQuantity - previouslyReturnedQuantity;
  return Math.max(remainingQuantity, 0);
};

/**
 * Phase 12.4.4.5 - Validate Requested Return Quantity
 * Core gate check throws an execution error if thresholds are breached.
 */
const validateReturnQuantity = async ({
  purchaseId,
  goodsReceiptId,
  goodsReceiptItem,
  requestedQuantity,
}) => {
  const eligibleQuantity = await calculateRemainingEligibleQuantity({
    purchaseId,
    goodsReceiptId,
    goodsReceiptItem,
  });

  if (requestedQuantity > eligibleQuantity) {
    throw new ApiError(
      HTTP_STATUS.BAD_REQUEST,
      `Return quantity cannot exceed the eligible quantity of ${eligibleQuantity}`
    );
  }

  return {
    eligibleQuantity,
    requestedQuantity,
  };
};

// Exporting service orchestration methods block
export const PurchaseReturnService = {
  // Master routines will be populated as we progress
};

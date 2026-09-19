import ApiError from "../../shared/ApiError.js";
import HTTP_STATUS from "../../constants/httpStatus.js";
import Purchase from "./purchase.model.js"; 
import GoodsReceipt from "./goodsReceipt.model.js";
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
    throw new ApiError(
      HTTP_STATUS.NOT_FOUND,
      "Original purchase order record not found."
    );
  }

  // Cross-reference vendor nodes to prevent cross-supplier data injection
  if (String(purchase.supplierId) !== String(supplierId)) {
    throw new ApiError(
      HTTP_STATUS.BAD_REQUEST,
      "The selected purchase order does not belong to the specified supplier."
    );
  }

  return purchase;
};

/**
 * Phase 12.4.3.3 - Goods Receipt Note (GRN) Validation Helper
 * Enforces strict multi-entity referential matching constraints across the chain.
 */
const getValidGoodsReceipt = async (
  goodsReceiptId,
  purchaseId,
  supplierId,
  warehouseId,
  session = null
) => {
  const query = GoodsReceipt.findById(goodsReceiptId);
  if (session) {
    query.session(session);
  }

  const goodsReceipt = await query;
  if (!goodsReceipt) {
    throw new ApiError(
      HTTP_STATUS.NOT_FOUND,
      "Goods receipt note not found."
    );
  }

  // Verify the structural transaction tree integrity
  if (String(goodsReceipt.purchaseId) !== String(purchaseId)) {
    throw new ApiError(
      HTTP_STATUS.BAD_REQUEST,
      "The goods receipt note does not belong to the specified purchase order."
    );
  }

  if (String(goodsReceipt.supplierId) !== String(supplierId)) {
    throw new ApiError(
      HTTP_STATUS.BAD_REQUEST,
      "The goods receipt note does not belong to the specified supplier."
    );
  }

  if (String(goodsReceipt.warehouseId) !== String(warehouseId)) {
    throw new ApiError(
      HTTP_STATUS.BAD_REQUEST,
      "The goods receipt note does not match the designated inventory warehouse."
    );
  }

  return goodsReceipt;
};

// Exporting service orchestration methods block
export const PurchaseReturnService = {
  // Master routines will be populated as we progress
};

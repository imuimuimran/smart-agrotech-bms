/**
 * Phase 12.3.1 - Return/Exchange Constant Vocabularies
 */
export const PURCHASE_RETURN_TYPE = Object.freeze({
  RETURN: "RETURN",
  EXCHANGE: "EXCHANGE",
});

export const PURCHASE_RETURN_STATUS = Object.freeze({
  DRAFT: "DRAFT",
  PENDING_APPROVAL: "PENDING_APPROVAL",
  APPROVED: "APPROVED",
  REJECTED: "REJECTED",
  PROCESSING: "PROCESSING",
  COMPLETED: "COMPLETED",
  CANCELLED: "CANCELLED",
});

/**
 * Phase 12.3.2 - QueryBuilder Pagination Optimization Fields
 */
export const PURCHASE_RETURN_SEARCHABLE_FIELDS = ["returnNumber", "reason", "remarks"];

export const PURCHASE_RETURN_FILTERABLE_FIELDS = [
  "supplierId",
  "purchaseId",
  "goodsReceiptId",
  "warehouseId",
  "status",
  "returnType",
];

export const PURCHASE_RETURN_SORTABLE_FIELDS = [
  "returnNumber",
  "totalQuantity",
  "totalAmount",
  "createdAt",
];

export const PURCHASE_RETURN_DEFAULT_SORT = "-createdAt";

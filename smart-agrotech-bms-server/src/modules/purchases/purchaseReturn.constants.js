/**
 * Phase 12.3.1 - Return/Exchange Constant Vocabularies
 */
export const PURCHASE_RETURN_TYPE = Object.freeze({
  RETURN: "RETURN",
  EXCHANGE: "EXCHANGE",
});

export const PURCHASE_RETURN_TYPE_LIST = Object.values(
  PURCHASE_RETURN_TYPE
);

export const PURCHASE_RETURN_STATUS = Object.freeze({
  DRAFT: "DRAFT",
  PENDING_APPROVAL: "PENDING_APPROVAL",
  APPROVED: "APPROVED",
  REJECTED: "REJECTED",
  PROCESSING: "PROCESSING",
  COMPLETED: "COMPLETED",
  CANCELLED: "CANCELLED",
});

export const PURCHASE_RETURN_STATUS_LIST = Object.values(
  PURCHASE_RETURN_STATUS
);

/**
 * Phase 12.3.2 - QueryBuilder Pagination Optimization Fields
 */
export const PURCHASE_RETURN_SEARCHABLE_FIELDS = [
  "returnNumber",
];

export const PURCHASE_RETURN_FILTERABLE_FIELDS = [
  "supplierId",
  "purchaseId",
  "goodsReceiptId",
  "warehouseId",
  "returnType",
  "status",
];

export const PURCHASE_RETURN_SORTABLE_FIELDS = [
  "returnNumber",
  "totalQuantity",
  "totalAmount",
  "createdAt",
  "updatedAt",
];

export const PURCHASE_RETURN_DEFAULT_SORT = "-createdAt";

export const PURCHASE_RETURN_MESSAGES = Object.freeze({
  CREATE_SUCCESS: "Purchase return request created successfully as a DRAFT.",
  FETCH_SUCCESS: "Purchase return records retrieved successfully.",
  NOT_FOUND: "Purchase return record not found.",
  INVALID_STATE: "The return record cannot be processed in its current status lifecycle.",
  OVER_RETURN_VAL: "Validation failure: Return quantities cannot exceed originally received volumes.",
});

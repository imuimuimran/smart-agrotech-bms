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

export const PURCHASE_RETURN_SEARCHABLE_FIELDS = ["returnNumber", "reason", "remarks"];

export const PURCHASE_RETURN_FILTERABLE_FIELDS = ["supplierId", "purchaseId", "goodsReceiptId", "status", "returnType"];

export const PURCHASE_RETURN_SORTABLE_FIELDS = ["createdAt", "totalAmount", "totalQuantity", "returnNumber"];

export const PURCHASE_RETURN_DEFAULT_SORT = "-createdAt";

export const PURCHASE_RETURN_MESSAGES = Object.freeze({
  CREATE_SUCCESS: "Purchase return request created successfully.",
  FETCH_SUCCESS: "Purchase return records retrieved successfully.",
  NOT_FOUND: "Purchase return record not found.",
  INVALID_STATE: "The return record cannot be processed in its current status lifecycle.",
  OVER_RETURN_VAL: "Validation failure: Return quantities cannot exceed originally received volumes.",
});

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

/**
 * Phase 12.5.1 — Purchase Return Workflow Allowed Transition Matrix
 * Explicitly defines the permitted next states for any given current state.
 */
export const PURCHASE_RETURN_TRANSITION_MATRIX = Object.freeze({
  [PURCHASE_RETURN_STATUS.DRAFT]: [
    PURCHASE_RETURN_STATUS.PENDING_APPROVAL,
    PURCHASE_RETURN_STATUS.CANCELLED,
  ],
  [PURCHASE_RETURN_STATUS.PENDING_APPROVAL]: [
    PURCHASE_RETURN_STATUS.APPROVED,
    PURCHASE_RETURN_STATUS.REJECTED,
    PURCHASE_RETURN_STATUS.CANCELLED,
  ],
  [PURCHASE_RETURN_STATUS.APPROVED]: [
    PURCHASE_RETURN_STATUS.PROCESSING,
  ],
  [PURCHASE_RETURN_STATUS.PROCESSING]: [
    PURCHASE_RETURN_STATUS.COMPLETED,
  ],
  // Terminal states (REJECTED, CANCELLED, COMPLETED) allow zero outbound transitions
  [PURCHASE_RETURN_STATUS.REJECTED]: [],
  [PURCHASE_RETURN_STATUS.CANCELLED]: [],
  [PURCHASE_RETURN_STATUS.COMPLETED]: [],
});

/**
 * Phase 12.5.1 — Workflow Transition Guard Helper
 * Evaluates whether a requested status update conforms to the allowed state machine matrix.
 * 
 * @param {string} currentStatus - The present lifecycle status of the document
 * @param {string} nextStatus - The targeted status transition destination
 * @returns {boolean} True if the workflow step is legally permitted; otherwise false
 */
export const isPurchaseReturnTransitionAllowed = (currentStatus, nextStatus) => {
  const allowedNextStatuses = PURCHASE_RETURN_MATRIX_ALLOWED_HOOK(currentStatus);
  return allowedNextStatuses.includes(nextStatus);
};

/**
 * Internal private block safely handling unmapped dictionary lookups
 */
const PURCHASE_RETURN_MATRIX_ALLOWED_HOOK = (status) => {
  return PURCHASE_RETURN_TRANSITION_MATRIX[status] || [];
};


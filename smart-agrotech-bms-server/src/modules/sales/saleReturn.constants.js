/**
 * ============================================================
 * SALES RETURN / EXCHANGE CONSTANTS
 * ============================================================
 * Source of truth for Sales Return lifecycle and query behavior.
 */

export const SALE_RETURN_TYPE = Object.freeze({
  RETURN: "RETURN",
  EXCHANGE: "EXCHANGE",
});

export const SALE_RETURN_TYPE_LIST = Object.values(SALE_RETURN_TYPE);

/**
 * Sales Return workflow is independent from Sale.status.
 * Inventory is NOT mutated merely because a return reaches
 * APPROVED status. Physical processing happens separately.
 */
export const SALE_RETURN_STATUS = Object.freeze({
  DRAFT: "DRAFT",
  PENDING_APPROVAL: "PENDING_APPROVAL",
  APPROVED: "APPROVED",
  REJECTED: "REJECTED",
  PROCESSING: "PROCESSING",
  COMPLETED: "COMPLETED",
  CANCELLED: "CANCELLED",
});

export const SALE_RETURN_STATUS_LIST = Object.values(
  SALE_RETURN_STATUS
);

/**
 * QueryBuilder configuration.
 */
export const SALE_RETURN_SEARCHABLE_FIELDS = [
  "returnNumber",
];

export const SALE_RETURN_FILTERABLE_FIELDS = [
  "customerId",
  "saleId",
  "warehouseId",
  "returnType",
  "status",
];

export const SALE_RETURN_SORTABLE_FIELDS = [
  "returnNumber",
  "totalQuantity",
  "totalAmount",
  "createdAt",
  "updatedAt",
];

export const SALE_RETURN_DEFAULT_SORT = "-createdAt";


/**
 * ============================================================
 * SALES RETURN WORKFLOW TRANSITIONS
 * ============================================================
 * Sales Return lifecycle is independent from Sale.status.
 * Inventory is NOT changed by workflow transitions.
 * Physical inventory processing happens separately.
 */
export const SALE_RETURN_ALLOWED_TRANSITIONS = Object.freeze({
  [SALE_RETURN_STATUS.DRAFT]: [
    SALE_RETURN_STATUS.PENDING_APPROVAL,
    SALE_RETURN_STATUS.CANCELLED,
  ],
  [SALE_RETURN_STATUS.PENDING_APPROVAL]: [
    SALE_RETURN_STATUS.APPROVED,
    SALE_RETURN_STATUS.REJECTED,
    SALE_RETURN_STATUS.CANCELLED,
  ],
  [SALE_RETURN_STATUS.APPROVED]: [
    SALE_RETURN_STATUS.PROCESSING,
  ],
  [SALE_RETURN_STATUS.PROCESSING]: [
    SALE_RETURN_STATUS.COMPLETED,
  ],
  [SALE_RETURN_STATUS.REJECTED]: [],
  [SALE_RETURN_STATUS.CANCELLED]: [],
  [SALE_RETURN_STATUS.COMPLETED]: [],
});

/**
 * Checks whether a Sales Return status transition is allowed.
 */
export const isSaleReturnTransitionAllowed = (currentStatus, nextStatus) => {
  const allowedNextStatuses = SALE_RETURN_ALLOWED_TRANSITIONS[currentStatus] || [];
  return allowedNextStatuses.includes(nextStatus);
};

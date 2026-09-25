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
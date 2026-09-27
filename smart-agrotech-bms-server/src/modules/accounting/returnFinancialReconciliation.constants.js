/**
 * ============================================================
 * RETURN FINANCIAL RECONCILIATION CONSTANTS (Phase 14.1.1)
 * ============================================================
 * Source vocabularies separating financial movements from physical inventory.
 */

export const RETURN_FINANCIAL_SOURCE = Object.freeze({
  SALES_RETURN: "SALES_RETURN",
  PURCHASE_RETURN: "PURCHASE_RETURN",
});

export const RETURN_FINANCIAL_TYPE = Object.freeze({
  RETURN: "RETURN",
  EXCHANGE: "EXCHANGE",
});

/**
 * Customer and supplier flows use distinct directions to prevent
 * accidental cross-application of balancing operations.
 */
export const RETURN_FINANCIAL_DIRECTION = Object.freeze({
  CUSTOMER_CREDIT: "CUSTOMER_CREDIT",
  CUSTOMER_REFUND: "CUSTOMER_REFUND",
  SUPPLIER_CREDIT: "SUPPLIER_CREDIT",
  SUPPLIER_REFUND: "SUPPLIER_REFUND",
  EXCHANGE_ADJUSTMENT: "EXCHANGE_ADJUSTMENT",
});

export const RETURN_FINANCIAL_STATUS = Object.freeze({
  POSTED: "POSTED",
  REVERSED: "REVERSED",
});

export const RETURN_FINANCIAL_SOURCE_LIST = Object.values(RETURN_FINANCIAL_SOURCE);
export const RETURN_FINANCIAL_TYPE_LIST = Object.values(RETURN_FINANCIAL_TYPE);
export const RETURN_FINANCIAL_DIRECTION_LIST = Object.values(RETURN_FINANCIAL_DIRECTION);
export const RETURN_FINANCIAL_STATUS_LIST = Object.values(RETURN_FINANCIAL_STATUS);

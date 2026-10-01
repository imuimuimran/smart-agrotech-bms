/**
 * ============================================================
 * EXPENSE SUB-SYSTEM MODULE CONSTANTS
 * ============================================================
 * Controlled vocabularies protecting financial analytics.
 */

export const EXPENSE_CATEGORY = Object.freeze({
  OFFICE_RENT: "OFFICE_RENT",
  ELECTRICITY: "ELECTRICITY",
  INTERNET: "INTERNET",
  TRANSPORTATION: "TRANSPORTATION",
  EMPLOYEE_SALARY: "EMPLOYEE_SALARY",
  MARKETING: "MARKETING",
  MAINTENANCE: "MAINTENANCE",
  OFFICE_SUPPLIES: "OFFICE_SUPPLIES",
  MISCELLANEOUS: "MISCELLANEOUS",
});

export const EXPENSE_PAYMENT_METHOD = Object.freeze({
  CASH: "CASH",
  BANK_TRANSFER: "BANK_TRANSFER",
  BKASH: "BKASH",
  NAGAD: "NAGAD",
  ROCKET: "ROCKET",
  CHEQUE: "CHEQUE",
});

export const EXPENSE_STATUS = Object.freeze({
  ACTIVE: "ACTIVE",
  VOIDED: "VOIDED",
});

export const EXPENSE_CATEGORY_LIST = Object.values(EXPENSE_CATEGORY);
export const EXPENSE_PAYMENT_METHOD_LIST = Object.values(EXPENSE_PAYMENT_METHOD);
export const EXPENSE_STATUS_LIST = Object.values(EXPENSE_STATUS);

/**
 * QueryBuilder Integration Optimization Parameters
 */

export const EXPENSE_SEARCHABLE_FIELDS = [
  "expenseNumber",
  "reference",
  "description",
];

export const EXPENSE_FILTERABLE_FIELDS = [
  "category",
  "paymentMethod",
  "status",
  "expenseDate",
];

export const EXPENSE_SORTABLE_FIELDS = [
  "expenseNumber",
  "amount",
  "expenseDate",
  "createdAt",
  "updatedAt",
];

export const EXPENSE_DEFAULT_SORT = "-expenseDate";

export const EXPENSE_HISTORY_FILTERABLE_FIELDS = [
  "category",
  "paymentMethod",
  "status",
  "expenseDate",
  "isDeleted",
];

export const EXPENSE_HISTORY_SORTABLE_FIELDS = [
  "expenseNumber",
  "amount",
  "expenseDate",
  "createdAt",
  "updatedAt",
  "deletedAt",
];

export const EXPENSE_MESSAGES = Object.freeze({
  CREATE_SUCCESS: "Business expense entry recorded successfully.",
  FETCH_SUCCESS: "Business expense records retrieved successfully.",
  FETCH_SINGLE_SUCCESS: "Business expense record retrieved successfully.",
  UPDATE_SUCCESS: "Business expense record updated successfully.",
  DELETE_SUCCESS: "Business expense record soft-deleted successfully.",
  FETCH_HISTORY_SUCCESS: "Business expense audit log history retrieved successfully.", // Added for History API
  INVALID_AMOUNT: "Validation Error: Expense allocations must be strictly greater than zero.",
  NOT_FOUND: "Business expense record not found.",
});




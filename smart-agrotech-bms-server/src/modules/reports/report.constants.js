// src/modules/reports/report.constants.js

export const REPORT_PERIODS = Object.freeze({
  DAILY: "daily",
  MONTHLY: "monthly",
  YEARLY: "yearly",
  CUSTOM: "custom",
});

export const REPORT_MESSAGES = Object.freeze({
  SALES_FETCH_SUCCESS: "Sales report fetched successfully.",
  PURCHASE_FETCH_SUCCESS: "Purchase report fetched successfully.",
  CURRENT_STOCK_FETCH_SUCCESS: "Current stock report fetched successfully.",           
  LOW_STOCK_FETCH_SUCCESS: "Low stock report fetched successfully.",                
  OUT_OF_STOCK_FETCH_SUCCESS: "Out of stock report fetched successfully.",             
  INVENTORY_MOVEMENT_FETCH_SUCCESS: "Inventory movement report fetched successfully.",
  EXPENSE_FETCH_SUCCESS: "Expense report fetched successfully.",
  REVENUE_FETCH_SUCCESS: "Revenue report fetched successfully.",
  PROFIT_LOSS_FETCH_SUCCESS: "Profit and Loss report fetched successfully.",
  CUSTOMER_DUE_FETCH_SUCCESS: "Customer due report fetched successfully.",
  SUPPLIER_DUE_FETCH_SUCCESS: "Supplier due report fetched successfully.", 
  INVALID_PERIOD: "Invalid report period.",
  INVALID_DATE_RANGE: "Invalid report date range.",
});

// Whitelisted lifecycle processing states for operational records (Excludes DRAFT, SUBMITTED, APPROVED, CANCELLED)
export const REPORTABLE_PURCHASE_STATUSES = Object.freeze([
  "CONFIRMED",
  "PARTIALLY_RECEIVED",
  "RECEIVED",
  "PARTIAL_PAID",
  "PAID",
  "RETURNED",
  "COMPLETED",
]);

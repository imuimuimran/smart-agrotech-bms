/**
 * Sales Module Constants
 *
 * Single source of truth for:
 * - Sale lifecycle states
 * - Customer payment methods
 * - Sales searchable/filterable/sortable fields
 */
export const SALE_STATUS = {
  DRAFT: "DRAFT",
  CONFIRMED: "CONFIRMED",
  PARTIAL_PAID: "partial_paid",
  PAID: "paid",
  COMPLETED: "COMPLETED",
  CANCELLED: "CANCELLED",
  RETURNED: "returned",
};

export const SALE_STATUS_LIST = Object.values(SALE_STATUS);

export const PAYMENT_STATUS = {
  UNPAID: "unpaid",
  PARTIAL: "partial",
  PAID: "paid",
};

export const PAYMENT_STATUS_LIST = Object.values(PAYMENT_STATUS);

export const PAYMENT_METHODS = {
  CASH: "CASH",
  BANK_TRANSFER: "BANK_TRANSFER",
  BKASH: "BKASH",
  NAGAD: "NAGAD",
  ROCKET: "ROCKET",
  CHEQUE: "CHEQUE",
};

export const PAYMENT_METHOD_LIST = Object.values(PAYMENT_METHODS);

export const SALE_SEARCHABLE_FIELDS = [
  "invoiceNumber", 
  "publicId", 
  "notes",
];

export const SALE_FILTERABLE_FIELDS = [
  "customerId",
  "warehouseId",
  "status",
  "paymentStatus",
];

export const SALE_SORTABLE_FIELDS = [
  "saleDate",
  "invoiceNumber",
  "totalAmount",
  "paidAmount",
  "dueAmount",
  "createdAt",
];

export const INVENTORY_MOVEMENT_TYPES = {
  SALE: 'SALE',
};

export const SALE_DEFAULT_SORT = "-createdAt";

export const SALE_MESSAGES = {
  CREATE_SUCCESS: "Sale created successfully.",
  FETCH_SUCCESS: "Sales fetched successfully.",
  FETCH_SINGLE_SUCCESS: "Sale fetched successfully.",
  PAYMENT_SUCCESS: "Sale payment recorded successfully.",
  NOT_FOUND: "Sale not found.",
  CUSTOMER_NOT_FOUND: "Customer not found.",
  WAREHOUSE_NOT_FOUND: "Warehouse not found.",
  PRODUCT_NOT_FOUND: "Product not found.",
  INSUFFICIENT_STOCK: "Insufficient stock.",
  CANCELLED_SALE: "Cancelled sales cannot be modified.",
  NO_DUE: "This sale has no outstanding due amount.",
  PAYMENT_EXCEEDS_DUE: "Payment amount cannot exceed the outstanding due amount.",
};


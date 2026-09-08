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
  "grandTotal",
  "paidAmount",
  "dueAmount",
  "createdAt",
];

export const INVENTORY_MOVEMENT_TYPES = {
  SALE: 'SALE',
};

export const SALE_DEFAULT_SORT = "-createdAt";

export const SALE_MESSAGES = {
  CREATED: "Sale registered successfully.",
  NOT_FOUND: "Sale record not found.",
  INSUFFICIENT_STOCK: "Fulfillment blocked: Insufficient available stock in specified warehouse.",
  OVERPAYMENT: "Financial violation: Paid amount cannot exceed grand total.",
  CANCELLED: "Sale transaction successfully voided and inventory returned.",
};


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
  COMPLETED: "COMPLETED",
  CANCELLED: "CANCELLED",
};

export const SALE_STATUS_LIST = Object.values(SALE_STATUS);

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
];

export const SALE_FILTERABLE_FIELDS = [
  "customerId",
  "status",
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


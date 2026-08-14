/**
 * Enterprise Procurement Architecture Constants
 * Source of truth for system lifecycles, states, and document constraints.
 */

// Purchase Lifecycle Statuses (Independent of Payment)
export const PURCHASE_STATUS = {
  DRAFT: 'DRAFT',                       // Being prepared, freely editable
  SUBMITTED: 'SUBMITTED',               // Sent for approval/review
  APPROVED: 'APPROVED',                 // Approved, authorized to receive
  PARTIALLY_RECEIVED: 'PARTIALLY_RECEIVED', // Some items received at warehouse
  RECEIVED: 'RECEIVED',                 // All ordered items successfully arrived
  COMPLETED: 'COMPLETED',               // Financial and receiving flows finalized
  CANCELLED: 'CANCELLED',               // Voided transaction (Allowed for DRAFT/APPROVED)
};

// Array of statuses for mongoose enum validation
export const PURCHASE_STATUS_LIST = Object.values(PURCHASE_STATUS);

// Payment Lifecycle Statuses (Kept separate from operational receiving status)
export const PAYMENT_STATUS = {
  UNPAID: 'UNPAID',                     // No money has been sent yet
  PARTIALLY_PAID: 'PARTIALLY_PAID',     // Part of the Grand Total has been paid
  PAID: 'PAID',                         // Fully settled with supplier
};

export const PAYMENT_STATUS_LIST = Object.values(PAYMENT_STATUS);

// Document Identifier Prefixes for Auto-Generation
export const DOCUMENT_PREFIXES = {
  PURCHASE_ORDER: 'PO-',                // Request/Intention to buy
  PURCHASE: 'PUR-',                     // Commercial/Historical transaction matching invoice
  GOODS_RECEIPT: 'GRN-',                // Warehouse verification voucher
  RETURN: 'PRRET-',                     // Supplier Return transaction
  EXCHANGE: 'PREXCH-',                  // Supplier Exchange transaction
};

// Role-Based Access Control (RBAC) Permitted Matrix Mapping
export const PURCHASE_PERMISSIONS = {
  CREATE_DRAFT: ['staff', 'manager', 'admin'],
  SUBMIT: ['staff', 'manager', 'admin'],
  APPROVE: ['manager', 'admin'],
  RECEIVE_GOODS: ['warehouse_staff', 'manager', 'admin'],
  RECORD_PAYMENT: ['finance', 'admin'],
  CANCEL: ['manager', 'admin'],
  APPROVE_RETURN: ['manager', 'admin'],
};

// 5. Immutability Configuration
// Statuses after which a primary document cannot be directly updated or deleted
export const IMMUTABLE_PURCHASE_STATUSES = [
  PURCHASE_STATUS.PARTIALLY_RECEIVED,
  PURCHASE_STATUS.RECEIVED,
  PURCHASE_STATUS.COMPLETED,
  PURCHASE_STATUS.CANCELLED
];

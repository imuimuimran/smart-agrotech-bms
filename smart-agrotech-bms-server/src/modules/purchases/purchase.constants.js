/**
 * Enterprise Procurement Architecture Constants
 * Source of truth for system lifecycles, states, and document constraints.
 */

export const PO_STATUS = {
  DRAFT: 'DRAFT',
  SUBMITTED: 'SUBMITTED',
  UNDER_REVIEW: 'UNDER_REVIEW',
  APPROVED: 'APPROVED',
  REJECTED: 'REJECTED',
  SENT: 'SENT',
  SENT_TO_SUPPLIER: 'SENT_TO_SUPPLIER',
  PARTIALLY_RECEIVED: 'PARTIALLY_RECEIVED',
  FULLY_RECEIVED: 'FULLY_RECEIVED',
  READY_FOR_FULFILLMENT: 'READY_FOR_FULFILLMENT',
  CANCELLED: 'CANCELLED',
  CLOSED: 'CLOSED'
};

// Purchase Lifecycle Statuses (Independent of Payment)
export const PURCHASE_STATUS = {
  DRAFT: 'DRAFT',                       // Being prepared, freely editable
  SUBMITTED: 'SUBMITTED',               // Sent for approval/review
  APPROVED: 'APPROVED',                 // Approved, authorized to receive
  CONFIRMED: 'CONFIRMED',
  PARTIALLY_RECEIVED: 'PARTIALLY_RECEIVED', // Some items received at warehouse
  RECEIVED: 'RECEIVED',                 // All ordered items successfully arrived
  COMPLETED: 'COMPLETED',               // Financial and receiving flows finalized
  CANCELLED: 'CANCELLED',               // Voided transaction (Allowed for DRAFT/APPROVED)
};

export const GRN_STATUS = {
  DRAFT: 'DRAFT',
  POSTED: 'POSTED',
  CANCELLED: 'CANCELLED'
};
// Array of statuses for mongoose enum validation
export const PURCHASE_STATUS_LIST = Object.values(PURCHASE_STATUS);

// Payment Lifecycle Statuses (Kept separate from operational receiving status)
export const PAYMENT_STATUS = {
  UNPAID: 'UNPAID',                     // No money has been sent yet
  PARTIALLY_PAID: 'PARTIALLY_PAID',     // Part of the Grand Total has been paid
  PAID: 'PAID',                         // Fully settled with supplier
  CANCELLED: 'CANCELLED'
};

export const PAYMENT_METHODS = ['CASH', 'BANK_TRANSFER', 'MOBILE_BANKING', 'CREDIT_CARD', 'CHEQUE'];
export const PAYMENT_STATUS_LIST = Object.values(PAYMENT_STATUS);

// Independent Communication Lifecycle Statuses
export const COMM_STATUS = {
  PENDING: 'PENDING',
  SENDING: 'SENDING',
  SENT: 'SENT',
  FAILED: 'FAILED',
  CANCELLED: 'CANCELLED'
};

export const COMM_CHANNELS = ['EMAIL', 'PORTAL', 'API', 'MANUAL']; 

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

// Configurable Threshold Matrix Rules (Avoids Application Code Re-writes)
export const APPROVAL_THRESHOLDS = [
  { maxAmount: 100000, requiredRole: 'purchasing_manager', label: 'Purchasing Manager Approval' },
  { maxAmount: 1000000, requiredRole: 'department_manager', label: 'Department Manager Approval' },
  { maxAmount: 5000000, requiredRole: 'senior_manager', label: 'Senior Manager Approval' },
  { maxAmount: Infinity, requiredRole: 'admin', label: 'Executive/Admin Approval' }
];

// Configurable Separation of Duties Flag
export const CONFIG_ALLOW_SELF_APPROVAL = false;

// Vector A: What exactly did the supplier declare?
export const SUPPLIER_RESPONSE_TYPES = {
  ACCEPTED: 'ACCEPTED',
  PARTIALLY_ACCEPTED: 'PARTIALLY_ACCEPTED',
  REJECTED: 'REJECTED',
  AMENDMENT_REQUESTED: 'AMENDMENT_REQUESTED'
};

// ector B: Where does our internal processing of that declaration stand?
export const SUPPLIER_RESPONSE_STATUS = {
  RECEIVED: 'RECEIVED',
  UNDER_REVIEW: 'UNDER_REVIEW',
  ACCEPTED: 'ACCEPTED',
  DECLINED: 'DECLINED',
  RESOLVED: 'RESOLVED'
};

export const RESPONSE_CHANNELS = ['EMAIL', 'PORTAL', 'API', 'MANUAL']; // Tracking bounds
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

// Extended Purchase Order receiving indicators
export const PO_RECEIVING_STATUS = {
  NOT_RECEIVED: 'NOT_RECEIVED',
  PARTIALLY_RECEIVED: 'PARTIALLY_RECEIVED',
  FULLY_RECEIVED: 'FULLY_RECEIVED',
  OVER_RECEIVED: 'OVER_RECEIVED',
  CLOSED: 'CLOSED'
};

// Vector A: Primary Document Lifecycle Status
export const GRN_LIFECYCLE = {
  DRAFT: 'DRAFT',              // Count being entered by warehouse employee 
  FINALIZED: 'FINALIZED',      // Completed, locked, and non-editable 
  CANCELLED: 'CANCELLED'       // Voided with compensating transactions 
};

// Vector B: Quality Inspection Status
export const GRN_INSPECTION = {
  NOT_REQUIRED: 'NOT_REQUIRED',
  PENDING: 'PENDING',
  PASSED: 'PASSED',
  PARTIALLY_PASSED: 'PARTIALLY_PASSED',
  FAILED: 'FAILED'
};

// Vector C: Financial Ledger/Inventory Allocation Status
export const GRN_POSTING = {
  NOT_POSTED: 'NOT_POSTED',
  POSTED: 'POSTED',
  REVERSED: 'REVERSED'
};

export const PRODUCT_CONDITIONS = ['NEW', 'DAMAGED', 'DEFECTIVE', 'INCORRECT']; 
export const DISCREPANCY_CLASSES = ['SHORT', 'OVER', 'DAMAGED', 'WRONG_PRODUCT', 'OTHER'];


// Core Discrepancy Initial Classification Standard Matrix
export const DISCREPANCY_TYPES = {
  SHORT_SHIPMENT: 'SHORT_SHIPMENT',
  OVER_SHIPMENT: 'OVER_SHIPMENT',
  DAMAGED_GOODS: 'DAMAGED_GOODS',
  WRONG_PRODUCT: 'WRONG_PRODUCT',
  WRONG_VARIANT: 'WRONG_VARIANT',
  WRONG_BATCH: 'WRONG_BATCH',
  WRONG_SERIAL: 'WRONG_SERIAL',
  QUALITY_FAILURE: 'QUALITY_FAILURE',
  EXPIRED_PRODUCT: 'EXPIRED_PRODUCT',
  MISSING_COMPONENT: 'MISSING_COMPONENT',
  PACKAGING_DAMAGE: 'PACKAGING_DAMAGE',
  SPECIFICATION_MISMATCH: 'SPECIFICATION_MISMATCH',
  DOCUMENTATION_MISMATCH: 'DOCUMENTATION_MISMATCH',
  OTHER: 'OTHER'
};

// Operational Priority Scales
export const DISCREPANCY_SEVERITY = ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'];

// Vector A: Exception Tracking Lifecycle Status
export const DISCREPANCY_STATUS = {
  OPEN: 'OPEN',
  UNDER_REVIEW: 'UNDER_REVIEW',
  SUPPLIER_CONTACTED: 'SUPPLIER_CONTACTED',
  AWAITING_SUPPLIER: 'AWAITING_SUPPLIER',
  RESOLUTION_PENDING: 'RESOLUTION_PENDING',
  RESOLVED: 'RESOLVED', // Split status concept (9.9.25)
  CLOSED: 'CLOSED',     // Split status concept (9.9.25)
  CANCELLED: 'CANCELLED'
};

// Action Resolution Types Matrix Mapping
export const RESOLUTION_TYPES = {
  NO_ACTION: 'NO_ACTION',
  ACCEPT_AS_IS: 'ACCEPT_AS_IS',
  PRICE_ADJUSTMENT: 'PRICE_ADJUSTMENT',
  CREDIT_NOTE: 'CREDIT_NOTE',
  SUPPLIER_RETURN: 'SUPPLIER_RETURN',
  SUPPLIER_EXCHANGE: 'SUPPLIER_EXCHANGE',
  REPLACEMENT: 'REPLACEMENT',
  PARTIALLY_REPLACEMENT: 'PARTIALLY_REPLACEMENT',
  ADDITIONAL_SHIPMENT: 'ADDITIONAL_SHIPMENT',
  CANCEL_REMAINING: 'CANCEL_REMAINING',
  INTERNAL_ADJUSTMENT: 'INTERNAL_ADJUSTMENT',
  OTHER: 'OTHER'
};

// Vector B: Resolution Tracking Status
export const RESOLUTION_STATUS = ['PROPOSED', 'PENDING_APPROVAL', 'APPROVED', 'IN_PROGRESS', 'COMPLETED', 'REJECTED', 'CANCELLED'];

// Performance Metric Assignment Vectors
export const RESPONSIBILITY_MATRIX = ['UNKNOWN', 'SUPPLIER_RESPONSIBLE', 'CARRIER_RESPONSIBLE', 'INTERNAL_ERROR'];

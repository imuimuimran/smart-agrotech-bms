import mongoose from 'mongoose';
import { 
  INVOICE_MATCHING_STATUS, 
  INVOICE_APPROVAL_STATUS, 
  INVOICE_PAYMENT_STATUS 
} from './purchase.constants.js';

const Schema = mongoose.Schema;

// =========================================================================
// 1. PURCHASE INVOICE ITEM SUB-SCHEMA
// =========================================================================
/**
 * Embedded transaction item sub-schema.
 * Isolates line data snapshots to protect historical audit tracks from master data drift.
 */
const PurchaseInvoiceItemSchema = new Schema({
  productId: {
    type: Schema.Types.ObjectId,
    ref: 'Product',
    required: true
  },
  purchaseOrderItemId: {
    type: Schema.Types.ObjectId
  },
  goodsReceiptItemId: {
    type: Schema.Types.ObjectId
  },
  productNameSnapshot: {
    type: String,
    required: true
  },
  skuSnapshot: {
    type: String,
    required: true
  },
  invoicedQuantity: {
    type: Number,
    required: true,
    min: [0, 'Invoiced quantity cannot be negative']
  },
  unitPrice: {
    type: Schema.Types.Decimal128,
    required: true
  },
  discountAmount: {
    type: Schema.Types.Decimal128,
    default: 0
  },
  taxAmount: {
    type: Schema.Types.Decimal128,
    default: 0
  },
  lineSubtotal: {
    type: Schema.Types.Decimal128,
    required: true
  },
  lineTotal: {
    type: Schema.Types.Decimal128,
    required: true
  },
  batchNumbers: [{
    type: String
  }],
  serialNumbers: [{
    type: String
  }],
  notes: {
    type: String
  }
}, { _id: false });

// =========================================================================
// 2. PURCHASE INVOICE APPROVAL HISTORY SUB-SCHEMA
// =========================================================================
/**
 * Embedded history log to track sequential operations securely.
 * Preserves a complete point-in-time chronological audit trail.
 */
const PurchaseInvoiceApprovalSchema = new Schema({
  action: {
    type: String,
    required: true
  },
  performedBy: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  performedAt: {
    type: Date,
    default: Date.now
  },
  comments: {
    type: String
  }
}, { _id: false }); // Enforces clean structural embedding




// =========================================================================
// 1. NESTED SUB-SCHEMAS (Ensures structural consistency & clean validation)
// =========================================================================

const InvoiceItemSchema = new Schema({
  productId: { type: Schema.Types.ObjectId, ref: 'Product', required: true },
  purchaseOrderItemId: { type: Schema.Types.ObjectId, required: true }, // Links to unique PO line item row index
  goodsReceiptItemId: { type: Schema.Types.ObjectId, required: true },   // Links to physical GRN warehouse row index
  productNameSnapshot: { type: String, required: true },                 // Hardened anti-drift transaction snapshot
  skuSnapshot: { type: String, required: true },                         // Hardened anti-drift transaction snapshot
  invoicedQuantity: { type: Number, required: true, min: [1, 'Quantity must be at least 1'] },
  unitPrice: { type: Schema.Types.Decimal128, required: true },
  discountAmount: { type: Schema.Types.Decimal128, default: 0 },
  taxAmount: { type: Schema.Types.Decimal128, default: 0 },
  lineSubtotal: { type: Schema.Types.Decimal128, required: true },
  lineTotal: { type: Schema.Types.Decimal128, required: true },
  batchNumbers: [{ type: String }],  // Extracted lot identity strings
  serialNumbers: [{ type: String }] // Extracted device track sequences
}, { _id: false });

const InvoiceApprovalHistorySchema = new Schema({
  status: { type: String, enum: Object.values(INVOICE_APPROVAL_STATUS), required: true },
  actionBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  actionAt: { type: Date, default: Date.now },
  comment: { type: String, trim: true }
}, { _id: false });

// =========================================================================
// 2. PRIMARY SYSTEM ENTITY MAIN SCHEMA
// =========================================================================

// =========================================================================
// 3. PRIMARY PURCHASE INVOICE MAIN SCHEMA
// =========================================================================
const PurchaseInvoiceSchema = new Schema({
  // Unique Business Tracking References
  invoiceNumber: {
    type: String,
    required: true,
    unique: true,
    index: true
  },
  supplierInvoiceNumber: {
    type: String,
    required: true,
    index: true
  },

  // Multi-Module Relationship Matrix Mapping Links
  supplierId: {
    type: Schema.Types.ObjectId,
    ref: 'Supplier',
    required: true,
    index: true
  },
  purchaseOrderId: {
    type: Schema.Types.ObjectId,
    ref: 'PurchaseOrder',
    required: true,
    index: true
  },
  purchaseOrderVersion: {
    type: Number,
    required: true,
    default: 1
  },
  goodsReceiptIds: [{
    type: Schema.Types.ObjectId,
    ref: 'GoodsReceipt',
    index: true
  }],
  discrepancyIds: [{
    type: Schema.Types.ObjectId,
    ref: 'PurchaseReceivingDiscrepancy',
    index: true
  }],

  // Core Calendar Timestamps
  invoiceDate: {
    type: Date,
    required: true,
    index: true
  },
  dueDate: {
    type: Date,
    required: true,
    index: true
  },

  // Multi-Currency Framework Architecture
  currency: {
    type: String,
    required: true
  },
  exchangeRate: {
    type: Schema.Types.Decimal128,
    default: 1
  },

  // Line Item Grid
  items: [PurchaseInvoiceItemSchema],

  // Financial Header Summaries
  subtotal: {
    type: Schema.Types.Decimal128,
    required: true
  },
  discountAmount: {
    type: Schema.Types.Decimal128,
    default: 0
  },
  taxAmount: {
    type: Schema.Types.Decimal128,
    default: 0
  },
  shippingCost: {
    type: Schema.Types.Decimal128,
    default: 0
  },
  additionalCharges: {
    type: Schema.Types.Decimal128,
    default: 0
  },
  grandTotal: {
    type: Schema.Types.Decimal128,
    required: true
  },

  // 3-Way Match Validation States
  matchingStatus: {
    type: String,
    enum: [
      'NOT_STARTED',
      'IN_PROGRESS',
      'MATCHED',
      'PARTIAL_MATCH',
      'VARIANCE',
      'BLOCKED'
    ],
    default: 'NOT_STARTED',
    index: true
  },
  matchingResult: {
    type: String,
    enum: [
      'FULL_MATCH',
      'PARTIAL_MATCH',
      'PRICE_VARIANCE',
      'QUANTITY_VARIANCE',
      'TAX_VARIANCE',
      'DISCREPANCY_PENDING',
      'MANUAL_REVIEW',
      'BLOCKED'
    ]
  },

  // Internal Management Status Vectors
  approvalStatus: {
    type: String,
    enum: [
      'PENDING',
      'APPROVED',
      'REJECTED'
    ],
    default: 'PENDING',
    index: true
  },
  approvalHistory: [PurchaseInvoiceApprovalSchema],

  // Downstream Ledger Foundations (Intentionally Reference-Only at this Stage)
  accountsPayableId: {
    type: Schema.Types.ObjectId,
    ref: 'AccountsPayable',
    default: null,
    index: true
  },
  paymentStatus: {
    type: String,
    enum: [
      'UNPAID',
      'PARTIALLY_PAID',
      'PAID'
    ],
    default: 'UNPAID',
    index: true
  },

  // Context & Metadata Assets
  notes: {
    type: String
  },
  attachments: [{
    type: String
  }],

  // Audit Context Constraints
  createdBy: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  updatedBy: {
    type: Schema.Types.ObjectId,
    ref: 'User'
  }
}, {
  timestamps: true // Captures system database operational times: createdAt & updatedAt
});

// =========================================================================
// 4. DATABASE COUPLING OPERATIONAL PERFORMANCE INDEXES
// =========================================================================

// Enforces business unique integrity rules strictly bounded inside each individual supplier context
PurchaseInvoiceSchema.index({
  supplierId: 1,
  supplierInvoiceNumber: 1
}, {
  unique: true
});

// Supports high-performance historical analysis and aggregate reports by date sequences
PurchaseInvoiceSchema.index({
  purchaseOrderId: 1,
  invoiceDate: -1
});

// Accelerates internal vendor age summaries and current balance lookups
PurchaseInvoiceSchema.index({
  supplierId: 1,
  paymentStatus: 1
});

// Facilitates high-volume operational dispatch matching processing pipelines
PurchaseInvoiceSchema.index({
  matchingStatus: 1,
  approvalStatus: 1
});

// Optimizes real-time automated ledger overdue alert triggers
PurchaseInvoiceSchema.index({
  dueDate: 1,
  paymentStatus: 1
});

export const PurchaseInvoice = mongoose.model('PurchaseInvoice', PurchaseInvoiceSchema);

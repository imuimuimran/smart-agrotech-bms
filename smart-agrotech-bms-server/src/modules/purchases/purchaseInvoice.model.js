import mongoose from 'mongoose';
import { 
  INVOICE_STATUS, MATCHING_STATUS,
  INVOICE_MATCHING_STATUS, 
  INVOICE_PAYMENT_STATUS
} from './purchase.constants.js';

const Schema = mongoose.Schema;

// Approval History Audit Trail (Page 2, 8)
const InvoiceApprovalHistorySchema = new Schema({
  status: { type: String, required: true },
  actionBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  actionAt: { type: Date, default: Date.now },
  comment: { type: String }
}, { _id: false });

// Invoice Item Schema Shape with Traceable Relationship Keys (Page 2, 6)
const InvoiceItemSchema = new Schema({
  productId: { type: Schema.Types.ObjectId, ref: 'Product', required: true },
  purchaseOrderItemId: { type: Schema.Types.ObjectId }, // Map directly to origin PO row index
  goodsReceiptItemId: { type: Schema.Types.ObjectId },   // Map directly to warehouse arrival item row index
  productNameSnapshot: { type: String, required: true }, // Point-in-time snapshot guardrail
  skuSnapshot: { type: String, required: true },         // Point-in-time snapshot guardrail
  invoicedQuantity: { type: Number, required: true, min: [1, 'Invoiced quantity must be at least 1'] },
  unitPrice: { type: Schema.Types.Decimal128, required: true },
  discountAmount: { type: Schema.Types.Decimal128, default: 0 },
  taxAmount: { type: Schema.Types.Decimal128, default: 0 },
  lineSubtotal: { type: Schema.Types.Decimal128, required: true },
  lineTotal: { type: Schema.Types.Decimal128, required: true },
  batchNumbers: [{ type: String }],  // Extracted lot tracking indexes
  serialNumbers: [{ type: String }], // Extracted individual machine indexes
  notes: { type: String }
}, { _id: false });

// ==========================================
// PRIMARY PURCHASE INVOICE SCHEMA
// ==========================================

const PurchaseInvoiceSchema = new Schema({
  // Business Reference Numbers (Page 2, 3)
  invoiceNumber: { type: String, required: true, unique: true, index: true }, // BMS Generated (e.g. PINV-2026-000001)
  supplierInvoiceNumber: { type: String, required: true, index: true },      // External Supplier Reference (e.g. ABC-INV-9912)

  // Core Relationship Links (Page 2, 3, 4, 5)
  supplierId: { type: Schema.Types.ObjectId, ref: 'Supplier', required: true, index: true },
  purchaseOrderId: { type: Schema.Types.ObjectId, ref: 'PurchaseOrder', required: true, index: true },
  purchaseOrderVersion: { type: Number, required: true, default: 1 }, // Vital historical integrity version branch lock
  goodsReceiptIds: [{ type: Schema.Types.ObjectId, ref: 'GoodsReceipt', required: true, index: true }], // Supports multiple partial deliveries
  discrepancyIds: [{ type: Schema.Types.ObjectId, ref: 'PurchaseReceivingDiscrepancy', index: true }], // Phase 9.9 exception trace links

  // Commercial Document Calendars (Page 2, 5)
  invoiceDate: { type: Date, required: true }, // Printed/issued date on supplier paper
  dueDate: { type: Date, required: true },     // Contractual payment deadline date

  // Multi-Currency Framework Architecture (Page 2, 6)
  currency: { type: String, required: true, default: 'BDT' },
  exchangeRate: { type: Schema.Types.Decimal128, required: true, default: 1.0 },

  // Transaction Items Arrays List (Page 2, 6)
  items: [InvoiceItemSchema],

  // Financial Summary Headers (Page 2, 7)
  subtotal: { type: Schema.Types.Decimal128, required: true },
  discountAmount: { type: Schema.Types.Decimal128, required: true, default: 0 },
  taxAmount: { type: Schema.Types.Decimal128, required: true, default: 0 },
  shippingCost: { type: Schema.Types.Decimal128, required: true, default: 0 },
  additionalCharges: { type: Schema.Types.Decimal128, required: true, default: 0 },
  grandTotal: { type: Schema.Types.Decimal128, required: true }, // Formula: Subtotal - Discount + Tax + Shipping + Addtnl

  // 3-Way Match & Review Separation Vectors (Page 2, 7, 8)
  matchingStatus: { type: String, enum: Object.values(INVOICE_MATCHING_STATUS), default: INVOICE_MATCHING_STATUS.NOT_STARTED, index: true },
  matchingResult: { type: Schema.Types.ObjectId, ref: 'InvoiceMatchResult' }, // Points to explicit business evaluation metrics
  approvalStatus: { type: String, required: true, default: 'PENDING_REVIEW', index: true },
  approvalHistory: [InvoiceApprovalHistorySchema],

  // Future Accounts Payable & Financial Lifecycle Reference Foundations (Page 2, 8, 9)
  accountsPayableId: { type: Schema.Types.ObjectId }, // Placeholder layer; not actively populating yet
  paymentStatus: { type: String, enum: Object.values(INVOICE_PAYMENT_STATUS), default: INVOICE_PAYMENT_STATUS.UNPAID, index: true },

  // Freeform Context Notes & Auditable Assets (Page 2)
  notes: { type: String },
  attachments: [{ type: String }], // Cloud storage URLs for uploaded physical paper/PDF copies

  // User Space Audit Tracking Fields (Page 2, 9)
  createdBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  updatedBy: { type: Schema.Types.ObjectId, ref: 'User' }
}, { 
  timestamps: true // Automated tracking of native database records: createdAt and updatedAt
});

// Avoid duplicate invoices from the same supplier boundary 
PurchaseInvoiceSchema.index({ supplierId: 1, supplierInvoiceNumber: 1 }, { unique: true });

export const PurchaseInvoice = mongoose.model('PurchaseInvoice', PurchaseInvoiceSchema);

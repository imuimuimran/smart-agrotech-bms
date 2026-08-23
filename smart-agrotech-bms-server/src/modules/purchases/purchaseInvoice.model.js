import mongoose from 'mongoose';
import { 
  INVOICE_MATCHING_STATUS, 
  INVOICE_APPROVAL_STATUS, 
  INVOICE_PAYMENT_STATUS 
} from './purchase.constants.js';

const Schema = mongoose.Schema;

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

const PurchaseInvoiceSchema = new Schema({
  // Unique Business Tracking Identifiers
  invoiceNumber: { type: String, required: true, unique: true, index: true }, // Internal System Generated Sequence Code
  supplierInvoiceNumber: { type: String, required: true, index: true },      // External Supplier Document Key

  // Core Relationship Multi-Module Link Matrix
  supplierId: { type: Schema.Types.ObjectId, ref: 'Supplier', required: true, index: true },
  purchaseOrderId: { type: Schema.Types.ObjectId, ref: 'PurchaseOrder', required: true, index: true },
  purchaseOrderVersion: { type: Number, required: true, default: 1 }, // Retains original frozen PO branch version
  goodsReceiptIds: [{ type: Schema.Types.ObjectId, ref: 'GoodsReceipt', required: true, index: true }], // Supporting multi-GRN tracking arrays
  discrepancyIds: [{ type: Schema.Types.ObjectId, ref: 'PurchaseReceivingDiscrepancy', index: true }], // Traceability into Phase 9.9

  // Time & Location Dates
  invoiceDate: { type: Date, required: true }, // The calendar issue date printed on the physical vendor invoice
  dueDate: { type: Date, required: true },     // The contract payment milestone deadline date

  // Multi-Currency Framework Properties
  currency: { type: String, required: true, default: 'BDT', uppercase: true, trim: true },
  exchangeRate: { type: Schema.Types.Decimal128, required: true, default: 1.0 },

  // Embedded Line Collection
  items: [InvoiceItemSchema],

  // Financial Summary Headers
  subtotal: { type: Schema.Types.Decimal128, required: true },
  discountAmount: { type: Schema.Types.Decimal128, required: true, default: 0 },
  taxAmount: { type: Schema.Types.Decimal128, required: true, default: 0 },
  shippingCost: { type: Schema.Types.Decimal128, required: true, default: 0 },
  additionalCharges: { type: Schema.Types.Decimal128, required: true, default: 0 },
  grandTotal: { type: Schema.Types.Decimal128, required: true }, // Formula Verified: Subtotal - Discount + Tax + Shipping + Charges

  // Three-Way Matching Audit Separation Dimensions
  matchingStatus: { 
    type: String, 
    enum: Object.values(INVOICE_MATCHING_STATUS), 
    default: INVOICE_MATCHING_STATUS.NOT_STARTED, 
    index: true 
  },
  matchingResult: { type: Schema.Types.ObjectId, ref: 'InvoiceMatchResult' }, // Separate evaluation collection anchor

  // Authorization Tracking Status Vectors
  approvalStatus: { 
    type: String, 
    enum: Object.values(INVOICE_APPROVAL_STATUS), 
    default: INVOICE_APPROVAL_STATUS.DRAFT, 
    index: true 
  },
  approvalHistory: [InvoiceApprovalHistorySchema],

  // Downstream Accounts Payable Hand-off Anchors (Intentionally unpopulated at this phase)
  accountsPayableId: { type: Schema.Types.ObjectId, default: null }, // Future expansion link node
  paymentStatus: { 
    type: String, 
    enum: Object.values(INVOICE_PAYMENT_STATUS), 
    default: INVOICE_PAYMENT_STATUS.UNPAID, 
    index: true 
  },

  // Auditable Data Notes & Document Assets
  notes: { type: String, trim: true },
  attachments: [{ type: String, trim: true }], // Cloud URLs pointing to uploaded image/PDF assets

  // User Space Integrity Control Fields
  createdBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  updatedBy: { type: Schema.Types.ObjectId, ref: 'User' }
}, { 
  timestamps: true // Automatically fields database insertion logs: `createdAt` and `updatedAt`
});

// Enforce safe compound boundary index to guarantee a supplier cannot file duplicate invoice reference keys
PurchaseInvoiceSchema.index({ supplierId: 1, supplierInvoiceNumber: 1 }, { unique: true });

export const PurchaseInvoice = mongoose.model('PurchaseInvoice', PurchaseInvoiceSchema);

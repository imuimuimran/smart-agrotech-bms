import mongoose from 'mongoose';
import { INVOICE_STATUS, MATCHING_STATUS } from './purchase.constants.js';

const Schema = mongoose.Schema;

// Granular Line-Item Structure with Traceable Keys
const InvoiceItemSchema = new Schema({
  productId: { type: Schema.Types.ObjectId, ref: 'Product', required: true },
  purchaseOrderItemId: { type: Schema.Types.ObjectId }, // Map back to origin item row
  goodsReceiptItemId: { type: Schema.Types.ObjectId },   // Map back to physical item row
  productNameSnapshot: { type: String, required: true }, // Point-in-time history protection
  skuSnapshot: { type: String, required: true },
  invoicedQuantity: { type: Number, required: true, min: [1, 'Invoiced count must be at least 1'] },
  unitPrice: { type: Schema.Types.Decimal128, required: true },
  discountAmount: { type: Schema.Types.Decimal128, default: 0 },
  taxAmount: { type: Schema.Types.Decimal128, default: 0 },
  lineSubtotal: { type: Schema.Types.Decimal128, required: true },
  lineTotal: { type: Schema.Types.Decimal128, required: true },
  batchNumbers: [{ type: String }],
  serialNumbers: [{ type: String }],
  notes: { type: String }
}, { _id: false });

// Core Supplier Purchase Invoice Frame
const PurchaseInvoiceSchema = new Schema({
  invoiceNumber: { type: String, required: true, unique: true, index: true }, // Internal: PINV-2026-000001
  supplierInvoiceNumber: { type: String, required: true, index: true },      // External: ABC-INV-9912
  supplierId: { type: Schema.Types.ObjectId, ref: 'Supplier', required: true, index: true },
  purchaseOrderId: { type: Schema.Types.ObjectId, ref: 'PurchaseOrder', required: true, index: true },
  purchaseOrderVersion: { type: Number, default: 1, required: true },
  goodsReceiptIds: [{ type: Schema.Types.ObjectId, ref: 'GoodsReceipt', index: true }],
  discrepancyIds: [{ type: Schema.Types.ObjectId, ref: 'PurchaseReceivingDiscrepancy', index: true }],
  
  invoiceDate: { type: Date, required: true },
  dueDate: { type: Date, required: true },
  currency: { type: String, default: 'BDT', required: true },
  exchangeRate: { type: Schema.Types.Decimal128, default: 1.0 },
  
  items: [InvoiceItemSchema],
  
  subtotal: { type: Schema.Types.Decimal128, required: true },
  discountAmount: { type: Schema.Types.Decimal128, default: 0 },
  taxAmount: { type: Schema.Types.Decimal128, default: 0 },
  shippingCost: { type: Schema.Types.Decimal128, default: 0 },
  additionalCharges: { type: Schema.Types.Decimal128, default: 0 },
  grandTotal: { type: Schema.Types.Decimal128, required: true },
  
  matchingStatus: { type: String, enum: Object.values(MATCHING_STATUS), default: MATCHING_STATUS.NOT_STARTED, index: true },
  matchingResult: { type: String }, // Maps to InvoiceMatchResult ID pointer downstream
  approvalStatus: { type: String, enum: Object.values(INVOICE_STATUS), default: INVOICE_STATUS.DRAFT, index: true },
  
  accountsPayableId: { type: Schema.Types.ObjectId }, // To be bound in a future phase 
  paymentStatus: { type: String, default: 'UNPAID', index: true },
  notes: { type: String },
  attachments: [{ type: String }],
  createdBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  updatedBy: { type: Schema.Types.ObjectId, ref: 'User' }
}, { timestamps: true });

// Avoid duplicate invoices from the same supplier boundary 
PurchaseInvoiceSchema.index({ supplierId: 1, supplierInvoiceNumber: 1 }, { unique: true });

export const PurchaseInvoice = mongoose.model('PurchaseInvoice', PurchaseInvoiceSchema);

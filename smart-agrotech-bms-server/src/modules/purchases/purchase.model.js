import mongoose from 'mongoose';
import { PO_STATUS, PURCHASE_STATUS, PAYMENT_STATUS, PAYMENT_METHODS } from './purchase.constants.js';

const Schema = mongoose.Schema;

// ==========================================
// EMBEDDED SUB-SCHEMAS (Historical Snapshots)
// ==========================================

const PurchaseOrderItemSchema = new Schema({
  productId: { type: Schema.Types.ObjectId, ref: 'Product', required: true },
  productNameSnapshot: { type: String, required: true }, // Protects from master data modification
  skuSnapshot: { type: String, required: true },         // Protects from master data modification
  orderedQuantity: { type: Number, required: true, min: [1, 'Quantity must be at least 1'] },
  expectedUnitCost: { type: Schema.Types.Decimal128, required: true },
  discount: { type: Schema.Types.Decimal128, default: 0 },
  tax: { type: Schema.Types.Decimal128, default: 0 },
  lineTotal: { type: Schema.Types.Decimal128, required: true }
}, { _id: false });

const PurchaseItemSchema = new Schema({
  productId: { type: Schema.Types.ObjectId, ref: 'Product', required: true },
  productNameSnapshot: { type: String, required: true },
  skuSnapshot: { type: String, required: true },
  orderedQuantity: { type: Number, required: true },
  receivedQuantity: { type: Number, default: 0 }, // Used for structural quantity integrity checks
  unitCost: { type: Schema.Types.Decimal128, required: true },
  discount: { type: Schema.Types.Decimal128, default: 0 },
  tax: { type: Schema.Types.Decimal128, default: 0 },
  lineTotal: { type: Schema.Types.Decimal128, required: true }
}, { _id: false });

// Virtual field for computing structural deltas on the fly without storing duplicate conflicting values
PurchaseItemSchema.virtual('remainingQuantity').get(function() {
  return this.orderedQuantity - this.receivedQuantity; // Business law: Remaining = Ordered - Received
});

// ==========================================
// MAIN PROCUREMENT MODELS
// ==========================================

// --- PURCHASE ORDER SCHEMA ---
const PurchaseOrderSchema = new Schema({
  poNumber: { type: String, required: true, unique: true, index: true },
  supplierId: { type: Schema.Types.ObjectId, ref: 'Supplier', required: true, index: true },
  orderDate: { type: Date, default: Date.now },
  expectedDeliveryDate: { type: Date },
  items: [PurchaseOrderItemSchema], // Embedded transaction list
  subtotal: { type: Schema.Types.Decimal128, required: true },
  discount: { type: Schema.Types.Decimal128, default: 0 },
  tax: { type: Schema.Types.Decimal128, default: 0 },
  shippingCost: { type: Schema.Types.Decimal128, default: 0 },
  otherCharges: { type: Schema.Types.Decimal128, default: 0 },
  grandTotal: { type: Schema.Types.Decimal128, required: true },
  status: { type: String, enum: Object.values(PO_STATUS), default: PO_STATUS.DRAFT, index: true },
  notes: { type: String },
  createdBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  approvedBy: { type: Schema.Types.ObjectId, ref: 'User' },
  approvedAt: { type: Date },
  version: { type: Number, default: 1, required: true }, // Vital history branch tracking
  supplierResponseStatus: { 
    type: String, 
    enum: Object.values(SUPPLIER_RESPONSE_TYPES), 
    index: true 
  } // Secondary tracking dimensions matrix pointer
}, { timestamps: true });

// --- PURCHASE TRANSACTION SCHEMA ---
const PurchaseSchema = new Schema({
  purchaseNumber: { type: String, required: true, unique: true, index: true },
  purchaseOrderId: { type: Schema.Types.ObjectId, ref: 'PurchaseOrder', index: true },
  supplierId: { type: Schema.Types.ObjectId, ref: 'Supplier', required: true, index: true },
  supplierNameSnapshot: { type: String, required: true },
  supplierContactSnapshot: { type: String },
  purchaseDate: { type: Date, required: true, index: true },
  items: [PurchaseItemSchema], // Embedded transaction list
  subtotal: { type: Schema.Types.Decimal128, required: true },
  discount: { type: Schema.Types.Decimal128, default: 0 },
  tax: { type: Schema.Types.Decimal128, default: 0 },
  shippingCost: { type: Schema.Types.Decimal128, default: 0 },
  otherCharges: { type: Schema.Types.Decimal128, default: 0 },
  grandTotal: { type: Schema.Types.Decimal128, required: true },
  status: { type: String, enum: Object.values(PURCHASE_STATUS), default: PURCHASE_STATUS.DRAFT, index: true },
  paymentStatus: { type: String, enum: Object.values(PAYMENT_STATUS), default: PAYMENT_STATUS.UNPAID, index: true },
  notes: { type: String },
  createdBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  updatedBy: { type: Schema.Types.ObjectId, ref: 'User' }
}, { timestamps: true });

// --- PURCHASE PAYMENT SCHEMA ---
const PurchasePaymentSchema = new Schema({
  paymentNumber: { type: String, required: true, unique: true, index: true },
  purchaseId: { type: Schema.Types.ObjectId, ref: 'Purchase', required: true, index: true },
  supplierId: { type: Schema.Types.ObjectId, ref: 'Supplier', required: true, index: true },
  paymentDate: { type: Date, default: Date.now, index: true },
  amount: { type: Schema.Types.Decimal128, required: true },
  paymentMethod: { type: String, enum: PAYMENT_METHODS, required: true },
  reference: { type: String }, // Bank transaction ID, Cheque number, etc.
  status: { type: String, enum: ['PENDING', 'COMPLETED', 'CANCELLED'], default: 'COMPLETED', index: true },
  notes: { type: String },
  recordedBy: { type: Schema.Types.ObjectId, ref: 'User', required: true }
}, { timestamps: true });

// Compound validation: A supplier invoice / reference sequence can be duplicate globally, but must be unique per supplier boundary
PurchaseSchema.index({ supplierId: 1, purchaseNumber: 1 });

export const PurchaseOrder = mongoose.model('PurchaseOrder', PurchaseOrderSchema);
export const Purchase = mongoose.model('Purchase', PurchaseSchema);
export const PurchasePayment = mongoose.model('PurchasePayment', PurchasePaymentSchema);

import mongoose from 'mongoose';
import { 
    SUPPLIER_RESPONSE_TYPES, 
    SUPPLIER_RESPONSE_STATUS, 
    RESPONSE_CHANNELS 
} from './purchase.constants.js';

const Schema = mongoose.Schema;

// Isolate nested requested item changes cleanly
const RequestedChangeSchema = new Schema({
  field: { type: String, required: true },         // e.g., 'expectedDeliveryDate', 'expectedUnitCost'
  currentValue: { type: String, required: true },   // Point-in-time reference baseline
  requestedValue: { type: String, required: true }, // Supplier's counter-proposal string
  reason: { type: String }
}, { _id: false }); 

const PartialItemSchema = new Schema({
  productId: { type: Schema.Types.ObjectId, ref: 'Product', required: true },
  orderedQuantity: { type: Number, required: true },
  acceptedQuantity: { type: Number, required: true } // Validation metric bounds
}, { _id: false });

// Core Supplier Response Data Structure
const SupplierResponseSchema = new Schema({
  purchaseOrderId: { type: Schema.Types.ObjectId, ref: 'PurchaseOrder', required: true, index: true },
  purchaseOrderVersion: { type: Number, default: 1, required: true }, // Version control boundary
  supplierId: { type: Schema.Types.ObjectId, ref: 'Supplier', required: true, index: true },
  responseType: { type: String, enum: Object.values(SUPPLIER_RESPONSE_TYPES), required: true },
  status: { type: String, enum: Object.values(SUPPLIER_RESPONSE_STATUS), default: SUPPLIER_RESPONSE_STATUS.RECEIVED },
  supplierReference: { type: String }, // Supplier invoice/tracking reference number
  responseChannel: { type: String, enum: RESPONSE_CHANNELS, required: true }, // Audit split
  message: { type: String }, // Freeform comments
  items: [PartialItemSchema], // Hydrated during PARTIALLY_ACCEPTED workflows
  requestedChanges: [RequestedChangeSchema], // Hydrated during AMENDMENT_REQUESTED workflows
  idempotencyKey: { type: String, unique: true, sparse: true }, // Prevents duplicate submission runs
  receivedAt: { type: Date, default: Date.now }, // Commercial date stamp
  recordedBy: { type: Schema.Types.ObjectId, ref: 'User', required: true } // Internal audit
}, { timestamps: true });

// Ensure strict index integrity bounds across version lookup structures
SupplierResponseSchema.index({ purchaseOrderId: 1, purchaseOrderVersion: 1 });

export const SupplierResponse = mongoose.model('SupplierResponse', SupplierResponseSchema);

import mongoose from 'mongoose';
import { 
    DISCREPANCY_TYPES, 
    DISCREPANCY_SEVERITY, 
    DISCREPANCY_STATUS, 
    RESPONSIBILITY_MATRIX 
} from './purchase.constants.js';

const Schema = mongoose.Schema;

// Granular Affected Item Sub-Schema Structure
const DiscrepancyItemSchema = new Schema({
  productId: { type: Schema.Types.ObjectId, ref: 'Product', required: true },
  expectedQuantity: { type: Number, required: true }, // Baseline requirement
  receivedQuantity: { type: Number, required: true }, // Physical arriving calculation 
  affectedQuantity: { type: Number, required: true, min: [1, 'Affected volume must be at least 1'] }, // Target error scale
  batchNumber: { type: String },
  serialNumbers: [{ type: String }],
  reason: { type: String }
}, { _id: false });

// Master Receiving Discrepancy Structural Frame
const PurchaseReceivingDiscrepancySchema = new Schema({
  discrepancyNumber: { type: String, required: true, unique: true, index: true }, // e.g., DIS-2026-000001
  purchaseOrderId: { type: Schema.Types.ObjectId, ref: 'PurchaseOrder', required: true, index: true },
  purchaseOrderVersion: { type: Number, required: true, default: 1 }, // Version freeze protection
  goodsReceiptId: { type: Schema.Types.ObjectId, ref: 'GoodsReceipt', required: true, index: true },
  supplierId: { type: Schema.Types.ObjectId, ref: 'Supplier', required: true, index: true },
  warehouseId: { type: Schema.Types.ObjectId, ref: 'Warehouse', required: true, index: true },
  
  type: { type: String, enum: Object.values(DISCREPANCY_TYPES), required: true, index: true },
  severity: { type: String, enum: DISCREPANCY_SEVERITY, default: 'MEDIUM', required: true },
  status: { type: String, enum: Object.values(DISCREPANCY_STATUS), default: DISCREPANCY_STATUS.OPEN, index: true },
  responsibility: { type: String, enum: RESPONSIBILITY_MATRIX, default: 'UNKNOWN', required: true },
  
  items: [DiscrepancyItemSchema], // Multi-product context array support
  description: { type: String, required: true },
  evidence: [{ type: String }],   // Photo/Video digital asset storage reference arrays
  
  quantityImpact: { type: Number, default: 0 },
  estimatedValueImpact: { type: Schema.Types.Decimal128, default: 0, required: true }, // Prioritization metric
  finalValueImpact: { type: Schema.Types.Decimal128, default: 0 },
  
  detectedBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  detectedAt: { type: Date, required: true, default: Date.now },
  assignedTo: { type: Schema.Types.ObjectId, ref: 'User', index: true }, // Preventing forgotten cases
  dueDate: { type: Date } // Operational SLA thresholds
}, { timestamps: true });

export const PurchaseReceivingDiscrepancy = mongoose.model(
  'PurchaseReceivingDiscrepancy', 
  PurchaseReceivingDiscrepancySchema
);

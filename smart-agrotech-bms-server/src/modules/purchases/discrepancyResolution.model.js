import mongoose from 'mongoose';
import { RESOLUTION_TYPES, RESOLUTION_STATUS } from './purchase.constants.js';

const Schema = mongoose.Schema;

// Flexible Split Multi-Resolution Engine Model
const DiscrepancyResolutionSchema = new Schema({
  discrepancyId: { type: Schema.Types.ObjectId, ref: 'PurchaseReceivingDiscrepancy', required: true, index: true },
  type: { type: String, enum: Object.values(RESOLUTION_TYPES), required: true },
  quantity: { type: Number, required: true, min: [1, 'Resolution target quantity must be positive'] },
  productId: { type: Schema.Types.ObjectId, ref: 'Product', required: true },
  value: { type: Schema.Types.Decimal128, default: 0 },
  
  // Dynamic cross-module tracking anchors 
  referenceType: { type: String, enum: ['SUPPLIER_RETURN', 'SUPPLIER_EXCHANGE', 'CREDIT_NOTE', 'GOODS_RECEIPT', 'NONE'], default: 'NONE' },
  referenceId: { type: Schema.Types.ObjectId }, // Pointers bound later when down-stream features launch
  
  status: { type: String, enum: RESOLUTION_STATUS, default: 'PROPOSED', required: true },
  approvedBy: { type: Schema.Types.ObjectId, ref: 'User' }, // Manager authorization signatures
  approvedAt: { type: Date },
  notes: { type: String }
}, { timestamps: true });

export const DiscrepancyResolution = mongoose.model('DiscrepancyResolution', DiscrepancyResolutionSchema);

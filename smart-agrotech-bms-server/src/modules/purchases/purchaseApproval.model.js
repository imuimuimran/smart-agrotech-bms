import mongoose from 'mongoose';
import { PO_STATUS } from './purchase.constants.js';

const Schema = mongoose.Schema;

const PurchaseOrderApprovalSchema = new Schema({
  purchaseOrderId: { type: Schema.Types.ObjectId, ref: 'PurchaseOrder', required: true, index: true },
  action: { 
    type: String, 
    enum: ['SUBMIT', 'START_REVIEW', 'APPROVE', 'REJECT', 'REVISE', 'CANCEL'], 
    required: true 
  },
  performedBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  performedAt: { type: Date, default: Date.now },
  previousStatus: { type: String, enum: Object.values(PO_STATUS), required: true },
  newStatus: { type: String, enum: Object.values(PO_STATUS), required: true },
  approvalLevel: { type: String }, // e.g., 'DEPARTMENT_MANAGER'
  comment: { type: String }         // Action explanation/reason trail
}, { timestamps: true });

export const PurchaseOrderApproval = mongoose.model('PurchaseOrderApproval', PurchaseOrderApprovalSchema);

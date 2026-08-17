import mongoose from 'mongoose';
import { COMM_STATUS, COMM_CHANNELS } from './purchase.constants.js';

const Schema = mongoose.Schema; 

// Enterprise Communication Audit Record
const PurchaseOrderCommunicationSchema = new Schema({
  purchaseOrderId: { type: Schema.Types.ObjectId, ref: 'PurchaseOrder', required: true, index: true },
  documentVersion: { type: Number, default: 1, required: true }, // Protects revision integrity
  channel: { type: String, enum: COMM_CHANNELS, default: 'EMAIL', required: true },
  recipient: { type: String, required: true }, // Verified primary procurement target contact
  subject: { type: String, required: true },
  status: { type: String, enum: Object.values(COMM_STATUS), default: COMM_STATUS.PENDING, index: true },
  provider: { type: String, default: 'INTERNAL_SMTP' },
  providerMessageId: { type: String }, // Third-party tracking key for support diagnostics
  failureReason: { type: String },     // Identifies temporary vs permanent drops
  initiatedBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  sentAt: { type: Date },
  failedAt: { type: Date }
}, { timestamps: true });

export const PurchaseOrderCommunication = mongoose.model(
  'PurchaseOrderCommunication', 
  PurchaseOrderCommunicationSchema
);

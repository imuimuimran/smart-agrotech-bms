import mongoose from 'mongoose';
import { AP_LIFECYCLE } from './purchase.constants.js';

const Schema = mongoose.Schema;

// Auditable Posting Audit Footprint Sub-Schema (Page 12)
const APPostingHistorySchema = new Schema({
  action: { type: String, default: 'POSTED_LIABILITY', required: true },
  performedBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  performedAt: { type: Date, default: Date.now },
  comments: { type: String }
}, { _id: false });

// Core Accounts Payable Data Structure (Page 2)
const AccountsPayableSchema = new Schema({
  apNumber: { type: String, required: true, unique: true, index: true }, // e.g., AP-2026-000001
  purchaseInvoiceId: { type: Schema.Types.ObjectId, ref: 'PurchaseInvoice', required: true, unique: true, index: true }, // Enforces 1:1 Invariant (Page 8, 15)
  purchaseOrderId: { type: Schema.Types.ObjectId, ref: 'PurchaseOrder', required: true, index: true },
  supplierId: { type: Schema.Types.ObjectId, ref: 'Supplier', required: true, index: true }, // Supports vendor reporting (Page 7)
  
  // Anti-Drift Monetary Valuations Ledger Matrix (Page 6)
  payableAmount: { type: Schema.Types.Decimal128, required: true },
  paidAmount: { type: Schema.Types.Decimal128, required: true, default: 0.00 },
  outstandingAmount: { type: Schema.Types.Decimal128, required: true }, // Formula: Payable - Paid (Page 6)
  
  dueDate: { type: Date, required: true, index: true },
  status: { type: String, enum: Object.values(AP_LIFECYCLE), default: AP_LIFECYCLE.OPEN, index: true },
  
  history: [APPostingHistorySchema],
  postedBy: { type: Schema.Types.ObjectId, ref: 'User', required: true }
}, { timestamps: true });

// Virtual getter to automatically flag overdue fields dynamically via calendar date markers (Page 5)
AccountsPayableSchema.virtual('isOverdue').get(function() {
  if (this.status === AP_LIFECYCLE.PAID) return false;
  return new Date() > this.dueDate;
});

export const AccountsPayable = mongoose.model('AccountsPayable', AccountsPayableSchema);

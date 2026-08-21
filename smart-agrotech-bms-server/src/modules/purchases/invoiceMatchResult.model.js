import mongoose from 'mongoose';
import { MATCH_RESULT_TYPES } from './purchase.constants.js';

const Schema = mongoose.Schema;

const VarianceItemSchema = new Schema({
  productId: { type: Schema.Types.ObjectId, ref: 'Product', required: true },
  varianceType: { type: String, enum: ['QUANTITY', 'PRICE', 'TAX', 'DISCREPANCY'] },
  poValue: { type: String },
  receiptValue: { type: String },
  invoiceValue: { type: String },
  difference: { type: String }
}, { _id: false });

// Core Audit Footprint Model for Matching Results
const InvoiceMatchResultSchema = new Schema({
  invoiceId: { type: Schema.Types.ObjectId, ref: 'PurchaseInvoice', required: true, unique: true, index: true },
  purchaseOrderId: { type: Schema.Types.ObjectId, ref: 'PurchaseOrder', required: true },
  goodsReceiptIds: [{ type: Schema.Types.ObjectId, ref: 'GoodsReceipt' }],
  
  quantityMatch: { type: Boolean, required: true },
  priceMatch: { type: Boolean, required: true },
  taxMatch: { type: Boolean, required: true },
  discrepancyCheck: { type: Boolean, required: true }, // downstream status validation flag
  
  varianceItems: [VarianceItemSchema],
  result: { type: String, enum: Object.values(MATCH_RESULT_TYPES), required: true },
  
  matchedBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  matchedAt: { type: Date, default: Date.now, required: true },
  notes: { type: String }
}, { timestamps: true });

export const InvoiceMatchResult = mongoose.model('InvoiceMatchResult', InvoiceMatchResultSchema);

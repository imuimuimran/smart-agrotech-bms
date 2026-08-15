import mongoose from 'mongoose';
import { GRN_STATUS } from './purchase.constants.js';

const Schema = mongoose.Schema;

const GoodsReceiptItemSchema = new Schema({
  productId: { type: Schema.Types.ObjectId, ref: 'Product', required: true },
  productNameSnapshot: { type: String, required: true },
  skuSnapshot: { type: String, required: true },
  quantityReceived: { type: Number, required: true, min: [1, 'Received quantity must be at least 1'] },
  notes: { type: String }
}, { _id: false });

const GoodsReceiptSchema = new Schema({
  receiptNumber: { type: String, required: true, unique: true, index: true },
  purchaseOrderId: { type: Schema.Types.ObjectId, ref: 'PurchaseOrder', index: true },
  purchaseId: { type: Schema.Types.ObjectId, ref: 'Purchase', required: true, index: true },
  supplierId: { type: Schema.Types.ObjectId, ref: 'Supplier', required: true, index: true },
  receivedDate: { type: Date, default: Date.now, index: true },
  items: [GoodsReceiptItemSchema], // Line items physically checked into the building
  status: { type: String, enum: Object.values(GRN_STATUS), default: GRN_STATUS.DRAFT, index: true },
  receivedBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  notes: { type: String }
}, { timestamps: true });

export const GoodsReceipt = mongoose.model('GoodsReceipt', GoodsReceiptSchema);

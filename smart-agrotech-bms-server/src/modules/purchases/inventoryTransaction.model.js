import mongoose from 'mongoose';

const Schema = mongoose.Schema;

// Pure Inventory Ledger Entity Shape
const InventoryTransactionSchema = new Schema({
  productId: { type: Schema.Types.ObjectId, ref: 'Product', required: true, index: true },
  warehouseId: { type: Schema.Types.ObjectId, ref: 'Warehouse', required: true, index: true },
  quantity: { type: Number, required: true }, // Positive for receipts, negative for returns/corrections
  transactionType: { type: String, default: 'PURCHASE_RECEIPT', required: true }, 
  referenceType: { type: String, default: 'GOODS_RECEIPT', required: true },       
  referenceId: { type: Schema.Types.ObjectId, ref: 'GoodsReceipt', required: true, index: true }, // Traceability anchor
  unitCost: { type: Schema.Types.Decimal128, required: true },
  batchNumber: { type: String },
  serialNumbers: [{ type: String }],
  postedBy: { type: Schema.Types.ObjectId, ref: 'User', required: true }
}, { timestamps: true });

export const InventoryTransaction = mongoose.model('InventoryTransaction', InventoryTransactionSchema);

import mongoose from 'mongoose';

const Schema = mongoose.Schema;

// Corrected Polymorphic Inventory Ledger Entity Structure (Step 8 Implementation)
const InventoryTransactionSchema = new Schema({
  productId: { type: Schema.Types.ObjectId, ref: 'Product', required: true, index: true },
  warehouseId: { type: Schema.Types.ObjectId, ref: 'Warehouse', required: true, index: true },
  quantity: { type: Number, required: true }, // Positive for receipts, negative for outgoing sales/corrections
  transactionType: { type: String, required: true }, // Aligned to INVENTORY_TRANSACTION_TYPE matrix
  referenceType: { type: String, required: true },   // Aligned to INVENTORY_REFERENCE_TYPE matrix     
  referenceId: { type: Schema.Types.ObjectId, required: true, index: true }, // Multi-model polymorphic trace anchor
  unitCost: { type: Schema.Types.Decimal128, required: true },
  batchNumber: { type: String },
  serialNumbers: [{ type: String }],
  postedBy: { type: Schema.Types.ObjectId, ref: 'User', required: true }
}, { timestamps: true });

export const InventoryTransaction = mongoose.model('InventoryTransaction', InventoryTransactionSchema);

import mongoose from 'mongoose';
import { SALE_STATUS } from './sale.constants.js';

const saleItemSchema = new mongoose.Schema(
  {
    productId: { type: mongoose.Schema.Types.ObjectId, ref: 'Product', required: true },
    productName: { type: String, required: true, trim: true },
    sku: { type: String, required: true, trim: true },
    quantity: { type: Number, required: true, min: 1 },
    unitPrice: { type: Number, required: true, min: 0 }, // What the customer pays
    unitCost: { type: Number, required: true, min: 0 },  // Snapshot of what it cost you to buy
    discount: { type: Number, default: 0, min: 0 },
    lineTotal: { type: Number, required: true, min: 0 },
  },
  { _id: true }
);

const saleSchema = new mongoose.Schema(
  {
    publicId: { type: String, required: true, unique: true, trim: true },
    invoiceNumber: { type: String, required: true, unique: true, trim: true },
    customerId: { type: mongoose.Schema.Types.ObjectId, ref: 'Customer', required: true },
    warehouseId: { type: mongoose.Schema.Types.ObjectId, ref: 'Warehouse', required: true, index: true }, // Added link
    products: [saleItemSchema], // Restored from original named array structure
    subtotal: { type: Number, required: true, min: 0 },
    discount: { type: Number, default: 0, min: 0 },
    totalAmount: { type: Number, required: true, min: 0 }, // Restored original naming
    paidAmount: { type: Number, required: true, default: 0, min: 0 },
    dueAmount: { type: Number, required: true, min: 0 },
    saleDate: { type: Date, required: true, default: Date.now },
    status: { type: String, enum: Object.values(SALE_STATUS), default: SALE_STATUS.CONFIRMED },
    remarks: { type: String, trim: true },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    isDeleted: { type: Boolean, default: false },
  },
  { timestamps: true, versionKey: false }
);

// saleSchema.index({ warehouseId: 1 });
// Compound reporting index for optimized multi-warehouse query performance tracking
saleSchema.index({ warehouseId: 1, saleDate: -1 });


export const Sale = mongoose.model('Sale', saleSchema);


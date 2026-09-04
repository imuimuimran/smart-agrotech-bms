import mongoose from 'mongoose';

const inventoryLogSchema = new mongoose.Schema(
  {
    productId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Product',
      required: true,
    },
    type: {
      type: String,
      enum: ['purchase', 'sale', 'adjustment', 'return', 'exchange'],
      required: true,
      lowercase: true,
    },
    quantity: {
      type: Number,
      required: true,
      min: [1, 'Quantity must be at least 1'],
    },
    previousStock: {
      type: Number,
      required: true,
      min: [0, 'Previous stock cannot be negative'],
    },
    currentStock: {
      type: Number,
      required: true,
      min: [0, 'Current stock cannot be negative'],
    },
    referenceId: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
    },
    referenceType: {
      type: String,
      required: true,
      trim: true,
    },
    remarks: {
      type: String,
      trim: true,
    },
  },
  {
    timestamps: true,
    versionKey: false,
  }
);

// Indexes for fast auditing and lookup
inventoryLogSchema.index({ productId: 1 });
inventoryLogSchema.index({ type: 1 });
inventoryLogSchema.index({ createdAt: -1 });

export const InventoryLog = mongoose.model('InventoryLog', inventoryLogSchema);

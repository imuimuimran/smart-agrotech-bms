import mongoose from "mongoose";

const { Schema, model } = mongoose;

/**
 * 12.2-A Outbound Defective Item Snapshot Schema
 * Captures historical context tracing back to origin lines.
 */
const PurchaseReturnItemSchema = new Schema(
  {
    productId: {
      type: Schema.Types.ObjectId,
      ref: "Product",
      required: true,
    },
    productNameSnapshot: {
      type: String,
      required: true,
    },
    skuSnapshot: {
      type: String,
      required: true,
    },
    purchaseItemId: {
      type: Schema.Types.ObjectId, // Link to specific item row inside Purchase document
      required: true,
    },
    goodsReceiptItemId: {
      type: Schema.Types.ObjectId, // Link to specific item row inside GoodsReceipt document
      required: true,
    },
    receivedQuantity: {
      type: Number,
      required: true,
      min: [1, "Received quantity snapshot must be at least 1."],
    },
    returnQuantity: {
      type: Number,
      required: true,
      min: [1, "Return quantity must be at least 1."],
    },
    unitCost: {
      type: Schema.Types.Decimal128, // Matches Decimal128 procurement standard
      required: true,
    },
    lineTotal: {
      type: Schema.Types.Decimal128,
      required: true,
    },
    reason: {
      type: String,
      required: true,
      trim: true,
    },
    batchNumber: {
      type: String,
      trim: true,
      default: null,
    },
    serialNumbers: [
      {
        type: String,
        trim: true,
      },
    ],
  },
  { _id: false }
);

/**
 * 12.2-A Inbound Replacement Item Snapshot Schema (EXCHANGE only)
 */
const ReplacementItemSchema = new Schema(
  {
    productId: {
      type: Schema.Types.ObjectId,
      ref: "Product",
      required: true,
    },
    productNameSnapshot: {
      type: String,
      required: true,
    },
    skuSnapshot: {
      type: String,
      required: true,
    },
    quantity: {
      type: Number,
      required: true,
      min: [1, "Replacement quantity must be at least 1."],
    },
    unitCost: {
      type: Schema.Types.Decimal128,
      required: true,
    },
    lineTotal: {
      type: Schema.Types.Decimal128,
      required: true,
    },
    batchNumber: {
      type: String,
      trim: true,
      default: null,
    },
    serialNumbers: [
      {
        type: String,
        trim: true,
      },
    ],
  },
  { _id: false }
);

/**
 * Main PurchaseReturn Collection Schema
 */
const PurchaseReturnSchema = new Schema(
  {
    publicId: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      index: true,
    },
    returnNumber: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      index: true, // e.g., PRRET-2026-000001 or PREXCH-2026-000001
    },
    supplierId: {
      type: Schema.Types.ObjectId,
      ref: "Supplier",
      required: true,
      index: true,
    },
    purchaseId: {
      type: Schema.Types.ObjectId,
      ref: "PurchaseOrder",
      required: true,
      index: true,
    },
    goodsReceiptId: {
      type: Schema.Types.ObjectId,
      ref: "GoodsReceipt",
      required: true,
      index: true,
    },
    discrepancyId: {
      type: Schema.Types.ObjectId,
      ref: "PurchaseReceivingDiscrepancy",
      default: null,
      index: true,
    },
    warehouseId: {
      type: Schema.Types.ObjectId,
      ref: "Warehouse",
      required: true,
      index: true,
    },
    returnType: {
      type: String,
      enum: ["RETURN", "EXCHANGE"],
      required: true,
      index: true,
    },
    items: {
      type: [PurchaseReturnItemSchema],
      required: true,
      validate: {
        validator: (items) => items && items.length > 0,
        message: "At least one return item is required.",
      },
    },
    replacementItems: {
      type: [ReplacementItemSchema],
      default: [],
    },
    reason: {
      type: String,
      required: true,
      trim: true,
    },
    remarks: {
      type: String,
      trim: true,
      default: "",
    },
    totalQuantity: {
      type: Number,
      required: true,
      min: [1, "Total quantity must be at least 1."],
    },
    totalAmount: {
      type: Schema.Types.Decimal128,
      required: true,
    },
    status: {
      type: String,
      enum: [
        "DRAFT",
        "PENDING_APPROVAL",
        "APPROVED",
        "REJECTED",
        "PROCESSING",
        "COMPLETED",
        "CANCELLED",
      ],
      default: "DRAFT",
      index: true,
    },
    approvedBy: {
      type: Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
    approvedAt: {
      type: Date,
      default: null,
    },
    processedBy: {
      type: Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
    processedAt: {
      type: Date,
      default: null,
    },
    createdBy: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    updatedBy: {
      type: Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
    isDeleted: {
      type: Boolean,
      default: false,
      index: true,
    },
    deletedAt: {
      type: Date,
      default: null,
    },
    deletedBy: {
      type: Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
  },
  {
    timestamps: true,
    versionKey: false,
  }
);

// Soft Delete Query Helper Middleware
PurchaseReturnSchema.query.withDeleted = function () {
  return this.setOptions({ withDeleted: true });
};

PurchaseReturnSchema.pre(/^find/, function (next) {
  if (this.getOptions().withDeleted) {
    return next();
  }
  this.where({ isDeleted: false });
  next();
});

// 12.2-C Operational Query Compound Indexes
PurchaseReturnSchema.index({ supplierId: 1, createdAt: -1 });
PurchaseReturnSchema.index({ purchaseId: 1, createdAt: -1 });
PurchaseReturnSchema.index({ goodsReceiptId: 1, createdAt: -1 });
PurchaseReturnSchema.index({ status: 1, createdAt: -1 });
PurchaseReturnSchema.index({ returnType: 1, createdAt: -1 });

export const PurchaseReturn = model("PurchaseReturn", PurchaseReturnSchema);

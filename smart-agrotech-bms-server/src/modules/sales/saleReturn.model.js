import mongoose from "mongoose";

const { Schema, model } = mongoose;

/**
 * Phase 13.2 — Customer Return Item Snapshot Schema
 * Captures historical context tracing back to origin sale invoice lines.
 */
const SaleReturnItemSchema = new Schema(
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
    saleItemId: {
      type: Schema.Types.ObjectId, // Direct line trace back to original Sale item row
      required: true,
    },
    soldQuantity: {
      type: Number,
      required: true,
      min: [1, "Sold quantity snapshot must be at least 1."],
    },
    returnQuantity: {
      type: Number,
      required: true,
      min: [1, "Return quantity must be at least 1."],
    },
    unitPrice: {
      type: Number, // Commercial selling price snapshot from origin invoice
      required: true,
      min: [0, "Unit price cannot be negative."],
    },
    lineTotal: {
      type: Number,
      required: true,
      min: [0, "Line total cannot be negative."],
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
 * Phase 13.2 — Exchange Replacement Item Snapshot Schema (EXCHANGE only)
 */
const SaleReplacementItemSchema = new Schema(
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
    unitPrice: {
      type: Number, // Current selling price of the replacement product
      required: true,
      min: [0, "Replacement unit price cannot be negative."],
    },
    lineTotal: {
      type: Number,
      required: true,
      min: [0, "Replacement line total cannot be negative."],
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
 * Main SaleReturn Collection Schema
 */
const SaleReturnSchema = new Schema(
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
      index: true, // e.g., SRRET-2026-000001 or SREXCH-2026-000001
    },
    customerId: {
      type: Schema.Types.ObjectId,
      ref: "Customer",
      required: true,
      index: true,
    },
    saleId: {
      type: Schema.Types.ObjectId,
      ref: "Sale", // Explicitly traceable to the origin Sale invoice
      required: true,
      index: true,
    },
    warehouseId: {
      type: Schema.Types.ObjectId,
      ref: "Warehouse", // The destination warehouse receiving the returned items
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
      type: [SaleReturnItemSchema],
      required: true,
      validate: {
        validator: (items) => items && items.length > 0,
        message: "At least one return item row is required.",
      },
    },
    replacementItems: {
      type: [SaleReplacementItemSchema],
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
      min: [1, "Total return count must be greater than zero."],
    },
    totalAmount: {
      type: Number,
      required: true,
      min: [0, "Total return commercial amount cannot be negative."],
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
    // Multi-Stage Workflow Audit Metadata Fields
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
    // System Creation Trails
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

// Global Soft-Delete Query Filtering Middleware
SaleReturnSchema.query.withDeleted = function () {
  return this.setOptions({ withDeleted: true });
};

SaleReturnSchema.pre(/^find/, function (next) {
  if (this.getOptions().withDeleted) {
    return next();
  }
  this.where({ isDeleted: false });
  next();
});

// Operational High-Performance Compound Queries Indexes
SaleReturnSchema.index({ customerId: 1, createdAt: -1 });
SaleReturnSchema.index({ saleId: 1, createdAt: -1 });
SaleReturnSchema.index({ warehouseId: 1, createdAt: -1 });
SaleReturnSchema.index({ status: 1, createdAt: -1 });
SaleReturnSchema.index({ returnType: 1, createdAt: -1 });

export const SaleReturn = model("SaleReturn", SaleReturnSchema);

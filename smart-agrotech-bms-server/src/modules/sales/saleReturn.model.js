import mongoose from "mongoose";
import {
  SALE_RETURN_TYPE,
  SALE_RETURN_STATUS,
} from "./saleReturn.constants.js";

const { Schema, model } = mongoose;

/**
 * ============================================================
 * SALES RETURN ITEM SCHEMA (Outbound Customer Returns)
 * ============================================================
 * Immutable historical snapshot traced to the exact original Sale Item line.
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
      trim: true,
    },
    skuSnapshot: {
      type: String,
      required: true,
      trim: true,
    },
    originalSaleItemId: {
      type: Schema.Types.ObjectId, // Maps precisely to the individual product subdocument row _id inside the Sale
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
      min: [1, "Customer return quantity must be at least 1."],
    },
    unitPrice: {
      type: Number, // Historical commercial selling price from the original invoice line
      required: true,
      min: [0, "Unit price cannot be negative."],
    },
    unitCost: {
      type: Number, // Historical cost-basis snapshot from the original invoice line (for future profit/margin audits)
      required: true,
      min: [0, "Unit cost cannot be negative."],
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
 * ============================================================
 * SALES EXCHANGE REPLACEMENT ITEM SCHEMA (EXCHANGE Only)
 * ============================================================
 * Tracking parameters for incoming alternative items dispatched to the client.
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
      trim: true,
    },
    skuSnapshot: {
      type: String,
      required: true,
      trim: true,
    },
    quantity: {
      type: Number,
      required: true,
      min: [1, "Replacement quantity must be at least 1."],
    },
    unitPrice: {
      type: Number, // Base commercial selling price of the replacement product
      required: true,
      min: [0, "Replacement unit price cannot be negative."],
    },
    unitCost: {
      type: Number, // Current purchase price cost-basis snapshot for financial balancing
      required: true,
      min: [0, "Replacement unit cost cannot be negative."],
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
 * ============================================================
 * MAIN SALES RETURN / EXCHANGE DOCUMENT SCHEMA
 * ============================================================
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
      index: true, // e.g., SRET-000001
    },
    customerId: {
      type: Schema.Types.ObjectId,
      ref: "Customer",
      required: true,
      index: true,
    },
    saleId: {
      type: Schema.Types.ObjectId,
      ref: "Sale",
      required: true,
      index: true,
    },
    warehouseId: {
      type: Schema.Types.ObjectId,
      ref: "Warehouse", // The destination location where stock returns are processed
      required: true,
      index: true,
    },
    returnType: {
      type: String,
      enum: Object.values(SALE_RETURN_TYPE),
      required: true,
      index: true,
    },
    items: {
      type: [SaleReturnItemSchema],
      required: true,
      validate: {
        validator: (items) => items && items.length > 0,
        message: "At least one returned item is required.",
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
      min: [1, "Total quantity physically returned must be at least 1."],
    },
    totalAmount: {
      type: Number,
      required: true,
      min: [0, "Commercial value total cannot be negative."],
    },
    status: {
      type: String,
      enum: Object.values(SALE_RETURN_STATUS),
      default: "DRAFT",
      index: true,
    },
    // Workflow Audit Footprints
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
    // Document Lifecycle Audit Tracks
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

// Pre-Query Hook Integration for Soft Deletion Layers
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

// High-Performance Business Database Query Lookup Indexes
SaleReturnSchema.index({ customerId: 1, createdAt: -1 });
SaleReturnSchema.index({ saleId: 1, createdAt: -1 });
SaleReturnSchema.index({ warehouseId: 1, createdAt: -1 });
SaleReturnSchema.index({ status: 1, createdAt: -1 });
SaleReturnSchema.index({ returnType: 1, createdAt: -1 });
SaleReturnSchema.index({ customerId: 1, warehouseId: 1, createdAt: -1 });

export const SaleReturn = model("SaleReturn", SaleReturnSchema);

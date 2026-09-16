import mongoose from "mongoose";
import { PURCHASE_RETURN_TYPE, PURCHASE_RETURN_STATUS } from "./purchaseReturn.constants.js";

const { Schema, model } = mongoose;

const returnItemSnapshotSchema = new Schema(
  {
    productId: {
      type: Schema.Types.ObjectId,
      ref: "Product",
      required: true,
    },
    productName: {
      type: String,
      required: true,
      trim: true,
    },
    sku: {
      type: String,
      required: true,
      trim: true,
    },
    purchaseItemId: {
      type: Schema.Types.ObjectId, // Direct line trace back to origin item row [Page 3]
      required: true,
    },
    receivedQuantity: {
      type: Number,
      required: true,
      min: [0, "Received lot quantity snapshots cannot be negative."],
    },
    returnQuantity: {
      type: Number,
      required: true,
      min: [1, "Return item quantities must be at least 1."],
    },
    unitCost: {
      type: Schema.Types.Decimal128, // Matches Decimal128 procurement ledger standard [Page 7]
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
  },
  { _id: true }
);

const replacementItemSnapshotSchema = new Schema(
  {
    productId: {
      type: Schema.Types.ObjectId,
      ref: "Product",
      required: true,
    },
    productName: {
      type: String,
      required: true,
      trim: true,
    },
    sku: {
      type: String,
      required: true,
      trim: true,
    },
    quantity: {
      type: Number,
      required: true,
      min: [1, "Replacement item quantities must be at least 1."],
    },
    unitCost: {
      type: Schema.Types.Decimal128,
      required: true,
    },
    lineTotal: {
      type: Schema.Types.Decimal128,
      required: true,
    },
  },
  { _id: true }
);

const purchaseReturnSchema = new Schema(
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
      index: true, // e.g., PR-2026-000001 [Page 2, 9]
    },
    supplierId: {
      type: Schema.Types.ObjectId,
      ref: "Supplier",
      required: true,
      index: true,
    },
    purchaseId: {
      type: Schema.Types.ObjectId,
      ref: "PurchaseOrder", // Linked back to origin procurement row [Page 2]
      required: true,
      index: true,
    },
    goodsReceiptId: {
      type: Schema.Types.ObjectId,
      ref: "GoodsReceipt", // Linked back to origin material receipt row [Page 2, 3]
      required: true,
      index: true,
    },
    returnType: {
      type: String,
      enum: Object.values(PURCHASE_RETURN_TYPE),
      required: true,
      index: true,
    },
    items: [returnItemSnapshotSchema], // Outbound defective items snapshots [Page 8]
    replacementItems: [replacementItemSnapshotSchema], // Inbound replacement items snapshots [Page 5, 8]
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
      type: Schema.Types.Decimal128,
      required: true,
    },
    status: {
      type: String,
      enum: Object.values(PURCHASE_RETURN_STATUS),
      default: PURCHASE_RETURN_STATUS.DRAFT,
      index: true,
    },
    // Multi-Stage Authorization Tracking Fields [Page 2, 9]
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
    // User Audit Fields [Page 2, 9]
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

// Soft Delete Middleware Engine Layer Integration [Page 9]
purchaseReturnSchema.query.withDeleted = function () {
  return this.setOptions({ withDeleted: true });
};

purchaseReturnSchema.pre(/^find/, function () {
  if (!this.getOptions().withDeleted) {
    this.where({ isDeleted: false });
  }
});

// Structural High-Performance Compound Indexes [Page 9]
purchaseReturnSchema.index({ supplierId: 1, createdAt: -1 });
purchaseReturnSchema.index({ purchaseId: 1, createdAt: -1 });
purchaseReturnSchema.index({ status: 1, createdAt: -1 });

export const PurchaseReturn = model("PurchaseReturn", purchaseReturnSchema);

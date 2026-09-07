import mongoose from "mongoose";

const { Schema, model } = mongoose;

const InventoryTransactionSchema = new Schema(
  {
    productId: {
      type: Schema.Types.ObjectId,
      ref: "Product",
      required: true,
      index: true,
    },
    warehouseId: {
      type: Schema.Types.ObjectId,
      ref: "Warehouse",
      required: true,
      index: true,
    },
    // Positive = stock enters warehouse | Negative = stock leaves warehouse
    quantity: {
      type: Number,
      required: true,
    },
    transactionType: {
      type: String,
      required: true,
      index: true,
    },
    /*
     * Polymorphic Traceability:
     * referenceType + referenceId mapping
     * Examples: GOODS_RECEIPT + grn._id, SALE + sale._id
     */
    referenceType: {
      type: String,
      required: true,
      index: true,
    },
    referenceId: {
      type: Schema.Types.ObjectId,
      required: true,
      index: true,
    },
    /*
     * Financial Ledger Cost tracking anchor.
     * Note: Outbound sales transactions map historical unit purchase price (cost-basis) 
     * here to safely compute COGS downstream, rather than commercial selling price.
     */
    unitCost: {
      type: Schema.Types.Decimal128,
      required: true,
    },
    batchNumber: {
      type: String,
      trim: true,
      default: null,
    },
    serialNumbers: {
      type: [String],
      default: [],
    },
    postedBy: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
  },
  {
    timestamps: true,
    versionKey: false,
  }
);

// High-performance operational compound indexes
InventoryTransactionSchema.index({
  productId: 1,
  warehouseId: 1,
  createdAt: -1,
});

InventoryTransactionSchema.index({
  referenceType: 1,
  referenceId: 1,
});

export const InventoryTransaction = model(
  "InventoryTransaction",
  InventoryTransactionSchema
);

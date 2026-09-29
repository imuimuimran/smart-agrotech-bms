import mongoose from "mongoose";
import {
  RETURN_FINANCIAL_SOURCE,
  RETURN_FINANCIAL_TYPE,
  RETURN_FINANCIAL_DIRECTION,
  RETURN_FINANCIAL_STATUS,
} from "./returnFinancialReconciliation.constants.js";

const { Schema } = mongoose;

const returnFinancialReconciliationSchema = new Schema(
  {
    publicId: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    reconciliationNumber: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    // ---------------------------------------------------------
    // Source Return Tracking Parameters
    // ---------------------------------------------------------
    sourceType: {
      type: String,
      required: true,
      enum: Object.values(RETURN_FINANCIAL_SOURCE),
      index: true,
    },
    sourceReturnId: {
      type: Schema.Types.ObjectId,
      required: true,
      index: true,
    },
    sourceReturnPublicId: {
      type: String,
      required: true,
      index: true,
    },
    sourceReturnNumber: {
      type: String,
      required: true,
      index: true,
    },
    returnType: {
      type: String,
      required: true,
      enum: Object.values(RETURN_FINANCIAL_TYPE),
      index: true,
    },
    // ---------------------------------------------------------
    // Original Immutable Commercial Transaction Links
    // ---------------------------------------------------------
    saleId: {
      type: Schema.Types.ObjectId,
      ref: "Sale",
      default: null,
      index: true,
    },
    purchaseId: {
      type: Schema.Types.ObjectId,
      ref: "Purchase",
      default: null,
      index: true,
    },
    // ---------------------------------------------------------
    // Associated Business Parties
    // ---------------------------------------------------------
    customerId: {
      type: Schema.Types.ObjectId,
      ref: "Customer",
      default: null,
      index: true,
    },
    supplierId: {
      type: Schema.Types.ObjectId,
      ref: "Supplier",
      default: null,
      index: true,
    },
    // ---------------------------------------------------------
    // Double-Entry Accounting Direction
    // ---------------------------------------------------------
    direction: {
      type: String,
      required: true,
      enum: Object.values(RETURN_FINANCIAL_DIRECTION),
      index: true,
    },
    // ---------------------------------------------------------
    // Financial Cost Snapshot Sub-ledgers
    // ---------------------------------------------------------
    returnAmount: {
      type: Schema.Types.Decimal128,
      required: true,
      validate: {
        validator: (value) => Number(value.toString()) >= 0,
        message: "Return amount cannot be negative.",
      },
    },
    replacementAmount: {
      type: Schema.Types.Decimal128,
      required: true,
      default: "0.00",
      validate: {
        validator: (value) => Number(value.toString()) >= 0,
        message: "Replacement amount cannot be negative.",
      },
    },
    adjustmentAmount: {
      type: Schema.Types.Decimal128,
      required: true,
      default: "0.00",
    },
    // ---------------------------------------------------------
    // Real-time Balance Snapshot Changes
    // ---------------------------------------------------------
    previousBalance: {
      type: Schema.Types.Decimal128,
      required: true,
      default: "0.00",
    },
    balanceAdjustment: {
      type: Schema.Types.Decimal128,
      required: true,
      default: "0.00",
    },
    resultingBalance: {
      type: Schema.Types.Decimal128,
      required: true,
      default: "0.00",
    },
    // ---------------------------------------------------------
    // Accounting Lifecycle State
    // ---------------------------------------------------------
    status: {
      type: String,
      required: true,
      enum: Object.values(RETURN_FINANCIAL_STATUS),
      default: RETURN_FINANCIAL_STATUS.POSTED,
      index: true,
    },
    reconciledAt: {
      type: Date,
      required: true,
      default: Date.now,
    },
    reconciledBy: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    remarks: {
      type: String,
      trim: true,
      default: "",
    },
  },
  {
    timestamps: true,
    versionKey: false,
  }
);

/**
 * ============================================================
 * PERFORMANCE / CRITICAL IDEMPOTENCY INDEXES
 * ============================================================
 */

// Critical Constraint: One source return can only hold exactly ONE posted reconciliation event.
returnFinancialReconciliationSchema.index(
  {
    sourceType: 1,
    sourceReturnId: 1,
  },
  {
    unique: true,
  }
);

returnFinancialReconciliationSchema.index({ customerId: 1, createdAt: -1 });
returnFinancialReconciliationSchema.index({ supplierId: 1, createdAt: -1 });
// returnFinancialReconciliationSchema.index({ saleId: 1 });
// returnFinancialReconciliationSchema.index({ purchaseId: 1 });

const ReturnFinancialReconciliation = mongoose.model(
  "ReturnFinancialReconciliation",
  returnFinancialReconciliationSchema
);

export default ReturnFinancialReconciliation;

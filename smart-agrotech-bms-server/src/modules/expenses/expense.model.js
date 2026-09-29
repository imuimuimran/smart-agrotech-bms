import mongoose from "mongoose";
import {
  EXPENSE_CATEGORY_LIST,
  EXPENSE_PAYMENT_METHOD_LIST,
  EXPENSE_STATUS,
  EXPENSE_STATUS_LIST,
} from "./expense.constants.js";

const { Schema, model } = mongoose;

const expenseSchema = new Schema(
  {
    publicId: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      index: true,
    },
    expenseNumber: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      index: true, // e.g., EXP-2026-000001
    },
    category: {
      type: String,
      enum: EXPENSE_CATEGORY_LIST,
      required: true,
      index: true,
    },
    amount: {
      type: Schema.Types.Decimal128, // Matches money guidelines exactly
      required: true,
      validate: {
        validator: (value) => Number(value.toString()) > 0,
        message: "Expense spending allocations must be greater than zero.",
      },
    },
    expenseDate: {
      type: Date,
      required: true,
      index: true,
    },
    paymentMethod: {
      type: String,
      enum: EXPENSE_PAYMENT_METHOD_LIST,
      required: true,
      index: true,
    },
    reference: {
      type: String,
      trim: true,
      default: "",
    },
    description: {
      type: String,
      trim: true,
      default: "",
    },
    status: {
      type: String,
      enum: EXPENSE_STATUS_LIST,
      default: EXPENSE_STATUS.ACTIVE,
      index: true,
    },
    // Server-Controlled Operational Audit Tracks
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

// Global Soft-Delete Query Filtering Layer
expenseSchema.query.withDeleted = function () {
  return this.setOptions({ withDeleted: true });
};

expenseSchema.pre(/^find/, function (next) {
  if (this.getOptions().withDeleted) {
    return next();
  }
  this.where({ isDeleted: false });
  next();
});

// High-Performance Reporting Compound Indexes
expenseSchema.index({ category: 1, expenseDate: -1 });
expenseSchema.index({ paymentMethod: 1, expenseDate: -1 });
expenseSchema.index({ status: 1, expenseDate: -1 });

export const Expense = model("Expense", expenseSchema);
export default Expense;

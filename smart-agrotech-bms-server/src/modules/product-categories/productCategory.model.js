import mongoose from "mongoose";
import {
  CATEGORY_STATUS,
  DEFAULT_CATEGORY_LEVEL,
  DEFAULT_SORT_ORDER,
} from "./productCategory.constants.js";

const { Schema, model } = mongoose;

const productCategorySchema = new Schema(
  {
    publicId: {
      type: String,
      required: true,
      unique: true,
      trim: true,
    },

    categoryName: {
      type: String,
      required: true,
      unique: true,
      trim: true,
    },

    categoryCode: {
      type: String,
      required: true,
      unique: true,
      uppercase: true,
      trim: true,
    },

    description: {
      type: String,
      default: "",
      trim: true,
    },

    image: {
      type: String,
      default: "",
    },

    // Parent Category Tree Setup
    parentCategory: {
      type: Schema.Types.ObjectId,
      ref: "ProductCategory",
      default: null,
    },

    level: {
      type: Number,
      default: DEFAULT_CATEGORY_LEVEL,
      min: 0,
    },

    // Sorting & Status Configuration
    sortOrder: {
      type: Number,
      default: DEFAULT_SORT_ORDER,
    },

    status: {
      type: String,
      enum: Object.values(CATEGORY_STATUS),
      default: CATEGORY_STATUS.ACTIVE,
    },

    // Soft Delete Architecture
    isDeleted: {
      type: Boolean,
      default: false,
    },

    deletedAt: {
      type: Date,
      default: null,
    },

    deletedBy: {
      type: String,
      default: null,
    },

    // System Audit Fields
    createdBy: {
      type: String,
      required: true,
    },

    updatedBy: {
      type: String,
      required: true,
    },
  },
  {
    timestamps: true,
    versionKey: false,
    // Enable virtual fields to serialize into JSON and plain objects
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// Global Query Middleware for Soft Delete Isolation
productCategorySchema.pre(/^find/, function () {
  this.find({ isDeleted: false });
});

// Text Optimization & Performance Lookup Indexes
productCategorySchema.index({
  categoryName: "text",
  description: "text",
});

// productCategorySchema.index({ categoryCode: 1 });
productCategorySchema.index({ parentCategory: 1 });
productCategorySchema.index({ status: 1 });

// Root Layer Verification Virtual Property
productCategorySchema.virtual("isRootCategory").get(function () {
  return this.parentCategory === null;
});

// Export Enterprise Model Setup
const ProductCategory = model("ProductCategory", productCategorySchema);

export default ProductCategory;

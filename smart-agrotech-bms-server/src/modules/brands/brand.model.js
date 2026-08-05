import mongoose from "mongoose";
import { BRAND_STATUS } from "./brand.constants.js";

const { Schema, model } = mongoose;

const brandSchema = new Schema(
  {
    // Enterprise Identifier (e.g., BRD-100001)
    publicId: {
      type: String,
      required: true,
      unique: true,
      trim: true,
    },

    // Unique display name of the manufacturer/trademark
    brandName: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      maxlength: 100,
    },

    // Unique alphanumeric shorthand code (e.g., SMS, APL)
    brandCode: {
      type: String,
      required: true,
      unique: true,
      uppercase: true,
      trim: true,
      maxlength: 20,
    },

    description: {
      type: String,
      default: "",
      trim: true,
      maxlength: 500,
    },

    // Public asset URL hosting the logo image
    logo: {
      type: String,
      default: "",
      trim: true,
    },

    website: {
      type: String,
      default: "",
      trim: true,
    },

    country: {
      type: String,
      default: "",
      trim: true,
      maxlength: 100,
    },

    // Centralized status configuration (active / inactive)
    status: {
      type: String,
      enum: Object.values(BRAND_STATUS),
      default: BRAND_STATUS.ACTIVE,
    },

    // Soft Delete Fields
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

    // Audit Fields
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
    // Enable virtual fields to map during serialization cycles
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// Enterprise soft delete query engine modification bypass rule helper
brandSchema.query.withDeleted = function () {
  return this.setOptions({ withDeleted: true });
};

// Global Query Middleware for Soft Delete Isolation
brandSchema.pre(/^find/, function () {
  if (!this.getOptions().withDeleted) {
    this.where({ isDeleted: false });
  }
});

// Performance Lookup Indexes
brandSchema.index({
  brandName: "text",
  description: "text",
});

// Note: brandCode is automatically indexed via unique: true above
brandSchema.index({ status: 1 });
brandSchema.index({ country: 1 });

// Website Presence Checker Virtual Property
brandSchema.virtual("hasWebsite").get(function () {
  return Boolean(this.website);
});

// Export Model Configuration
const Brand = model("Brand", brandSchema);

export default Brand;

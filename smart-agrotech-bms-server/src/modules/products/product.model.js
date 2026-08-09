import mongoose from "mongoose";

const { Schema, model } = mongoose;

/**
 * Product Image Sub-Schema
 * Embedded array document storage for product assets
 */
const productImageSchema = new Schema(
  {
    url: {
      type: String,
      required: true,
      trim: true,
    },
    alt: {
      type: String,
      trim: true,
      default: "",
    },
    isPrimary: {
      type: Boolean,
      default: false,
    },
  },
  {
    _id: false, // Prevents creating unnecessary nested ObjectIds for asset structures
  }
);

/**
 * Main Product Schema
 */
const productSchema = new Schema(
  {
    // -------------------------
    // Product Identity
    // -------------------------
    publicId: {
      type: String,
      required: true,
      unique: true,
      index: true,
      trim: true,
    },
    productName: {
      type: String,
      required: true,
      trim: true,
    },
    productCode: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      uppercase: true,
    },
    sku: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      uppercase: true,
    },
    barcode: {
      type: String,
      unique: true,
      sparse: true, // Prevents unique check failures on empty values
      trim: true,
    },

    // -------------------------
    // Classification Relationships
    // -------------------------
    categoryId: {
      type: Schema.Types.ObjectId,
      ref: "ProductCategory", // Points to your newly built category collection model
      required: true,
      index: true,
    },
    brandId: {
      type: Schema.Types.ObjectId,
      ref: "Brand", // Points to your newly built brand collection model
      required: true,
      index: true,
    },
    productType: {
      type: String,
      enum: ["physical", "service", "digital"],
      default: "physical",
      index: true,
    },

    // -------------------------
    // Description
    // -------------------------
    shortDescription: {
      type: String,
      trim: true,
      maxlength: 500,
      default: "",
    },
    description: {
      type: String,
      trim: true,
      default: "",
    },

    // -------------------------
    // Unit Configuration
    // -------------------------
    unit: {
      type: String,
      required: true,
      trim: true,
    },
    unitConversion: {
      baseUnit: {
        type: String,
        trim: true,
      },
      conversionFactor: {
        type: Number,
        min: 0,
        default: 1,
      },
    },

    // -------------------------
    // Pricing (Isolated Structure)
    // -------------------------
    pricing: {
      purchasePrice: {
        type: Number,
        required: true,
        min: 0,
      },
      sellingPrice: {
        type: Number,
        required: true,
        min: 0,
      },
      minimumSellingPrice: {
        type: Number,
        required: true,
        min: 0,
      },
    },

    // -------------------------
    // Tax Configuration
    // -------------------------
    tax: {
      taxType: {
        type: String,
        enum: ["none", "percentage", "fixed"],
        default: "none",
      },
      taxRate: {
        type: Number,
        min: 0,
        default: 0,
      },
    },

    // -------------------------
    // Inventory Threshold Rules Configuration
    // -------------------------
    inventoryConfig: {
      trackInventory: {
        type: Boolean,
        default: true,
      },
      minimumStockLevel: {
        type: Number,
        min: 0,
        default: 0,
      },
      maximumStockLevel: {
        type: Number,
        min: 0,
        default: 0,
      },
      reorderLevel: {
        type: Number,
        min: 0,
        default: 0,
      },
    },

    // -------------------------
    // Media Attachments
    // -------------------------
    images: {
      type: [productImageSchema],
      default: [],
    },

    // -------------------------
    // Status Lifecycle States
    // -------------------------
    status: {
      type: String,
      enum: ["active", "inactive", "discontinued"],
      default: "active",
      index: true,
    },

    // -------------------------
    // Enterprise Soft Delete & Audit Fields
    // -------------------------
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
      type: String, // String mapping to align with reqUser.publicId pattern
      default: null,
    },
    createdBy: {
      type: String, // String mapping to align with reqUser.publicId pattern
      required: true,
    },
    updatedBy: {
      type: String, // String mapping to align with reqUser.publicId pattern
      default: null,
    },
  },
  {
    timestamps: true, // Automatically handles createdAt and updatedAt
  }
);

// -------------------------
// Query Middleware & helpers
// -------------------------
productSchema.query.withDeleted = function () {
  return this.setOptions({ withDeleted: true });
};

productSchema.pre(/^find/, function () {
  if (!this.getOptions().withDeleted) {
    this.where({ isDeleted: false });
  }
});

// -------------------------
// Enterprise Performance Indexes
// -------------------------
productSchema.index({ productName: 1 });
productSchema.index({ categoryId: 1, brandId: 1 });
productSchema.index({ status: 1, isDeleted: 1 });
// productSchema.index({ sku: 1 });
// productSchema.index({ barcode: 1 });

const Product = model("Product", productSchema);

export default Product;

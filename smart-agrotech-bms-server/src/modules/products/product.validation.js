import { z } from "zod";

/**
 * Reusable ObjectId Validation
 * Verifies hex format integrity before hit queries to MongoDB Atlas
 */
const objectIdSchema = z
  .string()
  .regex(/^[0-9a-fA-F]{24}$/, "Invalid MongoDB ObjectId.");

/**
 * Product Image Validation Sub-Schema Shape
 */
const productImageSchema = z.object({
  url: z
    .string()
    .trim()
    .url("Invalid image URL."),
  alt: z
    .string()
    .trim()
    .max(200, "Image alt text cannot exceed 200 characters.")
    .optional()
    .default(""),
  isPrimary: z
    .boolean()
    .optional()
    .default(false),
});

// =========================================================================
// DEFINE BASE OBJECT SCHEMAS FIRST (Ensures clean access for updates)
// =========================================================================

const basePricingSchema = z.object({
  purchasePrice: z
    .number()
    .min(0, "Purchase price cannot be negative."),
  sellingPrice: z
    .number()
    .min(0, "Selling price cannot be negative."),
  minimumSellingPrice: z
    .number()
    .min(0, "Minimum selling price cannot be negative."),
});

const baseTaxSchema = z.object({
  taxType: z.enum(["none", "percentage", "fixed"]),
  taxRate: z.number().min(0, "Tax rate cannot be negative."),
});

const baseInventoryConfigSchema = z.object({
  trackInventory: z.boolean().optional().default(true),
  minimumStockLevel: z
    .number()
    .min(0, "Minimum stock level cannot be negative.")
    .optional()
    .default(0),
  maximumStockLevel: z
    .number()
    .min(0, "Maximum stock level cannot be negative.")
    .optional()
    .default(0),
  reorderLevel: z
    .number()
    .min(0, "Reorder level cannot be negative.")
    .optional()
    .default(0),
});

// =========================================================================
// APPLY SUPER-REFINEMENTS FOR CREATION LAYERS
// =========================================================================

const pricingSchema = basePricingSchema.superRefine((pricing, ctx) => {
  if (pricing.sellingPrice < pricing.minimumSellingPrice) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["sellingPrice"],
      message: "Selling price cannot be lower than minimum selling price.",
    });
  }
});

const taxSchema = baseTaxSchema.superRefine((tax, ctx) => {
  if (tax.taxType === "none" && tax.taxRate !== 0) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["taxRate"],
      message: "Tax rate must be 0 when tax type is none.",
    });
  }
  if (tax.taxType === "percentage" && tax.taxRate > 100) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["taxRate"],
      message: "Percentage tax rate cannot exceed 100.",
    });
  }
});

const inventoryConfigSchema = baseInventoryConfigSchema.superRefine((inventory, ctx) => {
  if (
    inventory.maximumStockLevel > 0 &&
    inventory.minimumStockLevel > inventory.maximumStockLevel
  ) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["minimumStockLevel"],
      message: "Minimum stock level cannot exceed maximum stock level.",
    });
  }
  if (inventory.reorderLevel < inventory.minimumStockLevel) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["reorderLevel"],
      message: "Reorder level should not be below minimum stock level.",
    });
  }
});

/**
 * Main Product Creation Schema
 */
export const createProductSchema = z.object({
  body: z.object({
    productName: z
      .string()
      .trim()
      .min(2, "Product name must contain at least 2 characters.")
      .max(150, "Product name cannot exceed 150 characters."),
    productCode: z
      .string()
      .trim()
      .min(2, "Product code is required.")
      .max(50, "Product code cannot exceed 50 characters.")
      .regex(
        /^[A-Za-z0-9_-]+$/,
        "Product code may contain only letters, numbers, hyphens and underscores."
      ),
    sku: z
      .string()
      .trim()
      .min(2, "SKU is required.")
      .max(80, "SKU cannot exceed 80 characters.")
      .regex(
        /^[A-Za-z0-9_-]+$/,
        "SKU may contain only letters, numbers, hyphens and underscores."
      ),
    barcode: z
      .string()
      .trim()
      .min(4, "Barcode is too short.")
      .max(50, "Barcode cannot exceed 50 characters.")
      .optional(),
    categoryId: objectIdSchema,
    brandId: objectIdSchema,
    productType: z.enum(["physical", "service", "digital"]).default("physical"),
    shortDescription: z
      .string()
      .trim()
      .max(500, "Short description cannot exceed 500 characters.")
      .optional()
      .default(""),
    description: z.string().trim().optional().default(""),
    unit: z
      .string()
      .trim()
      .min(1, "Unit is required.")
      .max(30, "Unit cannot exceed 30 characters."),
    unitConversion: z
      .object({
        baseUnit: z.string().trim().max(30).optional(),
        conversionFactor: z
          .number()
          .positive("Conversion factor must be greater than 0.")
          .optional()
          .default(1),
      })
      .optional(),
    pricing: pricingSchema,
    tax: taxSchema.default({
      taxType: "none",
      taxRate: 0,
    }),
    inventoryConfig: inventoryConfigSchema.default({
      trackInventory: true,
      minimumStockLevel: 0,
      maximumStockLevel: 0,
      reorderLevel: 0,
    }),
    images: z
      .array(productImageSchema)
      .max(20, "A product cannot have more than 20 images.")
      .optional()
      .default([]),
    status: z.enum(["active", "inactive", "discontinued"]).default("active"),
  }),
});

// =========================================================================
// ENTERPRISE EXPLICIT NESTED PARTIAL UPDATE SCHEMA
// =========================================================================
const updatePricingSchema = basePricingSchema.partial();
const updateTaxSchema = baseTaxSchema.partial();
const updateInventoryConfigSchema = baseInventoryConfigSchema.partial();

const updateUnitConversionSchema = z.object({
  baseUnit: z.string().trim().max(30).optional(),
  conversionFactor: z.number().positive().optional(),
});

export const updateProductSchema = z.object({
  body: z.object({
    productName: z.string().trim().min(2).max(150).optional(),
    productCode: z
      .string()
      .trim()
      .min(2)
      .max(50)
      .regex(/^[A-Za-z0-9_-]+$/)
      .optional(),
    sku: z
      .string()
      .trim()
      .min(2)
      .max(80)
      .regex(/^[A-Za-z0-9_-]+$/)
      .optional(),
    barcode: z.string().trim().min(4).max(50).optional(),
    categoryId: objectIdSchema.optional(),
    brandId: objectIdSchema.optional(),
    productType: z.enum(["physical", "service", "digital"]).optional(),
    shortDescription: z.string().trim().max(500).optional(),
    description: z.string().trim().optional(),
    unit: z.string().trim().min(1).max(30).optional(),
    unitConversion: updateUnitConversionSchema.optional(),
    pricing: updatePricingSchema.optional(),
    tax: updateTaxSchema.optional(),
    inventoryConfig: updateInventoryConfigSchema.optional(),
    images: z.array(productImageSchema).max(20).optional(),
    status: z.enum(["active", "inactive", "discontinued"]).optional(),
  }),
});

/**
 * Product Listing Query Schema
 * Handles query string verification, auto-coercion, and cross-field price refinement
 */
export const productListQuerySchema = z
  .object({
    search: z
      .string()
      .trim()
      .max(100, "Search term cannot exceed 100 characters.")
      .optional(),
    categoryId: z
      .string()
      .regex(/^[0-9a-fA-F]{24}$/, "Invalid Category ID format.")
      .optional(),
    brandId: z
      .string()
      .regex(/^[0-9a-fA-F]{24}$/, "Invalid Brand ID format.")
      .optional(),
    productType: z.enum(["physical", "service", "digital"]).optional(),
    status: z.enum(["active", "inactive", "discontinued"]).optional(),
    unit: z.string().trim().max(30).optional(),
    minPrice: z.coerce
      .number()
      .min(0, "Minimum price cannot be negative.")
      .optional(),
    maxPrice: z.coerce
      .number()
      .min(0, "Maximum price cannot be negative.")
      .optional(),
    page: z.coerce
      .number()
      .int()
      .min(1, "Page must be greater than or equal to 1.")
      .default(1),
    limit: z.coerce
      .number()
      .int()
      .min(1, "Limit must be at least 1.")
      .max(100, "Limit cannot exceed 100.")
      .default(20),
    sort: z.string().trim().optional(),
  })
  .superRefine((query, ctx) => {
    if (
      query.minPrice !== undefined &&
      query.maxPrice !== undefined &&
      query.minPrice > query.maxPrice
    ) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["minPrice"],
        message: "Minimum price cannot exceed maximum price.",
      });
    }
  });


/**
 * Product ID Parameter Validator
 * Prevents CastErrors from bubbling up by validating format structures beforehand
 */
export const productIdParamSchema = z.object({
  params: z.object({
    id: z
      .string()
      .regex(/^[0-9a-fA-F]{24}$/, "Invalid Product ID format. Must be a 24-character hex string."),
  }),
});


export {
  productImageSchema,
  pricingSchema,
  taxSchema,
  inventoryConfigSchema,
};

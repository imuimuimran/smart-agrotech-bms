// src/modules/purchases/purchase.validation.js
import { z } from "zod";

/**
 * Reusable ObjectId Validation
 * Verifies hex format integrity before hit queries to MongoDB Atlas
 */
const objectIdSchema = z
  .string()
  .regex(/^[0-9a-fA-F]{24}$/, "Invalid MongoDB ObjectId.");

// =========================================================================
// DEFINE REUSABLE SUB-SCHEMAS FIRST
// =========================================================================

const purchaseItemSchema = z.object({
  productId: objectIdSchema,
  orderedQuantity: z
    .number()
    .int("Quantity must be a whole integer.")
    .min(1, "Quantity must be greater than zero."), // Phase 9.4.14 Rule
  expectedUnitCost: z
    .number()
    .min(0, "Expected unit cost cannot be negative."), // Phase 9.4.15 Rule
  discount: z
    .number()
    .min(0, "Discount cannot be negative.")
    .optional()
    .default(0),
  tax: z
    .number()
    .min(0, "Tax rate cannot be negative.")
    .max(100, "Tax rate cannot exceed 100%.")
    .optional()
    .default(0),
});

// =========================================================================
// EXPORT MAIN PROCUREMENT SELECTION SCHEMAS
// =========================================================================

export const createPOSchema = z
  .object({
    supplierId: objectIdSchema,
    orderDate: z.preprocess((val) => (val ? new Date(val) : new Date()), z.date()),
    expectedDeliveryDate: z.preprocess((val) => new Date(val), z.date()),
    items: z
      .array(purchaseItemSchema)
      .min(1, "A Purchase Order with zero products should not be created."),
    shippingCost: z.number().min(0, "Shipping cost cannot be negative.").optional().default(0),
    otherCharges: z.number().min(0, "Other charges cannot be negative.").optional().default(0),
    notes: z.string().trim().catch("").optional().default(""),
  })
  .refine((data) => data.expectedDeliveryDate > data.orderDate, {
    message: "Expected delivery date must be subsequent to order date.", // Phase 9.4.7 Verification Rule
    path: ["expectedDeliveryDate"],
  });

export const updatePODraftSchema = z.object({
  expectedDeliveryDate: z
    .preprocess((val) => new Date(val), z.date())
    .refine((date) => date > new Date(), {
      message: "Expected delivery date must be in the future.",
    })
    .optional(),
  items: z.array(purchaseItemSchema).min(1, "Items array cannot be empty.").optional(),
  shippingCost: z.number().min(0, "Shipping cost cannot be negative.").optional(),
  otherCharges: z.number().min(0, "Other charges cannot be negative.").optional(),
  notes: z.string().trim().optional(),
});

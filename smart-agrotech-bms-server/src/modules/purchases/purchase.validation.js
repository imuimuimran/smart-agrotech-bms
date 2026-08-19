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
    .min(1, "Quantity must be greater than zero."), // Rule
  expectedUnitCost: z
    .number()
    .min(0, "Expected unit cost cannot be negative."), // Rule
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
    message: "Expected delivery date must be subsequent to order date.", // Verification Rule
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

export const poReviewStartSchema = z.object({
  comment: z.string().trim().optional()
});

export const poApprovalDecisionSchema = z.object({
  comment: z.string().trim().max(500, "Comment cannot exceed 500 characters.").optional()
});

export const poRejectionDecisionSchema = z.object({
  comment: z
    .string()
    .trim()
    .min(10, "A detailed rejection comment (minimum 10 characters) must be supplied.") // Rule
    .max(500, "Comment cannot exceed 500 characters.")
});

export const supplierResponseSubmissionSchema = z.object({
  responseType: z.nativeEnum(SUPPLIER_RESPONSE_TYPES),
  supplierReference: z.string().trim().max(100).optional(),
  message: z.string().trim().max(1000).optional(),
  responseChannel: z.nativeEnum(RESPONSE_CHANNELS).default('MANUAL'),
  receivedAt: z.preprocess((val) => (val ? new Date(val) : new Date()), z.date()),
  idempotencyKey: z.string().optional(),
  
  // Conditionally required if responseType === PARTIALLY_ACCEPTED
  items: z.array(z.object({
    productId: objectIdSchema,
    orderedQuantity: z.number().int().min(1),
    acceptedQuantity: z.number().int().min(0)
  })).optional(),

  // Conditionally required if responseType === AMENDMENT_REQUESTED
  requestedChanges: z.array(z.object({
    field: z.string().min(1),
    currentValue: z.string().min(1),
    requestedValue: z.string().min(1),
    reason: z.string().trim().max(500).optional()
  })).optional()
}).superRefine((data, ctx) => {
  if (data.responseType === 'PARTIALLY_ACCEPTED' && (!data.items || data.items.length === 0)) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Line item breakdowns are mandatory for partial acceptances.", path: ["items"] });
  }
  if (data.responseType === 'AMENDMENT_REQUESTED' && (!data.requestedChanges || data.requestedChanges.length === 0)) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Requested changes array details are required for amendments.", path: ["requestedChanges"] });
  }
}); 

export const createGoodsReceiptSchema = z.object({
  purchaseOrderId: objectIdSchema,
  warehouseId: objectIdSchema,
  supplierDeliveryReference: z.string().trim().min(1, "Supplier delivery reference note is required."),
  notes: z.string().trim().optional(),
  items: z.array(z.object({
    productId: objectIdSchema,
    receivedQuantity: z.number().int().min(0, "Received quantity cannot be negative.") 
  })).min(1, "Cannot create an empty goods receipt transaction.")
});

export const submitInspectionSchema = z.object({
  result: z.nativeEnum({
    PASSED: 'PASSED',
    PARTIALLY_PASSED: 'PARTIALLY_PASSED',
    FAILED: 'FAILED'
  }),
  checklist: z.array(z.object({
    criterion: z.string().min(1),
    passed: z.boolean()
  })),
  notes: z.string().trim().max(1000).optional(),
  items: z.array(z.object({
    productId: objectIdSchema,
    acceptedQuantity: z.number().int().min(0),
    rejectedQuantity: z.number().int().min(0),
    condition: z.enum(['NEW', 'DAMAGED', 'DEFECTIVE', 'INCORRECT']).default('NEW'),
    batchNumber: z.string().trim().optional(),
    serialNumbers: z.array(z.string().trim()).optional()
  })).min(1)
}).superRefine((data, ctx) => {
  // 9.8.25 Serial Number count enforcement validation rule
  data.items.forEach((item, idx) => {
    if (item.serialNumbers && item.serialNumbers.length > 0) {
      if (item.serialNumbers.length !== item.acceptedQuantity) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: `Serial number count (${item.serialNumbers.length}) must exactly equal accepted quantity (${item.acceptedQuantity}).`,
          path: ["items", idx, "serialNumbers"]
        });
      }
    }
  });
});
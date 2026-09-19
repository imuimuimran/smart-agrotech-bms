import { z } from "zod";
import {
  PURCHASE_RETURN_TYPE,
  PURCHASE_RETURN_TYPE_LIST,
} from "./purchaseReturn.constants.js";

// Reusable standard MongoDB ObjectId verification string matching project conventions
const objectIdSchema = z
  .string()
  .regex(/^[0-9a-fA-F]{24}\$/, "Invalid MongoDB ObjectId reference format.");

const positiveIntegerSchema = z
  .number()
  .int("Quantity must be an integer")
  .min(1, "Quantity must be at least 1");


const moneySchema = z
  .number()
  .finite("Amount must be a finite number")
  .min(0, "Monetary calculations cannot contain negative metrics.");

/**
 * Outbound Defective Lot Item Schema
 */
export const purchaseReturnItemSchema = z.object({
  productId: objectIdSchema,

  productNameSnapshot: z
    .string()
    .trim()
    .min(1, "Product name snapshot is required"),

  skuSnapshot: z
    .string()
    .trim()
    .min(1, "SKU snapshot is required"),

  purchaseItemId: objectIdSchema,

  goodsReceiptItemId: objectIdSchema,

  receivedQuantity: positiveIntegerSchema,

  returnQuantity: positiveIntegerSchema,

  unitCost: moneySchema,

  lineTotal: moneySchema,

  reason: z
    .string()
    .trim()
    .min(1, "Return item reason is required"),

  batchNumber: z
    .string()
    .trim()
    .optional(),

  serialNumbers: z
    .array(z.string().trim().min(1))
    .optional(),
});

/**
 * Inbound Replacement Lot Item Schema
 */
export const replacementItemSchema = z.object({
  productId: objectIdSchema,

  productNameSnapshot: z
    .string()
    .trim()
    .min(1, "Product name snapshot is required"),

  skuSnapshot: z
    .string()
    .trim()
    .min(1, "SKU snapshot is required"),

  quantity: positiveIntegerSchema,

  unitCost: moneySchema,

  lineTotal: moneySchema,

  batchNumber: z
    .string()
    .trim()
    .optional(),

  serialNumbers: z
    .array(z.string().trim().min(1))
    .optional(),
});

/**
 * Phase 12.3.3 - Authoritative Unified Purchase Return Payload Schema
 * Complies directly with the global validateRequest middleware body envelope format.
 */
export const createPurchaseReturnSchema = z
  .object({
    supplierId: objectIdSchema,

    purchaseId: objectIdSchema,

    goodsReceiptId: objectIdSchema,

    discrepancyId: objectIdSchema.optional(),

    warehouseId: objectIdSchema,

    returnType: z.enum(PURCHASE_RETURN_TYPE_LIST),

    items: z
      .array(purchaseReturnItemSchema)
      .min(1, "At least one return item is required"),

    replacementItems: z
      .array(replacementItemSchema)
      .default([]),

    reason: z
      .string()
      .trim()
      .min(1, "Return reason is required"),

    remarks: z
      .string()
      .trim()
      .optional(),

    totalQuantity: positiveIntegerSchema,

    totalAmount: moneySchema,
  })
  .superRefine((data, ctx) => {
    if (
      data.returnType === PURCHASE_RETURN_TYPE.RETURN &&
      data.replacementItems.length > 0
    ) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["replacementItems"],
        message: "Replacement items are not allowed for a RETURN",
      });
    }

    if (
      data.returnType === PURCHASE_RETURN_TYPE.EXCHANGE &&
      data.replacementItems.length === 0
    ) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["replacementItems"],
        message: "Replacement items are required for an EXCHANGE",
      });
    }
  });

// /**
//  * Parameter Route Verification Schema Contract
//  */
// export const purchaseReturnPublicIdParamSchema = z.object({
//   params: z.object({
//     publicId: z
//       .string()
//       .trim()
//       .min(1, "Public business trace identifier parameter is required."),
//   }),
// });

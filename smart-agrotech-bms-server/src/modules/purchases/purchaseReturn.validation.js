import { z } from "zod";
import { PURCHASE_RETURN_TYPE } from "./purchaseReturn.constants.js";

// Reusable standard MongoDB ObjectId verification string matching project conventions
const objectIdSchema = z
  .string()
  .regex(/^[0-9a-fA-F]{24}\$/, "Invalid MongoDB ObjectId reference format.");

const moneySchema = z
  .number()
  .finite()
  .min(0, "Monetary calculations cannot contain negative metrics.");

const positiveQuantity = z
  .number()
  .int("Quantity metrics must be whole integers.")
  .min(1, "Item tracking count must be at least 1.");

/**
 * Outbound Defective Lot Item Schema
 */
const purchaseReturnItemInputSchema = z.object({
  productId: objectIdSchema,
  purchaseItemId: objectIdSchema,
  goodsReceiptItemId: objectIdSchema,
  receivedQuantity: positiveQuantity,
  returnQuantity: positiveQuantity,
  unitCost: moneySchema,
  reason: z.string().trim().min(1, "A distinct return reason context is required per item line."),
  batchNumber: z.string().trim().optional(),
  serialNumbers: z.array(z.string().trim()).optional().default([]),
});

/**
 * Inbound Replacement Lot Item Schema
 */
const replacementItemInputSchema = z.object({
  productId: objectIdSchema,
  quantity: positiveQuantity,
  unitCost: moneySchema,
  batchNumber: z.string().trim().optional(),
  serialNumbers: z.array(z.string().trim()).optional().default([]),
});

/**
 * Phase 12.3.3 - Authoritative Unified Purchase Return Payload Schema
 * Complies directly with the global validateRequest middleware body envelope format.
 */
export const createPurchaseReturnSchema = z.object({
  body: z
    .object({
      supplierId: objectIdSchema,
      purchaseId: objectIdSchema,
      goodsReceiptId: objectIdSchema,
      discrepancyId: objectIdSchema.optional(),
      warehouseId: objectIdSchema,
      returnType: z.enum(Object.values(PURCHASE_RETURN_TYPE), {
        errorMap: () => ({ message: "Invalid return operation workflow type selection." }),
      }),
      items: z
        .array(purchaseReturnItemInputSchema)
        .min(1, "A return request requires at least 1 outbound line entry."),
      replacementItems: z.array(replacementItemInputSchema).optional().default([]),
      reason: z.string().trim().min(5, "A global master return reason description is required."),
      remarks: z.string().trim().optional().default(""),
    })
    .superRefine((data, ctx) => {
      // 1. Prevent duplicate product rows from causing inventory ledger drift
      const outboundProductIds = data.items.map((item) => item.productId.toString());
      const uniqueOutbound = new Set(outboundProductIds);
      if (uniqueOutbound.size !== outboundProductIds.length) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Duplicate product lines detected in outbound items. Combine target allocations.",
          path: ["items"],
        });
      }

      // 2. Phase 12.3.4 Invariant: Return items validation constraints
      for (let i = 0; i < data.items.length; i++) {
        const line = data.items[i];
        if (line.returnQuantity > line.receivedQuantity) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: `Return quantity (${line.returnQuantity}) cannot exceed originally received lot volumes (${line.receivedQuantity}).`,
            path: ["items", i, "returnQuantity"],
          });
        }
      }

      // 3. Phase 12.3.4 Invariant: Conditional rules between RETURN and EXCHANGE workflows
      if (data.returnType === PURCHASE_RETURN_TYPE.EXCHANGE) {
        if (!data.replacementItems || data.replacementItems.length === 0) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: "An EXCHANGE transaction type strictly requires inbound replacement items lines configuration.",
            path: ["replacementItems"],
          });
        } else {
          // Check for duplicate replacements mapping rows
          const inboundProductIds = data.replacementItems.map((item) => item.productId.toString());
          const uniqueInbound = new Set(inboundProductIds);
          if (uniqueInbound.size !== inboundProductIds.length) {
            ctx.addIssue({
              code: z.ZodIssueCode.custom,
              message: "Duplicate product lines detected in inbound replacement items.",
              path: ["replacementItems"], 
            });
          }
        }
      } else if (data.returnType === PURCHASE_RETURN_TYPE.RETURN) {
        if (data.replacementItems && data.replacementItems.length > 0) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: "A standard RETURN transaction type cannot contain incoming replacement items lines.",
            path: ["replacementItems"],
          });
        }
      }
    }),
});

/**
 * Parameter Route Verification Schema Contract
 */
export const purchaseReturnPublicIdParamSchema = z.object({
  params: z.object({
    publicId: z
      .string()
      .trim()
      .min(1, "Public business trace identifier parameter is required."),
  }),
});

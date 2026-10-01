import { z } from "zod";
import { 
    EXPENSE_CATEGORY_LIST, 
    EXPENSE_PAYMENT_METHOD_LIST 
} from "./expense.constants.js";

/**
 * Reusable Mongo ObjectId string checking regex pattern
 */
const objectIdSchema = z
  .string()
  .regex(/^[0-9a-fA-F]{24}$/, "Invalid MongoDB identifier formatting.");

/**
 * ============================================================
 * CREATE EXPENSE SCHEMA REQUEST CONTRACT
 * ============================================================
 * Structured around a parent 'body' block to map directly into 
 * your global validateRequest middleware pipeline framework.
 */
export const createExpenseSchema = z.object({
  body: z.object({
    category: z.enum(EXPENSE_CATEGORY_LIST, {
      errorMap: () => ({ message: "Must match a valid, established corporate category." }),
    }),
    amount: z
      .number({ required_error: "Expense amount is required." })
      .positive("Expense allocation values must be strictly greater than 0."),
    expenseDate: z.preprocess(
      (value) => (typeof value === "string" ? new Date(value) : value),
      z.date({ invalid_type_error: "Please pass a structurally valid date format." })
    ),
    paymentMethod: z.enum(EXPENSE_PAYMENT_METHOD_LIST, {
      errorMap: () => ({ message: "Unsupported transactional financial channel selection." }),
    }),
    reference: z.string().trim().max(100).optional().default(""),
    description: z.string().trim().max(1000).optional().default(""),
  }),
});

/**
 * ============================================================
 * EXPENSE IDENTITY PARAMETER SCHEMA
 * ============================================================
 */
export const expensePublicIdParamSchema = z.object({
  params: z.object({
    publicId: z.string().trim().min(1, "Public business trace identifier parameter is required."),
  }),
});


/**
 * ============================================================
 * UPDATE EXPENSE SCHEMA CONTRACT (Instructor Specification)
 * ============================================================
 * Targets the request 'body' envelope and applies partial schema filtering 
 * to allow incremental data updates on whitelisted fields only.
 */
export const updateExpenseSchema = z.object({
  body: z.object({
    category: z.enum(EXPENSE_CATEGORY_LIST).optional(),
    amount: z.number().positive("Updated amounts must be greater than zero.").optional(),
    expenseDate: z.preprocess(
      (value) => (typeof value === "string" ? new Date(value) : value),
      z.date().optional()
    ).optional(),
    paymentMethod: z.enum(EXPENSE_PAYMENT_METHOD_LIST).optional(),
    reference: z.string().trim().max(100).optional(),
    description: z.string().trim().max(1000).optional(),
  }),
});

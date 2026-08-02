import { z } from "zod";

// Future implementation will import constants here:
// import { CATEGORY_STATUS } from "./productCategory.constants.js";

/**
 * Create Category Schema
 * Handles structural validation, type checks, and formatting for creating a category.
 */
export const createProductCategorySchema = z.object({
  body: z.object({
    categoryName: z
      .string({
        required_error: "Category name is required.",
      })
      .trim()
      .min(2, "Category name must be at least 2 characters.")
      .max(100, "Category name cannot exceed 100 characters."),

    categoryCode: z
      .string({
        required_error: "Category code is required.",
      })
      .trim()
      .min(2, "Category code must be at least 2 characters.")
      .max(20, "Category code cannot exceed 20 characters.")
      // Automatically transforms values like "elc" or "ElC" into "ELC"
      .transform((value) => value.toUpperCase()),

    description: z
      .string()
      .trim()
      .max(500, "Description cannot exceed 500 characters.")
      .optional(),

    image: z
      .string()
      .url("Image must be a valid URL.")
      .or(z.literal("")) // Allows empty string default without breaking URL validation
      .optional(),

    // Basic structural format verification; relationships are validated in the service layer
    parentCategory: z
      .string()
      .trim()
      .optional()
      .nullable(),

    level: z
      .number()
      .int()
      .min(0, "Level must be greater than or equal to 0.")
      .optional(),

    sortOrder: z
      .number()
      .int()
      .min(0, "Sort order must be greater than or equal to 0.")
      .optional(),

    // Future status configuration will replace z.string() with a centralized enum
    status: z
      .string()
      .optional(),
  }),
});

/**
 * Update Category Schema
 * Reuses the creation shape but makes all body properties optional to allow partial modifications.
 */
export const updateProductCategorySchema = z.object({
  body: createProductCategorySchema.shape.body.partial(),
});

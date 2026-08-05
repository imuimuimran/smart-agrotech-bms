import { z } from "zod";
import { BRAND_STATUS } from "./brand.constants.js";

/**
 * Shared Reusable Field Schemas
 */
const brandNameSchema = z
  .string({
    required_error: "Brand name is required.",
  })
  .trim()
  .min(2, "Brand name must be at least 2 characters.")
  .max(100, "Brand name cannot exceed 100 characters.");

const brandCodeSchema = z
  .string({
    required_error: "Brand code is required.",
  })
  .trim()
  .min(2, "Brand code must be at least 2 characters.")
  .max(20, "Brand code cannot exceed 20 characters.")
  // Automatically transforms lowercase inputs like "sms" into "SMS"
  .transform((value) => value.toUpperCase());

const descriptionSchema = z
  .string()
  .trim()
  .max(500, "Description cannot exceed 500 characters.")
  .optional();

const countrySchema = z
  .string()
  .trim()
  .max(100, "Country cannot exceed 100 characters.")
  .optional();

/**
 * URL Validation
 * Allows valid URLs or empty string defaults without breaking shape verification
 */
const logoSchema = z
  .string()
  .trim()
  .url("Logo must be a valid URL.")
  .or(z.literal(""))
  .optional();

const websiteSchema = z
  .string()
  .trim()
  .url("Website must be a valid URL.")
  .or(z.literal(""))
  .optional();

/**
 * Status Validation
 */
const statusSchema = z.enum(Object.values(BRAND_STATUS));

/**
 * Create Brand Request Body Schema
 */
const createBrandSchema = z.object({
  body: z.object({
    brandName: brandNameSchema,
    brandCode: brandCodeSchema,
    description: descriptionSchema,
    logo: logoSchema,
    website: websiteSchema,
    country: countrySchema,
    status: statusSchema.optional(),
  }),
});

/**
 * Update Brand Request Body Schema (Partial Modifications)
 */
const updateBrandSchema = z.object({
  body: z.object({
    brandName: brandNameSchema.optional(),
    brandCode: brandCodeSchema.optional(),
    description: descriptionSchema,
    logo: logoSchema,
    website: websiteSchema,
    country: countrySchema,
    status: statusSchema.optional(),
  }),
});

/**
 * Export Operational Validation Layers
 */
export const BrandValidation = {
  createBrandSchema,
  updateBrandSchema,
};

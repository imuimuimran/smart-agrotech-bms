import { z } from "zod";

export const addressSchema = z.object({
  addressLine1: z.string().min(1, "Address Line 1 is required"),
  addressLine2: z.string().optional(),
  city: z.string().min(1, "City is required"),
  state: z.string().optional(),
  postalCode: z.string().optional(),
  country: z.string().min(1, "Country is required"),
  isDefault: z.boolean().optional(),
});

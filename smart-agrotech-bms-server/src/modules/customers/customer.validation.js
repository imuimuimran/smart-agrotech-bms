import { z } from "zod";
import USER_STATUS from "../../constants/userStatus.js";
import {
  CUSTOMER_TYPES,
  MEMBERSHIP_LEVELS,
  PAYMENT_TERMS,
} from "./customer.constants.js";

// 1. Shared Address Schema
export const addressSchema = z.object({
  label: z.string().trim().optional(),
  addressLine1: z.string().trim().min(3),
  addressLine2: z.string().trim().optional(),
  city: z.string().trim().min(2),
  state: z.string().trim().optional(),
  postalCode: z.string().trim().optional(),
  country: z.string().trim().min(2),
  isDefault: z.boolean().optional(),
});

// 2. Base Customer Body Schema with Business Rules
const customerBodySchema = z
  .object({
    name: z.string().trim().min(2).max(100),
    email: z.string().email().optional(),
    phone: z.string().trim().min(8).max(20),
    companyName: z.string().trim().optional(),
    companyType: z.string().trim().optional(),
    customerType: z.enum(CUSTOMER_TYPES).default("individual"),
    taxNumber: z.string().trim().optional(),
    tradeLicense: z.string().trim().optional(),
    billingAddress: addressSchema,
    shippingAddresses: z.array(addressSchema).default([]),
    creditLimit: z.number().min(0).default(0),
    openingBalance: z.number().default(0),
    paymentTerms: z.enum(PAYMENT_TERMS).default("Cash"),
    currency: z.string().length(3).default("BDT"),
    membershipLevel: z.enum(MEMBERSHIP_LEVELS).default("Bronze"),
    status: z
      .enum([USER_STATUS.ACTIVE, USER_STATUS.INACTIVE])
      .default(USER_STATUS.ACTIVE),
  })
  // Refinement to ensure only one shipping address is marked as default
  .refine(
    (data) => {
      // Return early if no shipping addresses exist yet to avoid filtering errors
      if (!data.shippingAddresses) return true;
      
      const defaults = data.shippingAddresses.filter(
        (address) => address.isDefault
      );
      return defaults.length <= 1;
    },
    {
      message: "Only one shipping address can be marked as default.",
      path: ["shippingAddresses"],
    }
  );

// Request Wrappers for Create and Update actions
export const createCustomerSchema = z.object({
  body: customerBodySchema,
});

export const updateCustomerSchema = z.object({
  body: customerBodySchema.partial(),
});

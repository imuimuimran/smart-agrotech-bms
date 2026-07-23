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

// 2. RAW Customer Body Schema (No refinements attached yet)
const rawCustomerBodySchema = z.object({
  name: z.string().trim().min(2).max(100),
  email: z.string().email().optional(),
  phone: z.string().trim().min(8).max(20),
  companyName: z.string().trim().optional(),
  companyType: z.string().trim().optional(),
  customerType: z.enum(Object.values(CUSTOMER_TYPES)).default(CUSTOMER_TYPES.INDIVIDUAL),
  taxNumber: z.string().trim().optional(),
  tradeLicense: z.string().trim().optional(),
  billingAddress: addressSchema,
  shippingAddresses: z.array(addressSchema).default([]),
  creditLimit: z.number().min(0).default(0),
  openingBalance: z.number().default(0),
  paymentTerms: z.enum(Object.values(PAYMENT_TERMS)).default(PAYMENT_TERMS.CASH),
  currency: z.string().length(3).default("BDT"),
  membershipLevel: z.enum(Object.values(MEMBERSHIP_LEVELS)).default(MEMBERSHIP_LEVELS.BRONZE),
  status: z
    .enum([USER_STATUS.ACTIVE, USER_STATUS.INACTIVE])
    .default(USER_STATUS.ACTIVE),
});

// 3. Shared Refinement Logic function
const validateSingleDefaultAddress = (data) => {
  if (!data.shippingAddresses) return true;
  const defaults = data.shippingAddresses.filter((address) => address.isDefault);
  return defaults.length <= 1;
};

const refinementConfig = {
  message: "Only one shipping address can be marked as default.",
  path: ["shippingAddresses"],
};

// 4. Request Wrappers (Apply partial first, then refine)
export const createCustomerSchema = z.object({
  body: rawCustomerBodySchema.refine(validateSingleDefaultAddress, refinementConfig),
});

export const updateCustomerSchema = z.object({
  body: rawCustomerBodySchema
    .partial() // Works perfectly because it's a raw object schema!
    .refine(validateSingleDefaultAddress, refinementConfig),
});

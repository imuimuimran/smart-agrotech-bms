import HTTP_STATUS from "../../constants/httpStatus.js";

import ApiError from "../../shared/ApiError.js";

import Customer from "./customer.model.js";

import {
  CUSTOMER_MESSAGES,
} from "./customer.constants.js";

import {
  generateCustomerPublicId,
  sanitizeCustomer,
  normalizePhoneNumber,
} from "./customer.utils.js";

const createCustomer =
async (
  payload,
  reqUser
) => {

   // 1. Enterprise Improvement: Normalize Email
  if (payload.email) {
    payload.email = payload.email.trim().toLowerCase();
  }

  // 2. Enterprise Improvement: Normalize Phone Number
  if (payload.phone) {
    payload.phone = normalizePhoneNumber(payload.phone);
  }

  // 3. Duplicate Email Check (Runs safely on normalized string)
  const existingEmail =
    payload.email
      ? await Customer.findOne({
          email: payload.email,
        })
      : null;

  if (existingEmail) {
    throw new ApiError(
      HTTP_STATUS.CONFLICT,
      CUSTOMER_MESSAGES.EMAIL_ALREADY_EXISTS
    );
  }

  // 4. Duplicate Phone Check (Runs safely on normalized string)
  const existingPhone =
    await Customer.findOne({
      phone: payload.phone,
    });

  if (existingPhone) {
    throw new ApiError(
      HTTP_STATUS.CONFLICT,
      CUSTOMER_MESSAGES.PHONE_ALREADY_EXISTS
    );
  }

  const publicId =
    await generateCustomerPublicId();

  const customer =
    await Customer.create({

      ...payload,

      publicId,

      createdBy:
        reqUser.publicId,

      updatedBy:
        reqUser.publicId,

    });

  return sanitizeCustomer(
    customer
  );

};

export const CustomerService = {
  createCustomer,
};
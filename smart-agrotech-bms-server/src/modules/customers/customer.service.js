import HTTP_STATUS from "../../constants/httpStatus.js";
import ApiError from "../../shared/ApiError.js";
import Customer from "./customer.model.js";
import QueryBuilder from "../../builder/QueryBuilder.js";
import {
  CUSTOMER_MESSAGES,
  CUSTOMER_FILTERABLE_FIELDS,
  CUSTOMER_ALLOWED_UPDATE_FIELDS, // Imported allowlist constant
} from "./customer.constants.js";
import {
  generateCustomerPublicId,
  sanitizeCustomer,
  normalizePhoneNumber,
  CUSTOMER_SEARCHABLE_FIELDS,
} from "./customer.utils.js";

/**
 * Creates a new customer record with normalization and duplicate safety checks
 */
const createCustomer = async (payload, reqUser) => {
  // 1. Enterprise Improvement: Normalize Email
  if (payload.email) {
    payload.email = payload.email.trim().toLowerCase();
  }

  // 2. Enterprise Improvement: Normalize Phone Number
  if (payload.phone) {
    payload.phone = normalizePhoneNumber(payload.phone);
  }

  // 3. Duplicate Email Check (Runs safely on normalized string)
  const existingEmail = payload.email
    ? await Customer.findOne({ email: payload.email })
    : null;

  if (existingEmail) {
    throw new ApiError(
      HTTP_STATUS.CONFLICT,
      CUSTOMER_MESSAGES.EMAIL_ALREADY_EXISTS
    );
  }

  // 4. Duplicate Phone Check (Runs safely on normalized string)
  const existingPhone = await Customer.findOne({ phone: payload.phone });

  if (existingPhone) {
    throw new ApiError(
      HTTP_STATUS.CONFLICT,
      CUSTOMER_MESSAGES.PHONE_ALREADY_EXISTS
    );
  }

  const publicId = await generateCustomerPublicId();

  const customer = await Customer.create({
    ...payload,
    publicId,
    createdBy: reqUser.publicId,
    updatedBy: reqUser.publicId,
  });

  return sanitizeCustomer(customer);
};

/**
 * Retrieves a paginated, sorted, and filtered list of active customers
 */
const getCustomers = async (query) => {
  const customerQuery = new QueryBuilder(Customer.find(), query)
    .search(CUSTOMER_SEARCHABLE_FIELDS)
    .filter(CUSTOMER_FILTERABLE_FIELDS)
    .sort()
    .paginate()
    .fields();

  const customers = await customerQuery.modelQuery;
  const meta = await customerQuery.countTotal();

  return {
    meta,
    result: customers.map(sanitizeCustomer),
  };
};

/**
 * Retrieves a single customer profile document
 */
const getCustomer = async (publicId) => {
  const customer = await Customer.findOne({ publicId });

  if (!customer) {
    throw new ApiError(
      HTTP_STATUS.NOT_FOUND,
      CUSTOMER_MESSAGES.CUSTOMER_NOT_FOUND
    );
  }

  return sanitizeCustomer(customer);
};

/**
 * Updates a customer profile using an allowlist filter to secure internal fields
 */
const updateCustomer = async (publicId, payload, reqUser) => {
  const customer = await Customer.findOne({ publicId });

  if (!customer) {
    throw new ApiError(
      HTTP_STATUS.NOT_FOUND,
      CUSTOMER_MESSAGES.CUSTOMER_NOT_FOUND
    );
  }

  // 1. Enterprise Protection: Pick only approved editable fields (strips forbidden parameters)
  const filteredPayload = Object.fromEntries(
    Object.entries(payload).filter(([key]) =>
      CUSTOMER_ALLOWED_UPDATE_FIELDS.includes(key)
    )
  );

  // 2. Normalize and check duplicate email if provided
  if (filteredPayload.email) {
    filteredPayload.email = filteredPayload.email.trim().toLowerCase();

    const existingEmail = await Customer.findOne({
      email: filteredPayload.email,
      publicId: { $ne: publicId },
    });

    if (existingEmail) {
      throw new ApiError(
        HTTP_STATUS.CONFLICT,
        CUSTOMER_MESSAGES.EMAIL_ALREADY_EXISTS
      );
    }
  }

  // 3. Normalize and check duplicate phone if provided
  if (filteredPayload.phone) {
    filteredPayload.phone = normalizePhoneNumber(filteredPayload.phone);

    const existingPhone = await Customer.findOne({
      phone: filteredPayload.phone,
      publicId: { $ne: publicId },
    });

    if (existingPhone) {
      throw new ApiError(
        HTTP_STATUS.CONFLICT,
        CUSTOMER_MESSAGES.PHONE_ALREADY_EXISTS
      );
    }
  }

  // 4. Inject audit update trail tracking
  filteredPayload.updatedBy = reqUser.publicId;

  // 5. Execute secure dynamic mongoose operation
  const updatedCustomer = await Customer.findOneAndUpdate(
    { publicId },
    filteredPayload,
    {
      new: true,
      runValidators: true,
    }
  );

  return sanitizeCustomer(updatedCustomer);
};

const deleteCustomer = async (
  publicId,
  reqUser
) => {

  const customer =
    await Customer.findOne({
      publicId,
    });

  if (!customer) {
    throw new ApiError(
      HTTP_STATUS.NOT_FOUND,
      CUSTOMER_MESSAGES.CUSTOMER_NOT_FOUND
    );
  }

  // Future Rule #1
  // Prevent deletion if customer has outstanding balance
  if (customer.currentBalance > 0) {
    throw new ApiError(
      HTTP_STATUS.BAD_REQUEST,
      CUSTOMER_MESSAGES.CUSTOMER_HAS_OUTSTANDING_BALANCE
    );
  }

  // Future Rule #2
  // Prevent deletion if customer has sales history
  // (We'll replace this placeholder once the Sales module exists.)

  await Customer.findOneAndUpdate(
    { publicId },
    {
      isDeleted: true,
      deletedAt: new Date(),
      deletedBy: reqUser.publicId,
      updatedBy: reqUser.publicId,
    }
  );

  return null;
};

export const CustomerService = {
  createCustomer,
  getCustomers,
  getCustomer,
  updateCustomer,
  deleteCustomer,
};

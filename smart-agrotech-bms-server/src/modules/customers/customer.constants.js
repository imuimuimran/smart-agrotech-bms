export const CUSTOMER_TYPES = Object.freeze({
  INDIVIDUAL: "individual",
  BUSINESS: "business",
  WHOLESALE: "wholesale",
  RETAIL: "retail",
  GOVERNMENT: "Government",
});

export const MEMBERSHIP_LEVELS = Object.freeze({
  BRONZE: "Bronze",
  SILVER: "Silver",
  GOLD: "Gold",
  PLATINUM: "Platinum",
});

export const PAYMENT_TERMS = Object.freeze({
  CASH: "Cash",
  DAYS_7: "7 Days",
  DAYS_15: "15 Days",
  DAYS_30: "30 Days",
  DAYS_45: "45 Days",
  DAYS_60: "60 Days",
  DAYS_90: "90 Days",
});

export const DEFAULT_CURRENCY = "BDT";

export const CUSTOMER_MESSAGES = Object.freeze({
  CREATED_SUCCESS:
    "Customer created successfully.",

  FETCH_ALL_SUCCESS:
    "Customers retrieved successfully.",

  FETCH_ONE_SUCCESS:
    "Customer retrieved successfully.",

  UPDATED_SUCCESS:
    "Customer updated successfully.",

  DELETED_SUCCESS:
    "Customer deleted successfully.",

  CUSTOMER_NOT_FOUND:
    "Customer not found.",

  CUSTOMER_ALREADY_DELETED:
    "Customer has already been deleted.",

  EMAIL_ALREADY_EXISTS:
    "Customer email already exists.",

  PHONE_ALREADY_EXISTS:
    "Customer phone number already exists.",

  INVALID_CUSTOMER_TYPE:
    "Invalid customer type.",

  CREDIT_LIMIT_EXCEEDED:
    "Customer credit limit exceeded.",

  DEFAULT_ADDRESS_REQUIRED:
    "One default shipping address is required.",

  MULTIPLE_DEFAULT_ADDRESSES:
    "Only one default shipping address is allowed.",
});

export const CUSTOMER_FILTERABLE_FIELDS = [
  "status",
  "customerType",
  "membershipLevel",
  "companyName",
];

export const CUSTOMER_ALLOWED_UPDATE_FIELDS = [
  "name",
  "email",
  "phone",
  "companyName",
  "companyType",
  "customerType",
  "billingAddress",
  "shippingAddresses",
  "creditLimit",
  "paymentTerms",
  "membershipLevel",
  "status",
];


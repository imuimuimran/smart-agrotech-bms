export const SUPPLIER_TYPES = Object.freeze({
  MANUFACTURER: "manufacturer",
  DISTRIBUTOR: "distributor",
  WHOLESALER: "wholesaler",
  IMPORTER: "importer",
  LOCAL_VENDOR: "local_vendor",
  SERVICE_PROVIDER: "service_provider",
});

export const SUPPLIER_STATUS = Object.freeze({
  ACTIVE: "active",
  INACTIVE: "inactive",
  BLACKLISTED: "blacklisted",
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

export const SUPPLIER_MESSAGES = Object.freeze({
  CREATED_SUCCESS: "Supplier created successfully.",
  FETCH_ALL_SUCCESS: "Suppliers retrieved successfully.",
  FETCH_ONE_SUCCESS: "Supplier retrieved successfully.",
  UPDATED_SUCCESS: "Supplier updated successfully.",
  DELETED_SUCCESS: "Supplier deleted successfully.",
  SUPPLIER_NOT_FOUND: "Supplier not found.",
  SUPPLIER_ALREADY_DELETED: "Supplier has already been deleted.",
  EMAIL_ALREADY_EXISTS: "Supplier email already exists.",
  PHONE_ALREADY_EXISTS: "Supplier phone number already exists.",
  SUPPLIER_HAS_PURCHASE_HISTORY: "Supplier has purchase history and cannot be deleted.",
  SUPPLIER_HAS_OUTSTANDING_PAYABLE: "Supplier has outstanding payable and cannot be deleted.",
});

export const SUPPLIER_SEARCHABLE_FIELDS = [
  "supplierName",
  "companyName",
  "phone",
  "email",
];

export const SUPPLIER_FILTERABLE_FIELDS = [
  "supplierType",
  "status",
  "paymentTerms",
];

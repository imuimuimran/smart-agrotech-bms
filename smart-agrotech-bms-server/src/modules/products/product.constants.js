export const PRODUCT_TYPES = Object.freeze({
  PHYSICAL: "physical",
  SERVICE: "service",
  DIGITAL: "digital",
});

export const PRODUCT_STATUS = Object.freeze({
  ACTIVE: "active",
  INACTIVE: "inactive",
  DISCONTINUED: "discontinued",
});

export const TAX_TYPES = Object.freeze({
  NONE: "none",
  PERCENTAGE: "percentage",
  FIXED: "fixed",
});

export const PRODUCT_PUBLIC_ID_PREFIX = "PRD";

export const PRODUCT_SEARCHABLE_FIELDS = [
  "productName",
  "productCode",
  "sku",
  "barcode",
  "shortDescription",
];

export const PRODUCT_FILTERABLE_FIELDS = [
  "categoryId",
  "brandId",
  "productType",
  "status",
  "isDeleted",
  "unit",
];

export const PRODUCT_SORTABLE_FIELDS = [
  "productName",
  "productCode",
  "sku",
  "pricing.sellingPrice",
  "pricing.purchasePrice",
  "createdAt",
  "updatedAt",
];

export const PRODUCT_DEFAULT_SORT = "-createdAt";
export const PRODUCT_DEFAULT_PAGE = 1;
export const PRODUCT_DEFAULT_LIMIT = 20;
export const PRODUCT_MAX_LIMIT = 100;

export const PRODUCT_MESSAGES = Object.freeze({
  CREATED: "Product created successfully.",
  FETCHED: "Product fetched successfully.",
  UPDATED: "Product updated successfully.",
  DELETED: "Product deleted successfully.",
  RESTORED: "Product restored successfully.",
  NOT_FOUND: "Product not found.",
  ALREADY_EXISTS: "Product already exists.",
  ALREADY_DELETED: "Product is already deleted.",
  NOT_DELETED: "Product is not deleted.",
  INVALID_STATUS: "Invalid product status.",
  INVALID_TYPE: "Invalid product type.",
  CATEGORY_NOT_FOUND: "Category not found.",
  BRAND_NOT_FOUND: "Brand not found.",
  SKU_ALREADY_EXISTS: "SKU already exists.",
  PRODUCT_CODE_ALREADY_EXISTS: "Product code already exists.",
  BARCODE_ALREADY_EXISTS: "Barcode already exists.",
});

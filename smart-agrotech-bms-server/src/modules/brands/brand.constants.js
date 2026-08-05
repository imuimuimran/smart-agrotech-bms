export const BRAND_STATUS = Object.freeze({
  ACTIVE: "active",
  INACTIVE: "inactive",
});

export const BRAND_MESSAGES = Object.freeze({
  CREATED_SUCCESS: "Brand created successfully.",
  FETCH_ALL_SUCCESS: "Brands retrieved successfully.",
  FETCH_ONE_SUCCESS: "Brand retrieved successfully.",
  UPDATED_SUCCESS: "Brand updated successfully.",
  DELETED_SUCCESS: "Brand deleted successfully.",
  RESTORED_SUCCESS: "Brand restored successfully.",
  BRAND_NOT_FOUND: "Brand not found.",
  BRAND_ALREADY_DELETED: "Brand is already deleted.",
  BRAND_NOT_DELETED: "Brand is not deleted.",
  BRAND_NAME_ALREADY_EXISTS: "Brand name already exists.",
  BRAND_CODE_ALREADY_EXISTS: "Brand code already exists.",
  BRAND_HAS_PRODUCTS: "Brand contains products and cannot be deleted.",
});

export const BRAND_SEARCHABLE_FIELDS = [
  "brandName",
  "brandCode",
  "description",
  "country",
];

export const BRAND_FILTERABLE_FIELDS = [
  "status",
  "country",
];

export const BRAND_SORTABLE_FIELDS = [
  "brandName",
  "brandCode",
  "country",
  "createdAt",
  "updatedAt",
];

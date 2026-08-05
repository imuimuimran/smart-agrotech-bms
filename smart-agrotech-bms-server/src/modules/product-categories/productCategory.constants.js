export const CATEGORY_STATUS = Object.freeze({
  ACTIVE: "active",
  INACTIVE: "inactive",
});

export const DEFAULT_CATEGORY_LEVEL = 0;
export const DEFAULT_SORT_ORDER = 0;

export const PRODUCT_CATEGORY_MESSAGES = Object.freeze({
  CREATED_SUCCESS: "Product category created successfully.",
  FETCH_ALL_SUCCESS: "Product categories retrieved successfully.",
  FETCH_ONE_SUCCESS: "Product category retrieved successfully.",
  UPDATED_SUCCESS: "Product category updated successfully.",
  DELETED_SUCCESS: "Product category deleted successfully.",
  CATEGORY_NOT_FOUND: "Product category not found.",
  CATEGORY_ALREADY_DELETED: "Product category has already been deleted.",
  CATEGORY_NAME_ALREADY_EXISTS: "Category name already exists.",
  CATEGORY_CODE_ALREADY_EXISTS: "Category code already exists.",
  PARENT_CATEGORY_NOT_FOUND: "Parent category not found.",
  INVALID_PARENT_CATEGORY: "A category cannot be its own parent.",
  CATEGORY_HAS_PRODUCTS: "Category contains products and cannot be deleted.",
  CATEGORY_HAS_CHILDREN: "Category contains child categories and cannot be deleted.",
  RESTORED_SUCCESS: "Product category restored successfully.",
  CATEGORY_NOT_DELETED: "Product category is not deleted.",
  PARENT_CATEGORY_INACTIVE: "Parent category is inactive.",
  PARENT_CATEGORY_DELETED: "Parent category is deleted.",
  CIRCULAR_CATEGORY_HIERARCHY: "Circular category hierarchy detected.",
});

export const PRODUCT_CATEGORY_SEARCHABLE_FIELDS = [
  "categoryName",
  "categoryCode",
  "description",
];

export const PRODUCT_CATEGORY_FILTERABLE_FIELDS = [
  "status",
  "parentCategory",
];

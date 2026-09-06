export const WAREHOUSE_STATUS = {
  ACTIVE: "active",
  INACTIVE: "inactive",
};

export const WAREHOUSE_STATUS_LIST = Object.values(WAREHOUSE_STATUS);

export const WAREHOUSE_SEARCHABLE_FIELDS = [
  "warehouseName",
  "warehouseCode",
  "description",
];

export const WAREHOUSE_FILTERABLE_FIELDS = [
  "status",
];

export const WAREHOUSE_SORTABLE_FIELDS = [
  "warehouseName",
  "warehouseCode",
  "status",
  "createdAt",
  "updatedAt",
];

export const WAREHOUSE_DEFAULT_SORT = "-createdAt";

export const WAREHOUSE_MESSAGES = {
  CREATED: "Warehouse created successfully.",
  UPDATED: "Warehouse updated successfully.",
  DELETED: "Warehouse deleted successfully.",
  NOT_FOUND: "Warehouse not found.",
  CODE_ALREADY_EXISTS: "Warehouse code already exists.",
  NAME_ALREADY_EXISTS: "Warehouse name already exists.",
  INACTIVE: "Warehouse is inactive.",
  ALREADY_DELETED: "Warehouse is already deleted.",
};

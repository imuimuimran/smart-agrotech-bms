import QueryBuilder from "../../builder/QueryBuilder.js";
import { Warehouse } from "./warehouse.model.js";

import {
  WAREHOUSE_STATUS,
  WAREHOUSE_SEARCHABLE_FIELDS,
  WAREHOUSE_SORTABLE_FIELDS,
} from "./warehouse.constants.js";

/**
 * Retrieves active, non-deleted warehouses.
 *
 * Supports:
 * - Search
 * - Sorting
 * - Pagination
 *
 * The active-status condition is enforced by the backend.
 * Request query parameters cannot override it.
 */
const getWarehouses = async (query = {}) => {
  const warehouseQuery = new QueryBuilder(
    Warehouse.find({
      status: WAREHOUSE_STATUS.ACTIVE,
    }).select("_id publicId warehouseName warehouseCode status"),
    query
  )
    .search(WAREHOUSE_SEARCHABLE_FIELDS)
    .sort(WAREHOUSE_SORTABLE_FIELDS)
    .paginate();

  const data = await warehouseQuery.modelQuery;
  const meta = await warehouseQuery.countTotal();

  return {
    data,
    meta,
  };
};

export const WarehouseService = {
  getWarehouses,
};
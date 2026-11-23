import HTTP_STATUS from "../../constants/httpStatus.js";
import ApiError from "../../shared/ApiError.js";
import QueryBuilder from "../../builder/QueryBuilder.js";
import { Warehouse } from "./warehouse.model.js";

import {
  WAREHOUSE_STATUS,
  WAREHOUSE_SEARCHABLE_FIELDS,
  WAREHOUSE_SORTABLE_FIELDS,
  WAREHOUSE_MESSAGES,
} from "./warehouse.constants.js";

import { generateWarehousePublicId } from "./warehouse.utils.js";

const createWarehouse = async (payload, reqUser) => {
  const warehouseCode = payload.warehouseCode.trim().toUpperCase();
  const existingCode = await Warehouse.findOne({ warehouseCode });
  if (existingCode) {
    throw new ApiError(HTTP_STATUS.CONFLICT, WAREHOUSE_MESSAGES.CODE_ALREADY_EXISTS);
  }

  const warehouseName = payload.warehouseName.trim();
  const existingName = await Warehouse.findOne({ warehouseName: { $regex: `^${warehouseName.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}$`, $options: "i" } });
  if (existingName) {
    throw new ApiError(HTTP_STATUS.CONFLICT, WAREHOUSE_MESSAGES.NAME_ALREADY_EXISTS);
  }

  const publicId = await generateWarehousePublicId();
  try {
    const warehouse = await Warehouse.create({
      ...payload,
      warehouseName,
      warehouseCode,
      publicId,
      createdBy: reqUser.publicId,
      updatedBy: reqUser.publicId,
    });
    return warehouse;
  } catch (error) {
    if (error?.code === 11000) {
      const field = Object.keys(error.keyPattern || {})[0];
      const message = field === "warehouseName" ? WAREHOUSE_MESSAGES.NAME_ALREADY_EXISTS : WAREHOUSE_MESSAGES.CODE_ALREADY_EXISTS;
      throw new ApiError(HTTP_STATUS.CONFLICT, message);
    }
    throw error;
  }
};

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
  createWarehouse,
  getWarehouses,
};
import catchAsync from "../../shared/catchAsync.js";
import sendResponse from "../../shared/sendResponse.js";
import HTTP_STATUS from "../../constants/httpStatus.js";

import { WarehouseService } from "./warehouse.service.js";

const createWarehouse = catchAsync(async (req, res) => {
  const result = await WarehouseService.createWarehouse(req.body, req.user);
  sendResponse({ res, statusCode: HTTP_STATUS.CREATED, success: true, message: WAREHOUSE_MESSAGES.CREATED, data: result });
});

const getWarehouses = catchAsync(async (req, res) => {
  const result = await WarehouseService.getWarehouses(req.query);

  sendResponse({
    res,
    statusCode: HTTP_STATUS.OK,
    success: true,
    message: "Active warehouses fetched successfully.",
    meta: result.meta,
    data: result.data,
  });
});

import { WAREHOUSE_MESSAGES } from "./warehouse.constants.js";
export const WarehouseController = {
  createWarehouse,
  getWarehouses,
};
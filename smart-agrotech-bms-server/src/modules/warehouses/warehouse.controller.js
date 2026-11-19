import catchAsync from "../../shared/catchAsync.js";
import sendResponse from "../../shared/sendResponse.js";
import HTTP_STATUS from "../../constants/httpStatus.js";

import { WarehouseService } from "./warehouse.service.js";

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

export const WarehouseController = {
  getWarehouses,
};
import { SupplierService } from "./supplier.service.js";
import catchAsync from "../../shared/catchAsync.js";
import sendResponse from "../../shared/sendResponse.js";
import { SUPPLIER_MESSAGES } from "./supplier.constants.js";

const createSupplier = catchAsync(async (req, res) => {
  const userId = req.user?.id || req.user?._id; // Extracted via verifyToken middleware
  const result = await SupplierService.createSupplier(req.body, userId);

  sendResponse({
    res,
    statusCode: 201, 
    success: true,
    message: SUPPLIER_MESSAGES.CREATED_SUCCESS,
    data: result,
  });
});

const getSuppliers = catchAsync(async (req, res) => {
  const result = await SupplierService.getSuppliers(req.query);

  sendResponse({
    res,
    statusCode: 200, 
    success: true,
    message: SUPPLIER_MESSAGES.FETCH_ALL_SUCCESS,
    meta: result.meta,
    data: result.data,
  });
});

export const SupplierController = {
  createSupplier,
  getSuppliers,
};

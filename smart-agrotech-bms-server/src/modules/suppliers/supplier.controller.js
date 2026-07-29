import { SupplierService } from "./supplier.service.js";
import catchAsync from "../../shared/catchAsync.js";
import sendResponse from "../../shared/sendResponse.js";
import { SUPPLIER_MESSAGES, } from "./supplier.constants.js";

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

const getSupplier =
catchAsync(
async (
req,
res
) => {

  const result =
    await SupplierService
      .getSupplier(
        req.params.publicId
      );

  sendResponse({

    res,
    statusCode: 200,

    success:true,

    message:
      SUPPLIER_MESSAGES
        .FETCH_ONE_SUCCESS,

    data:
      result,

  });

});

const updateSupplier =
catchAsync(
async (
req,
res
) => {

  const result =
    await SupplierService
      .updateSupplier(

        req.params.publicId,

        req.body,

        req.user

      );

  sendResponse({

    res,

    statusCode: 200,

    success: true,

    message:
      SUPPLIER_MESSAGES
        .UPDATED_SUCCESS,

    data:
      result,

  });

});

const deleteSupplier =
catchAsync(
async (
req,
res
) => {

    await SupplierService
        .deleteSupplier(

            req.params.publicId,

            req.user

        );

    sendResponse({

        res,

        statusCode: 200,

        success: true,

        message:
            SUPPLIER_MESSAGES
                .DELETED_SUCCESS,

        data: null,

    });

});

export const SupplierController = {
  createSupplier,
  getSuppliers,
  getSupplier,
  updateSupplier,
  deleteSupplier,
};

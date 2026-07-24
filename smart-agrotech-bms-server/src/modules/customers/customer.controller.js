import HTTP_STATUS from "../../constants/httpStatus.js"

import catchAsync from "../../shared/catchAsync.js";

import sendResponse from "../../shared/sendResponse.js";

import { CustomerService } from "./customer.service.js";

import { CUSTOMER_MESSAGES } from "./customer.constants.js";

const createCustomer = catchAsync(
  async (req, res) => {
    const result =
      await CustomerService.createCustomer(
        req.body,
        req.user
      );

    sendResponse({
      res,

      statusCode: HTTP_STATUS.CREATED,

      success: true,

      message:
        CUSTOMER_MESSAGES.CREATED_SUCCESS,

      data: result,
    });
  }
);

const getCustomers =
catchAsync(
async (
req,
res
) => {

    const result =
        await CustomerService
            .getCustomers(
                req.query
            );

    sendResponse({

        res,

        statusCode:
            HTTP_STATUS.OK,

        success: true,

        message:
            CUSTOMER_MESSAGES
                .FETCH_ALL_SUCCESS,

        meta:
            result.meta,

        data:
            result.result,

    });

});

const getCustomer = catchAsync(
  async (req, res) => {
    const result =
      await CustomerService.getCustomer(
        req.params.publicId
      );

    sendResponse({
      res,

      statusCode: HTTP_STATUS.OK,

      success: true,

      message:
        CUSTOMER_MESSAGES.FETCH_ONE_SUCCESS,

      data: result,
    });
  }
);

const updateCustomer =
catchAsync(
async (
req,
res
) => {

  const result =
    await CustomerService
      .updateCustomer(
        req.params.publicId,
        req.body,
        req.user
      );

  sendResponse({

    res,

    statusCode:
      HTTP_STATUS.OK,

    success: true,

    message:
      CUSTOMER_MESSAGES.UPDATED_SUCCESS,

    data:
      result,

  });

});

export const CustomerController = {
  createCustomer,
  getCustomers,
  getCustomer,
  updateCustomer,
};
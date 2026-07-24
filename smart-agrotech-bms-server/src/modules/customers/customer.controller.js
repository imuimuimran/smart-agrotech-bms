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

export const CustomerController = {
  createCustomer,
  getCustomers,
};
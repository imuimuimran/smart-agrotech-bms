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

export const CustomerController = {
  createCustomer,
};
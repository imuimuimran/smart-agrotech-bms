import catchAsync from "../../shared/catchAsync.js";
import sendResponse from "../../shared/sendResponse.js";

import HTTP_STATUS from "../../constants/httpStatus.js";

import { UserService } from "./user.service.js";

import { USER_MESSAGES } from "./user.constants.js";

const getUsers = catchAsync(
  async (req, res) => {
    const result =
      await UserService.getUsers(
        req.query
      );

    sendResponse({
      res,

      statusCode: HTTP_STATUS.OK,

      message:
        USER_MESSAGES.FETCH_ALL_SUCCESS,

      meta: result.meta,

      data: result.data,
    });
  }
);

const getUser = catchAsync(async (req, res) => {
  const user =
    await UserService.getUser(
      req.params.publicId
    );

  sendResponse({
    res,

    statusCode: HTTP_STATUS.OK,

    message:
      USER_MESSAGES.FETCH_ONE_SUCCESS,

    data: user,
  });
});

const updateUser = catchAsync(async (req, res) => {
  const result =
    await UserService.updateUser(
      req.params.publicId,
      req.body
    );

  sendResponse({
    res,
    statusCode: HTTP_STATUS.OK,
    message:
      USER_MESSAGES.UPDATE_SUCCESS,
    data: result,
  });
});

export const UserController = {
  getUsers,
  getUser,
  updateUser,
};
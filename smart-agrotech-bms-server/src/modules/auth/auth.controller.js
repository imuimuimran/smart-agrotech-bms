import catchAsync from "../../shared/catchAsync.js";
import sendResponse from "../../shared/sendResponse.js";
import HTTP_STATUS from "../../constants/httpStatus.js";

import { AuthService } from "./auth.service.js";
import { AUTH_MESSAGES } from "./auth.constants.js";

const register = catchAsync(async (req, res) => {
  const user = await AuthService.registerUser(req.body);

  // 1. Convert the Mongoose document to a plain object and delete the password
  // const sanitizedUser = user.toObject ? user.toObject() : { ...user };
  // delete sanitizedUser.password;

  const sanitizedUser = {
    id: user._id,
    publicId: user.publicId,
    name: user.name,
    email: user.email,
    role: user.role,
    status: user.status,
  };

  sendResponse({
    res,
    statusCode: HTTP_STATUS.CREATED,
    message: AUTH_MESSAGES.REGISTER_SUCCESS,    
    data: sanitizedUser,
  });
});

const login = catchAsync(async (req, res) => {
  const result = await AuthService.loginUser(req.body);

  sendResponse({
    res,
    statusCode: HTTP_STATUS.OK,
    message: AUTH_MESSAGES.LOGIN_SUCCESS,
    data: result,
  });
});

const me = catchAsync(async (req, res) => {
  sendResponse({
    res,
    statusCode: HTTP_STATUS.OK,
    message: AUTH_MESSAGES.CURRENT_USER_SUCCESS,
    data: req.user,
  });
});

export const AuthController = {
  register,
  login,
  me,
};
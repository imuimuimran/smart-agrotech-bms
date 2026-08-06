import httpStatus from "../../constants/httpStatus.js";
import catchAsync from "../../shared/catchAsync.js";
import sendResponse from "../../shared/sendResponse.js";
import { BRAND_MESSAGES } from "./brand.constants.js";
import { BrandService } from "./brand.service.js";

const createBrand = catchAsync(async (req, res) => {
  const result = await BrandService.createBrand(req.body, req.user);

  sendResponse({
    res,
    statusCode: httpStatus.CREATED,
    success: true,
    message: BRAND_MESSAGES.CREATED_SUCCESS,
    data: result,
  });
});

export const BrandController = {
  createBrand,
};

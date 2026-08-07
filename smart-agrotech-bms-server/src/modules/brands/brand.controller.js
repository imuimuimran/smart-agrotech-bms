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

const getBrands = catchAsync(async (req, res) => {
  const result = await BrandService.getBrands(req.query);

  sendResponse({
    res,
    statusCode: httpStatus.OK,
    success: true,
    message: BRAND_MESSAGES.FETCH_ALL_SUCCESS,
    meta: result.meta,
    data: result.data,
  });
});

const getBrand = catchAsync(async (req, res) => {
  const result = await BrandService.getBrand(req.params.publicId);

  sendResponse({
    res,
    statusCode: httpStatus.OK,
    success: true,
    message: BRAND_MESSAGES.FETCH_ONE_SUCCESS,
    data: result,
  });
});

const updateBrand = catchAsync(async (req, res) => {
  const result = await BrandService.updateBrand(
    req.params.publicId,
    req.body,
    req.user
  );

  sendResponse({
    res,
    statusCode: httpStatus.OK,
    success: true,
    message: BRAND_MESSAGES.UPDATED_SUCCESS,
    data: result,
  });
});

export const BrandController = {
  createBrand,
  getBrands,
  getBrand,
  updateBrand,
};

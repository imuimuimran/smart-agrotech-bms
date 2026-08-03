import httpStatus from "../../constants/httpStatus.js";
import catchAsync from "../../shared/catchAsync.js";
import sendResponse from "../../shared/sendResponse.js";
import { ProductCategoryService } from "./productCategory.service.js";
import { PRODUCT_CATEGORY_MESSAGES } from "./productCategory.constants.js";

const createProductCategory = catchAsync(async (req, res) => {
  const result = await ProductCategoryService.createProductCategory(
    req.body,
    req.user
  );

  sendResponse({
    res,
    statusCode: httpStatus.CREATED,
    success: true,
    message: PRODUCT_CATEGORY_MESSAGES.CREATED_SUCCESS,
    data: result,
  });
});

const getProductCategories = catchAsync(async (req, res) => {
  const result = await ProductCategoryService.getProductCategories(req.query);

  sendResponse({
    res,
    statusCode: httpStatus.OK,
    success: true,
    message: PRODUCT_CATEGORY_MESSAGES.FETCH_ALL_SUCCESS,
    meta: result.meta,
    data: result.data,
  });
});

const getProductCategory = catchAsync(async (req, res) => {
  const result = await ProductCategoryService.getProductCategory(
    req.params.publicId
  );

  sendResponse({
    res,
    statusCode: httpStatus.OK,
    success: true,
    message: PRODUCT_CATEGORY_MESSAGES.FETCH_ONE_SUCCESS,
    data: result,
  });
});

export const ProductCategoryController = {
  createProductCategory,
  getProductCategories,
  getProductCategory,
};

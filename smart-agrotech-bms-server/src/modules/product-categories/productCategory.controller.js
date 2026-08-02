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

export const ProductCategoryController = {
  createProductCategory,
};

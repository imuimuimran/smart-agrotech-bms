import httpStatus from "../../constants/httpStatus.js";
import catchAsync from "../../shared/catchAsync.js";
import sendResponse from "../../shared/sendResponse.js";
import { ProductService } from "./product.service.js";
import { PRODUCT_MESSAGES } from "./product.constants.js";

const createProduct = catchAsync(async (req, res) => {
  const result = await ProductService.createProduct(req.body, req.user);

  sendResponse({
    res,
    statusCode: httpStatus.CREATED,
    success: true,
    message: PRODUCT_MESSAGES.CREATED,
    data: result,
  });
});

export const ProductController = {
  createProduct,
};

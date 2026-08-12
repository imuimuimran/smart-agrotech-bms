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

const getProducts = catchAsync(async (req, res) => {
  const result = await ProductService.getProducts(req.query);

  sendResponse({
    res,
    statusCode: httpStatus.OK,
    success: true,
    message: PRODUCT_MESSAGES.FETCHED,
    data: result.products,
    pagination: result.pagination, // Inject pagination meta blocks cleanly
  });
});

const getProductById = catchAsync(async (req, res) => {
  const result = await ProductService.getProductById(req.params.id);

  sendResponse({
    res,
    statusCode: httpStatus.OK,
    success: true,
    message: PRODUCT_MESSAGES.FETCHED,
    data: result,
  });
});

const updateProduct = catchAsync(async (req, res) => {
  const result = await ProductService.updateProduct(
    req.params.id,
    req.body,
    req.user
  );

  sendResponse({
    res,
    statusCode: httpStatus.OK,
    success: true,
    message: PRODUCT_MESSAGES.UPDATED,
    data: result,
  });
});

// New Controller function to parse parameters and direct removal passes cleanly
const deleteProduct = catchAsync(async (req, res) => {
  await ProductService.deleteProduct(req.params.id, req.user);

  sendResponse({
    res,
    statusCode: httpStatus.OK,
    success: true,
    message: PRODUCT_MESSAGES.DELETED, // Clean return envelope optimization
  });
});

export const ProductController = {
  createProduct,
  getProducts,
  getProductById,
  updateProduct,
  deleteProduct,
};

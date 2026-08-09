import httpStatus from "../../constants/httpStatus.js";
import Product from "./product.model.js";
import ApiError from "../../shared/ApiError.js";
import ProductCategory from "../product-categories/productCategory.model.js"; 
import Brand from "../brands/brand.model.js"; 
import { getNextSequence } from "../../utils/sequence.util.js";
import { PRODUCT_MESSAGES } from "./product.constants.js";
import {
  normalizeProductPayload,
  normalizeProductImages,
  sanitizeProduct,
  formatProductPublicId,
} from "./product.utils.js";

/**
 * Enterprise Service Core for Product Provisioning
 */
const createProduct = async (payload, reqUser) => {
  // Structural and Text Case Normalization
  const normalizedData = normalizeProductPayload(payload);
  normalizedData.images = normalizeProductImages(normalizedData.images);

  // Active Parent Category Entity Verification
  const category = await ProductCategory.findOne({
    _id: normalizedData.categoryId,
    isDeleted: false,
    status: "active",
  });
  if (!category) {
    throw new ApiError(httpStatus.NOT_FOUND, PRODUCT_MESSAGES.CATEGORY_NOT_FOUND);
  }

  // Active Parent Brand Entity Verification
  const brand = await Brand.findOne({
    _id: normalizedData.brandId,
    isDeleted: false,
    status: "active",
  });
  if (!brand) {
    throw new ApiError(httpStatus.NOT_FOUND, PRODUCT_MESSAGES.BRAND_NOT_FOUND);
  }

  // Duplicate SKU Logical Pre-check
  const existingSku = await Product.findOne({
    sku: normalizedData.sku,
    isDeleted: false,
  });
  if (existingSku) {
    throw new ApiError(httpStatus.CONFLICT, PRODUCT_MESSAGES.SKU_ALREADY_EXISTS);
  }

  // Duplicate Product Code Logical Pre-check
  const existingProductCode = await Product.findOne({
    productCode: normalizedData.productCode,
    isDeleted: false,
  });
  if (existingProductCode) {
    throw new ApiError(httpStatus.CONFLICT, PRODUCT_MESSAGES.PRODUCT_CODE_ALREADY_EXISTS);
  }

  // Duplicate Optional Barcode Logical Pre-check
  if (normalizedData.barcode) {
    const existingBarcode = await Product.findOne({
      barcode: normalizedData.barcode,
      isDeleted: false,
    });
    if (existingBarcode) {
      throw new ApiError(httpStatus.CONFLICT, PRODUCT_MESSAGES.BARCODE_ALREADY_EXISTS);
    }
  }

  // Atomic Public ID Sequence Generation
  const sequence = await getNextSequence("product");
  const publicId = formatProductPublicId(sequence);

  // Construct Final Document Shape (Explicitly ignoring client audit injection vectors)
  const finalProductData = {
    ...normalizedData,
    publicId,
    createdBy: reqUser.publicId, // Explicitly linking your system's string user tracking pattern
    updatedBy: reqUser.publicId,
  };

  // Persist into MongoDB database
  const product = await Product.create(finalProductData);

  // Return Client Sanitized View Object Representation
  return sanitizeProduct(product);
};

export const ProductService = {
  createProduct,
};

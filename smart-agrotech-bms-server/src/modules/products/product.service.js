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
  buildProductFilter, 
  buildProductSort
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

/**
 * Get Products List Pipeline with Concurrent Database Metrics Counting
 */
const getProducts = async (query) => {
  const filter = buildProductFilter(query);
  const sort = buildProductSort(query.sort);

  const page = query.page || 1;
  const limit = query.limit || 20;
  const skip = (page - 1) * limit;

  // Execute concurrently to maximize application throughput
  const [products, total] = await Promise.all([
    Product.find(filter)
      .sort(sort)
      .skip(skip)
      .limit(limit)
      .populate("categoryId", "publicId categoryName categoryCode") // Populate relationships cleanly
      .populate("brandId", "publicId brandName brandCode")
      .lean(),
    Product.countDocuments(filter),
  ]);

  return {
    products: products.map(sanitizeProduct),
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
      hasNextPage: page < Math.ceil(total / limit),
      hasPreviousPage: page > 1,
    },
  };
};

/**
 * Fetch Single Product by MongoDB ID with Core Relationship Population
 */
const getProductById = async (productId) => {
  const product = await Product.findOne({
    _id: productId,
    isDeleted: false,
  })
    .populate("categoryId", "publicId categoryName categoryCode status") // Clean project projection mapping
    .populate("brandId", "publicId brandName brandCode status");

  if (!product) {
    throw new ApiError(
      httpStatus.NOT_FOUND,
      PRODUCT_MESSAGES.NOT_FOUND
    );
  }

  return sanitizeProduct(product);
};

export const ProductService = {
  createProduct,
  getProducts,
  getProductById,
};


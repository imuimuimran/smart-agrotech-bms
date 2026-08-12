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

/**
 * Enterprise Core Service for Defensive Product Modifications
 */
const updateProduct = async (productId, updateData, reqUser) => {
  // Fetch current product record state securely
  const product = await Product.findOne({
    _id: productId,
    isDeleted: false,
  });

  if (!product) {
    throw new ApiError(httpStatus.NOT_FOUND, PRODUCT_MESSAGES.NOT_FOUND);
  }

  // Defensive Multi-Field Allowlist Mapping Strategy (Rule 8.8.11)
  const allowedUpdates = {
    productName: updateData.productName,
    productType: updateData.productType,
    shortDescription: updateData.shortDescription,
    description: updateData.description,
    categoryId: updateData.categoryId,
    brandId: updateData.brandId,
    unit: updateData.unit,
    status: updateData.status,
  };

  // Process Flattened Fields into Document Object
  Object.entries(allowedUpdates).forEach(([key, value]) => {
    if (value !== undefined) {
      product[key] = value;
    }
  });

  // Handle Complex Nested Pricing Objects with State Awareness (Rule 8.8.14)
  if (updateData.pricing) {
    const nextSellingPrice =
      updateData.pricing.sellingPrice !== undefined
        ? updateData.pricing.sellingPrice
        : product.pricing.sellingPrice;

    const nextMinimumSellingPrice =
      updateData.pricing.minimumSellingPrice !== undefined
        ? updateData.pricing.minimumSellingPrice
        : product.pricing.minimumSellingPrice;

    if (nextSellingPrice < nextMinimumSellingPrice) {
      throw new ApiError(
        httpStatus.BAD_REQUEST,
        "Selling price cannot be lower than minimum selling price."
      );
    }

    // Safely transfer pricing modifications down to model subpaths
    Object.entries(updateData.pricing).forEach(([key, value]) => {
      if (value !== undefined) {
        product.pricing[key] = value;
      }
    });
  }

  // Handle Nested Tax Updates
  if (updateData.tax) {
    Object.entries(updateData.tax).forEach(([key, value]) => {
      if (value !== undefined) {
        product.tax[key] = value;
      }
    });
  }

  // Handle Nested Inventory Config Updates
  if (updateData.inventoryConfig) {
    Object.entries(updateData.inventoryConfig).forEach(([key, value]) => {
      if (value !== undefined) {
        product.inventoryConfig[key] = value;
      }
    });
  }

  // Handle Image Collection Replacements
  if (updateData.images) {
    product.images = updateData.images;
  }

  // Assign Trace Audit Signature Information (Rule 8.8.26)
  product.updatedBy = reqUser.publicId;

  // Persist into MongoDB Atlas Layer
  await product.save();

  // Fetch clean populated document graph for application response lookups
  const updatedProduct = await Product.findById(product._id)
    .populate("categoryId", "publicId categoryName categoryCode")
    .populate("brandId", "publicId brandName brandCode")
    .lean();

  return sanitizeProduct(updatedProduct);
};

export const ProductService = {
  createProduct,
  getProducts,
  getProductById,
  updateProduct,
};



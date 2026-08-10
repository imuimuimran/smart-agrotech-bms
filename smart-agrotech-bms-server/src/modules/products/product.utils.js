import { 
  PRODUCT_PUBLIC_ID_PREFIX,
  PRODUCT_SEARCHABLE_FIELDS,
  PRODUCT_SORTABLE_FIELDS,
  PRODUCT_DEFAULT_SORT, 
} from "./product.constants.js";

/**
 * Trims and uppercase strings for identifiers like SKUs and Product Codes
 */
export const normalizeProductIdentifier = (value) => {
  if (typeof value !== "string") {
    return value;
  }
  return value.trim().toUpperCase();
};

/**
 * Normalizes barcodes ensuring numeric strings don't lose leading zeros
 */
export const normalizeBarcode = (value) => {
  if (typeof value !== "string") {
    return value;
  }
  return value.trim();
};

/**
 * Formats sequential integer keys into stable fixed-width public IDs
 */
export const formatProductPublicId = (sequence) => {
  return `${PRODUCT_PUBLIC_ID_PREFIX}-${String(sequence).padStart(6, "0")}`;
};

/**
 * Processes and cleans full product data fields before persistence layers execute
 */
export const normalizeProductPayload = (payload) => {
  const normalized = { ...payload };

  if (normalized.productName) {
    normalized.productName = normalized.productName.trim();
  }
  if (normalized.productCode) {
    normalized.productCode = normalizeProductIdentifier(normalized.productCode);
  }
  if (normalized.sku) {
    normalized.sku = normalizeProductIdentifier(normalized.sku);
  }
  if (normalized.barcode) {
    normalized.barcode = normalizeBarcode(normalized.barcode);
  }
  if (normalized.unit) {
    normalized.unit = normalized.unit.trim();
  }

  return normalized;
};

/**
 * Normalizes product media items ensuring structural text cleanup and primary flag safety
 */
export const normalizeProductImages = (images = []) => {
  if (!Array.isArray(images)) {
    return [];
  }
  let primaryFound = false;
  return images.map((image) => {
    const normalizedImage = {
      ...image,
      url: typeof image.url === "string" ? image.url.trim() : image.url,
      alt: typeof image.alt === "string" ? image.alt.trim() : "",
    };

    if (normalizedImage.isPrimary && !primaryFound) {
      primaryFound = true;
      normalizedImage.isPrimary = true;
    } else {
      normalizedImage.isPrimary = false;
    }
    return normalizedImage;
  });
};

/**
 * Sanitizes MongoDB documents by removing properties like __v before client transit
 */
export const sanitizeProduct = (product) => {
  if (!product) {
    return null;
  }
  const productObject = product.toObject ? product.toObject() : product;
  const { __v, ...safeProduct } = productObject;
  return safeProduct;
};

/**
 * Escape Search Input to Prevent Injection Attacks
 */
export const escapeRegex = (value) => {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
};

/**
 * Build Safe MongoDB Filter Pipeline
 */
export const buildProductFilter = (query) => {
  const filter = { isDeleted: false }; // Base filter locks out soft-deleted records

  if (query.search) {
    const regex = new RegExp(escapeRegex(query.search), "i");
    filter.$or = PRODUCT_SEARCHABLE_FIELDS.map((field) => ({
      [field]: regex,
    }));
  }

  if (query.categoryId) filter.categoryId = query.categoryId;
  if (query.brandId) filter.brandId = query.brandId;
  if (query.productType) filter.productType = query.productType;
  if (query.status) filter.status = query.status;
  if (query.unit) filter.unit = query.unit;

  // Price range snapshot criteria filtering mapping
  if (query.minPrice !== undefined || query.maxPrice !== undefined) {
    filter["pricing.sellingPrice"] = {};
    if (query.minPrice !== undefined) {
      filter["pricing.sellingPrice"].$gte = query.minPrice;
    }
    if (query.maxPrice !== undefined) {
      filter["pricing.sellingPrice"].$lte = query.maxPrice;
    }
  }

  return filter;
};

/**
 * Whitelist Wholesome Sort Validation Parser
 */
export const buildProductSort = (sort) => {
  if (!sort) {
    return PRODUCT_DEFAULT_SORT;
  }

  const fields = sort.split(",");
  const validFields = fields.filter((field) => {
    const fieldName = field.startsWith("-") ? field.slice(1) : field;
    return PRODUCT_SORTABLE_FIELDS.includes(fieldName);
  });

  if (validFields.length === 0) {
    return PRODUCT_DEFAULT_SORT;
  }

  return validFields.join(" ");
};

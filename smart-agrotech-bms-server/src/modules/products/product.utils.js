import { PRODUCT_PUBLIC_ID_PREFIX } from "./product.constants.js";

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

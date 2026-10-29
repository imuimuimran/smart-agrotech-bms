// src/api/endpoints.js

export const API_ENDPOINTS = {
  HEALTH: "/health",
  AUTH: {
    LOGIN: "/auth/login",
    LOGOUT: "/auth/logout",
    CURRENT_USER: "/auth/me",
  },
  // Aligned exactly with your audited backend route signatures
  PRODUCTS: {
    LIST: "/products",
    DETAILS: (id) => `/products/${id}`,
    CREATE: "/products",
    UPDATE: (id) => `/products/${id}`,
    DELETE: (id) => `/products/${id}`,
    // RESTORE: (publicId) => `/products/${publicId}/restore`,
  },
  CATEGORIES: {
    LIST: "/product-categories",
    DETAILS: (publicId) => `/product-categories/${encodeURIComponent(publicId)}`,
    CREATE: "/product-categories",
    UPDATE: (publicId) => `/product-categories/${encodeURIComponent(publicId)}`,
    DELETE: (publicId) => `/product-categories/${encodeURIComponent(publicId)}`,
    DELETED: "/product-categories/deleted",
    RESTORE: (publicId) => `/product-categories/${encodeURIComponent(publicId)}/restore`,
  },
  // Verified backend configuration resource collection paths
  BRANDS: {
    LIST: "/brands",
    DETAILS: (publicId) => `/brands/${encodeURIComponent(publicId)}`,
    CREATE: "/brands",
    UPDATE: (publicId) => `/brands/${encodeURIComponent(publicId)}`,
    DELETE: (publicId) => `/brands/${encodeURIComponent(publicId)}`,
    RESTORE: (publicId) => `/brands/${encodeURIComponent(publicId)}/restore`,
    DELETED: "/brands/deleted",
  },
};

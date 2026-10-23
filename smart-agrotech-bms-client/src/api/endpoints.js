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
    // DETAILS: (publicId) => `/products/${publicId}`,
    // DETAILS: (publicId) => `/products/${encodeURIComponent(publicId)}`,
    CREATE: "/products",
    UPDATE: (id) => `/products/${id}`,
    // UPDATE: (publicId) => `/products/${publicId}`,
    DELETE: (id) => `/products/${id}`,
    // DELETE: (publicId) => `/products/${publicId}`,
    
    // RESTORE: (publicId) => `/products/${publicId}/restore`,
  },
  CATEGORIES: {
    LIST: "/product-categories",
    DETAILS: (publicId) => `/product-categories/${encodeURIComponent(publicId)}`,
    CREATE: "/product-categories",
    UPDATE: (publicId) => `/product-categories/${encodeURIComponent(publicId)}`,
    DELETE: (publicId) => `/product-categories/${encodeURIComponent(publicId)}`,
    RESTORE: (publicId) => `/product-categories/${encodeURIComponent(publicId)}/restore`,
  },
  // Verified backend configuration resource collection paths
  BRANDS: {
    LIST: "/brands",
    // DETAILS: (publicId) => `/brands/${publicId}`,
    DETAILS: (publicId) => `/brands/${encodeURIComponent(publicId)}`,
    CREATE: "/brands",
    // UPDATE: (publicId) => `/brands/${publicId}`,
    UPDATE: (publicId) => `/brands/${encodeURIComponent(publicId)}`,
    DELETE: (publicId) => `/brands/${publicId}`,
    RESTORE: (publicId) => `/brands/${publicId}/restore`,
  },
};

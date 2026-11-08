// src/api/endpoints.js

export const API_ENDPOINTS = {
  HEALTH: "/health",
  AUTH: {
    LOGIN: "/auth/login",
    LOGOUT: "/auth/logout",
    CURRENT_USER: "/auth/me",
  },

  PRODUCTS: {
    LIST: "/products",
    DETAILS: (publicId) =>
      `/products/${encodeURIComponent(publicId)}`,
    CREATE: "/products",
    UPDATE: (publicId) =>
      `/products/${encodeURIComponent(publicId)}`,
    DELETE: (publicId) =>
      `/products/${encodeURIComponent(publicId)}`,
    DELETED: "/products/deleted",
    RESTORE: (publicId) =>
      `/products/${encodeURIComponent(publicId)}/restore`,
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

  SUPPLIERS: {
    LIST: "/suppliers",
    DETAILS: (publicId) => `/suppliers/${encodeURIComponent(publicId)}`,
    CREATE: "/suppliers",
    UPDATE: (publicId) => `/suppliers/${encodeURIComponent(publicId)}`,
    DELETE: (publicId) => `/suppliers/${encodeURIComponent(publicId)}`,
    DELETED: "/suppliers/deleted",
    RESTORE: (publicId) => `/suppliers/${encodeURIComponent(publicId)}/restore`,
    STATISTICS: "/suppliers/statistics/overview",
    DASHBOARD_SUMMARY: "/suppliers/dashboard/summary",
  },
};

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
  },
};

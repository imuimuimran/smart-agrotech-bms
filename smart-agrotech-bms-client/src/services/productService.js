// src/services/productService.js

import { apiClient } from "../api/apiClient"; // Preserves verified explicit named network client import
import { API_ENDPOINTS } from "../api/endpoints"; // Preserves verified explicit named endpoints import

export const ProductService = {
  /**
   * Fetches the products collection from the server.
   * Supports passing structured query parameter objects down to the QueryBuilder engine.
   */
  async getProducts(params = {}) {
    const response = await apiClient.get(
      API_ENDPOINTS.PRODUCTS.LIST,
      { params }
    );
    return response.data;
  },

  /**
   * Resolves an isolated single product profile document matching its unique parametric ID.
   */
  async getProductById(id) {
    const response = await apiClient.get(
      API_ENDPOINTS.PRODUCTS.DETAILS(id)
    );
    return response.data;
  },

  /**
   * Submits a fresh product validation payload block to the server.
   */
  async createProduct(payload) {
    const response = await apiClient.post(
      API_ENDPOINTS.PRODUCTS.CREATE,
      payload
    );
    return response.data;
  },

  /**
   * Executes a partial modification check against an explicit target document row.
   * Enforces the HTTP PATCH verb pattern strictly per backend routing constraints.
   */
  async updateProduct(id, payload) {
    const response = await apiClient.patch(
      API_ENDPOINTS.PRODUCTS.UPDATE(id),
      payload
    );
    return response.data;
  },

  /**
   * Directs the backend server to trigger a soft-delete execution toggle against a target record.
   */
  async deleteProduct(id) {
    const response = await apiClient.delete(
      API_ENDPOINTS.PRODUCTS.DELETE(id)
    );
    return response.data;
  },
};

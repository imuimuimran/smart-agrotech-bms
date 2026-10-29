// src/services/categoryService.js

import { apiClient } from "../api/apiClient";
import { API_ENDPOINTS } from "../api/endpoints";

export const CategoryService = {
  /**
   * Fetch categories with backend-supported query parameters.
   * Supported parameters: search, page, limit, sortBy, sortOrder, fields,
   * status, and parentCategory.
   * Returns the server response body, including { success, message, meta, data }.
   */

  getCategories: async (params = {}) => {
    const response = await apiClient.get(
      API_ENDPOINTS.CATEGORIES.LIST,
      { params }
    );

    return response.data;
  },

  getCategory: async (publicId) => {
    const response = await apiClient.get(
      `${API_ENDPOINTS.CATEGORIES.LIST}/${encodeURIComponent(publicId)}`
    );

    return response.data;
  },

  /**
   * Fetch a category by publicId (e.g. CAT-100003), not MongoDB _id.
   */
  async getCategoryByPublicId(publicId) {
    const response = await apiClient.get(
      API_ENDPOINTS.CATEGORIES.DETAILS(publicId)
    );
    return response.data;
  },

  async createCategory(payload) {
    const response = await apiClient.post(
      API_ENDPOINTS.CATEGORIES.CREATE,
      payload
    );
    return response.data;
  },

  updateCategory: async (publicId, payload) => {
    const response = await apiClient.patch(
      `${API_ENDPOINTS.CATEGORIES.LIST}/${encodeURIComponent(publicId)}`,
      payload
    );

    return response.data;
  },

  /**
   * Soft-delete. The backend restricts this operation to admins.
   */
  async deleteCategory(publicId) {
    const response = await apiClient.delete(
      `${API_ENDPOINTS.CATEGORIES.LIST}/${encodeURIComponent(publicId)}`
    );

    return response.data;
  },

  /**
   * Fetch soft-deleted categories. The backend restricts this to admins.
   */
  async getDeletedCategories(params = {}) {
    const response = await apiClient.get(API_ENDPOINTS.CATEGORIES.DELETED, {
      params,
    });
    return response.data;
  },

  /**
   * Restore a soft-deleted category. The backend restricts this to admins.
   */
  async restoreCategory(publicId) {
    const response = await apiClient.patch(
      API_ENDPOINTS.CATEGORIES.RESTORE(publicId)
    );
    return response.data;
  },
};

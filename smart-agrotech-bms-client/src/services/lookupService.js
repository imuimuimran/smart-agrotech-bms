// src/services/lookupService.js
import { apiClient } from "../api/apiClient";
import { API_ENDPOINTS } from "../api/endpoints";

export const LookupService = {
  async getCategories() {
    const response = await apiClient.get(API_ENDPOINTS.CATEGORIES.LIST);
    // Accommodates standard backend query arrays cleanly
    return response.data?.data || response.data || [];
  },

  async getBrands() {
    const response = await apiClient.get(API_ENDPOINTS.BRANDS.LIST);
    return response.data?.data || response.data || [];
  },
};

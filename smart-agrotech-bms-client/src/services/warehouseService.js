import { apiClient } from "../api/apiClient";
import { API_ENDPOINTS } from "../api/endpoints";

export const WarehouseService = {
  async getWarehouses(params = {}) {
    const response = await apiClient.get(API_ENDPOINTS.WAREHOUSES.LIST, { params });
    return response.data;
  },

  async createWarehouse(payload) {
    const response = await apiClient.post(API_ENDPOINTS.WAREHOUSES.CREATE, payload);
    return response.data;
  },
};


import { apiClient } from "../api/apiClient";
import { API_ENDPOINTS } from "../api/endpoints";

export const WarehouseService = {
  /**
   * Retrieves active warehouses for operational workflows,
   * including the Sales creation form.
   *
   * The backend returns:
   * { success, message, meta, data }
   */
  async getWarehouses(params = {}) {
    const response = await apiClient.get(
      API_ENDPOINTS.WAREHOUSES.LIST,
      { params }
    );

    return response.data;
  },
};

export default WarehouseService;

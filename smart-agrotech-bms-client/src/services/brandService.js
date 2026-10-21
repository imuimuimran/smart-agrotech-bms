import { apiClient } from "../api/apiClient";
import { API_ENDPOINTS } from "../api/endpoints";

const BrandService = {
  async getBrands(params = {}) {
    const response = await apiClient.get(API_ENDPOINTS.BRANDS.LIST, {
      params,
    });

    return response.data;
  },

  async getBrand(publicId) {
    const response = await apiClient.get(
      API_ENDPOINTS.BRANDS.DETAILS(encodeURIComponent(publicId))
    );

    return response.data;
  },

  async createBrand(payload) {
    const response = await apiClient.post(
      API_ENDPOINTS.BRANDS.CREATE,
      payload
    );

    return response.data;
  },

  async updateBrand(publicId, payload) {
    const response = await apiClient.patch(
      API_ENDPOINTS.BRANDS.UPDATE(encodeURIComponent(publicId)),
      payload
    );

    return response.data;
  },

  async deleteBrand(publicId) {
    const response = await apiClient.delete(
      API_ENDPOINTS.BRANDS.DELETE(encodeURIComponent(publicId))
    );

    return response.data;
  },

  async restoreBrand(publicId) {
    const response = await apiClient.patch(
      API_ENDPOINTS.BRANDS.RESTORE(encodeURIComponent(publicId))
    );

    return response.data;
  },
};

export default BrandService;

// // src/services/supplierService.js

// import { apiClient } from "../api/apiClient";
// import { API_ENDPOINTS } from "../api/endpoints";

// export const SupplierService = {
//   // Fetch suppliers with backend-supported query options.
//   async getSuppliers(params = {}) {
//     const response = await apiClient.get(
//       API_ENDPOINTS.SUPPLIERS.LIST,
//       { params }
//     );

//     return response.data;
//   },

//   // Fetch one supplier using its publicId (e.g. SUP-100001).
//   async getSupplierById(publicId) {
//     const response = await apiClient.get(
//       API_ENDPOINTS.SUPPLIERS.DETAILS(publicId)
//     );

//     return response.data;
//   },

//   // Create a supplier.
//   async createSupplier(payload) {
//     const response = await apiClient.post(
//       API_ENDPOINTS.SUPPLIERS.CREATE,
//       payload
//     );

//     return response.data;
//   },

//   // Partially update a supplier using its publicId.
//   async updateSupplier(publicId, payload) {
//     const response = await apiClient.patch(
//       API_ENDPOINTS.SUPPLIERS.UPDATE(publicId),
//       payload
//     );

//     return response.data;
//   },

//   // Soft-delete a supplier using its publicId.
//   async deleteSupplier(publicId) {
//     const response = await apiClient.delete(
//       API_ENDPOINTS.SUPPLIERS.DELETE(publicId)
//     );

//     return response.data;
//   },

//   // Fetch supplier statistics.
//   async getSupplierStatistics() {
//     const response = await apiClient.get(
//       API_ENDPOINTS.SUPPLIERS.STATISTICS
//     );

//     return response.data;
//   },

//   // Fetch supplier dashboard summary.
//   async getSupplierDashboardSummary() {
//     const response = await apiClient.get(
//       API_ENDPOINTS.SUPPLIERS.DASHBOARD_SUMMARY
//     );

//     return response.data;
//   },
// };



import { apiClient } from "../api/apiClient";
import { API_ENDPOINTS } from "../api/endpoints";

export const SupplierService = {
  async getSuppliers(params = {}) {
    const response = await apiClient.get(API_ENDPOINTS.SUPPLIERS.LIST, { params });
    return response.data;
  },

  async getSupplierById(publicId) {
    const response = await apiClient.get(API_ENDPOINTS.SUPPLIERS.DETAILS(publicId));
    return response.data;
  },

  async createSupplier(payload) {
    const response = await apiClient.post(API_ENDPOINTS.SUPPLIERS.CREATE, payload);
    return response.data;
  },

  async updateSupplier(publicId, payload) {
    const response = await apiClient.patch(API_ENDPOINTS.SUPPLIERS.UPDATE(publicId), payload);
    return response.data;
  },

  async deleteSupplier(publicId) {
    const response = await apiClient.delete(API_ENDPOINTS.SUPPLIERS.DELETE(publicId));
    return response.data;
  },

  // Fetch only soft-deleted suppliers. This endpoint is ADMIN-only.
  async getDeletedSuppliers() {
    const response = await apiClient.get(API_ENDPOINTS.SUPPLIERS.DELETED);
    return response.data;
  },

  // Restore a supplier by its publicId (e.g. SUP-100001). This endpoint is ADMIN-only.
  async restoreSupplier(publicId) {
    const response = await apiClient.patch(API_ENDPOINTS.SUPPLIERS.RESTORE(publicId));
    return response.data;
  },

  async getSupplierStatistics() {
    const response = await apiClient.get(API_ENDPOINTS.SUPPLIERS.STATISTICS);
    return response.data;
  },

  async getSupplierDashboardSummary() {
    const response = await apiClient.get(API_ENDPOINTS.SUPPLIERS.DASHBOARD_SUMMARY);
    return response.data;
  },
};

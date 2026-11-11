import { apiClient } from "../api/apiClient";
import { API_ENDPOINTS } from "../api/endpoints";

// These are the query parameters supported by the Customers backend.
// QueryBuilder applies search, filtering, sorting, pagination, and field selection.
const CUSTOMER_LIST_QUERY_PARAMS = [
  "search",
  "page",
  "limit",
  "sortBy",
  "sortOrder",
  "fields",
  "status",
  "customerType",
  "membershipLevel",
  "companyName",
];

const pickCustomerListParams = (params = {}) =>
  Object.fromEntries(
    Object.entries(params).filter(([key, value]) =>
      CUSTOMER_LIST_QUERY_PARAMS.includes(key) && value !== undefined && value !== null && value !== ""
    )
  );

export const CustomerService = {
  /**
   * Get customers using only query parameters supported by the backend.
   * Returns the response body: { success, message, meta, data }.
   */
  async getCustomers(params = {}) {
    const response = await apiClient.get(API_ENDPOINTS.CUSTOMERS.LIST, {
      params: pickCustomerListParams(params),
    });
    return response.data;
  },

  /**
   * Get one customer by publicId (for example, CUS-100001), not MongoDB _id.
   */
  async getCustomerById(publicId) {
    const response = await apiClient.get(
      API_ENDPOINTS.CUSTOMERS.DETAILS(publicId)
    );
    return response.data;
  },

  /**
   * Create a customer. The backend generates publicId and audit fields.
   */
  async createCustomer(payload) {
    const response = await apiClient.post(
      API_ENDPOINTS.CUSTOMERS.CREATE,
      payload
    );
    return response.data;
  },

  /**
   * Update an existing customer by publicId.
   */
  async updateCustomer(publicId, payload) {
    const response = await apiClient.patch(
      API_ENDPOINTS.CUSTOMERS.UPDATE(publicId),
      payload
    );
    return response.data;
  },

  /**
   * Soft-delete a customer by publicId.
   * The backend allows this operation only for ADMIN users and rejects
   * deletion when the customer has an outstanding balance.
   */
  async deleteCustomer(publicId) {
    const response = await apiClient.delete(
      API_ENDPOINTS.CUSTOMERS.DELETE(publicId)
    );
    return response.data;
  },

  /**
   * Get customer statistics. This endpoint is available to ADMIN and MODERATOR.
   */
  async getCustomerStatistics() {
    const response = await apiClient.get(
      API_ENDPOINTS.CUSTOMERS.STATISTICS
    );
    return response.data;
  },
};

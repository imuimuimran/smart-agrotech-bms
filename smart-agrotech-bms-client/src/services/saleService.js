
import { apiClient } from "../api/apiClient";
import { API_ENDPOINTS } from "../api/endpoints";

// Query parameters supported by the Sales list endpoint.
// sortOrder is intentionally excluded: the supplied backend
// QueryBuilder uses sortBy, not sortOrder.
const SALE_LIST_QUERY_PARAMS = [
  "search",
  "page",
  "limit",
  "sortBy",
  "sortOrder",
  "fields",
  "customerId",
  "warehouseId",
  "status",
  "paymentStatus",
];

const pickSaleListParams = (params = {}) =>
  Object.fromEntries(
    Object.entries(params).filter(
      ([key, value]) =>
        SALE_LIST_QUERY_PARAMS.includes(key) &&
        value !== undefined &&
        value !== null &&
        value !== ""
    )
  );

export const SaleService = {
  /**
   * Get paginated and filtered sales.
   *
   * Response:
   * { success, message, meta, data }
   */
  async getSales(params = {}) {
    const response = await apiClient.get(
      API_ENDPOINTS.SALES.LIST,
      {
        params: pickSaleListParams(params),
      }
    );

    return response.data;
  },

  /**
   * Get one sale using its publicId, e.g. SALE-100001.
   *
   * Permission: ADMIN, MODERATOR.
   */
  async getSaleByPublicId(publicId) {
    if (!publicId || typeof publicId !== "string") {
      throw new Error("A valid sale public ID is required.");
    }

    const response = await apiClient.get(
      API_ENDPOINTS.SALES.DETAILS(publicId)
    );

    return response.data;
  },

  /**
   * Create a sale.
   *
   * Customer, warehouse and product references in the
   * payload must be MongoDB ObjectIds, as required by
   * the backend validation schema.
   *
   * Permission: ADMIN, MODERATOR.
   */
  async createSale(payload) {
    const response = await apiClient.post(
      API_ENDPOINTS.SALES.CREATE,
      payload
    );

    return response.data;
  },

  /**
   * Record a payment against an existing sale.
   *
   * Permission: ADMIN only.
   *
   * Payload:
   * {
   *   amount: number,
   *   paymentMethod: string,
   *   reference?: string,
   *   comment?: string
   * }
   */
  async recordSalePayment(publicId, payload) {
    if (!publicId || typeof publicId !== "string") {
      throw new Error("A valid sale public ID is required.");
    }

    const response = await apiClient.post(
      API_ENDPOINTS.SALES.RECORD_PAYMENT(publicId),
      payload
    );

    return response.data;
  },
};

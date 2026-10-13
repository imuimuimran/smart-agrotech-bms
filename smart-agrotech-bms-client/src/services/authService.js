import { apiClient } from "../api/apiClient";
import { API_ENDPOINTS } from "../api/endpoints";

export const AuthService = {
  /**
   * Authenticates user against the server contract using centralized paths.
   */
  async login(credentials) {
    const response = await apiClient.post(
      API_ENDPOINTS.AUTH.LOGIN,
      credentials
    );
    return response.data.data;
  },

  /**
   * Resolves the profile matching the active authenticated session context.
   */
  async getCurrentUser() {
    const response = await apiClient.get(
      API_ENDPOINTS.AUTH.CURRENT_USER
    );
    return response.data.data;
  },

  /**
   * Notifies server to clear the active authentication token context.
   */
  async logout() {
    const response = await apiClient.post(
      API_ENDPOINTS.AUTH.LOGOUT
    );
    return response.data;
  },
};
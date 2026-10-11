import { apiClient } from "../api/apiClient";

export const AuthService = {
  /**
   * Authenticates user against the server contract.
   * Expects response envelope structure to match: response.data.data -> { token, user }
   */
  async login(credentials) {
    const response = await apiClient.post("/auth/login", credentials);
    return response.data.data;
  },

  /**
   * Resolves the profile matching the active authenticated session context.
   */
  async getCurrentUser() {
    const response = await apiClient.get("/auth/me");
    return response.data.data;
  },

  /**
   * Notifies server to clear the active authentication token context.
   */
  async logout() {
    const response = await apiClient.post("/auth/logout");
    return response.data;
  },
};

// src/api/apiClient.js
import axios from "axios";

const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL || "http://localhost:5000/api/v1";

export const apiClient = axios.create({
  baseURL: API_BASE_URL,
  timeout: 15000,
  withCredentials: true,
  headers: {
    "Content-Type": "application/json",
  },
});

/**
 * Request Interceptor Firewall
 * Automatically attaches the server-controlled active JWT token from sessionStorage.
 */
apiClient.interceptors.request.use(
  (config) => {
    const token = sessionStorage.getItem("bms_access_token");
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

/**
 * Response Interceptor Firewall
 * Intercepts network failures and flushes out stale session states on authorization failures.
 */
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      sessionStorage.removeItem("bms_access_token");
    }
    return Promise.reject(error);
  }
);

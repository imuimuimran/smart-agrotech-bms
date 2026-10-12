// src/contexts/AuthContext.jsx
import { useCallback, useEffect, useState } from "react";
import { AuthService } from "../services/authService";
import { AuthContext } from "./contextRegistry.js";

// export const AuthContext = createContext(null);
const TOKEN_KEY = "bms_access_token";

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  const refreshUser = useCallback(async () => {
    const token = sessionStorage.getItem(TOKEN_KEY);
    if (!token) {
      setUser(null);
      return null;
    }
    try {
      const currentUser = await AuthService.getCurrentUser();
      setUser(currentUser);
      return currentUser;
    } catch (error) {
      if (error.response?.status === 401) {
        sessionStorage.removeItem(TOKEN_KEY);
        setUser(null);
      }
      throw error;
    }
  }, []);

  useEffect(() => {
    let active = true;
    async function initializeAuth() {
      try {
        if (sessionStorage.getItem(TOKEN_KEY)) {
          await refreshUser();
        }
      } catch (error) {
        console.error("Authentication initialization failed:", error);
      } finally {
        if (active) {
          setIsLoading(false);
        }
      }
    }
    initializeAuth();
    return () => {
      active = false;
    };
  }, [refreshUser]);

  const login = useCallback(async (credentials) => {
    const result = await AuthService.login(credentials);
    if (!result?.token || !result?.user) {
      throw new Error("Invalid login response configuration packet received from server.");
    }
    sessionStorage.setItem(TOKEN_KEY, result.token);
    setUser(result.user);
    return result.user;
  }, []);

  const logout = useCallback(async () => {
    try {
      await AuthService.logout();
    } finally {
      sessionStorage.removeItem(TOKEN_KEY);
      setUser(null);
    }
  }, []);

  const value = {
    user,
    isLoading,
    isAuthenticated: Boolean(user),
    login,
    logout,
    refreshUser,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

// export function useAuth() {
//   const context = useContext(AuthContext);
//   if (!context) {
//     throw new Error("useAuth hook execution must be used inside an active AuthProvider container.");
//   }
//   return context;
// }

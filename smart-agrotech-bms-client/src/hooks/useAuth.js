// src/hooks/useAuth.js
import { useContext } from "react";
// import { AuthContext } from "../contexts/AuthContext";
// import { AuthContext } from "../contexts/AuthContext.jsx;"
import { AuthContext } from "../contexts/contextRegistry.js";

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth hook execution must be used inside an active AuthProvider container.");
  }
  return context;
}

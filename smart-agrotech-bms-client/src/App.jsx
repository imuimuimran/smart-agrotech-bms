// src/App.jsx
import React from "react";
import { Navigate, Route, Routes } from "react-router-dom";
import { LoginPage } from "./pages/auth/LoginPage"; // FIX: Enforce explicit named import
import { ProtectedRoute } from "./routes/ProtectedRoute"; // FIX: Enforce explicit named import

function HomePlaceholder() {
  return (
    <main className="p-8">
      <h1 className="text-2xl font-bold text-slate-900">
        Dashboard placeholder
      </h1>
      <p className="mt-2 text-slate-600">
        Authentication is working. The dashboard will be implemented next.
      </p>
    </main>
  );
}

function ForbiddenPage() {
  return (
    <main className="p-8">
      <h1 className="text-2xl font-bold text-red-700">Access denied</h1>
      <p className="mt-2 text-slate-600">
        You do not have permission to access this page.
      </p>
    </main>
  );
}

export function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/forbidden" element={<ForbiddenPage />} />
      <Route
        path="/"
        element={
          <ProtectedRoute>
            <HomePlaceholder />
          </ProtectedRoute>
        }
      />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

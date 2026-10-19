// src/App.jsx
import { Navigate, Route, Routes } from "react-router-dom";
import { LoginPage } from "./pages/auth/LoginPage.jsx"; 
import { ProtectedRoute } from "./routes/ProtectedRoute.jsx"; 
import { AppLayout } from "./layouts/AppLayout.jsx"
import { DashboardPage } from "./pages/dashboard/DashboardPage.jsx";
import { ProductsPage } from "./pages/products/ProductsPage";
import CategoriesPage from "./pages/categories/CategoriesPage.jsx";
import CategoryDetailsPage from "./pages/categories/CategoryDetailsPage";
import CategoryCreatePage from "./pages/categories/CategoryCreatePage";

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
        element={
          <ProtectedRoute>
            <AppLayout />
          </ProtectedRoute>
        }
      >
        <Route index element={<DashboardPage />} />

        <Route path="/products" element={<ProductsPage />} />

        <Route path="/categories" element={<CategoriesPage />} />

        <Route path="/categories/:publicId" element={<CategoryDetailsPage />} />

        <Route path="/categories/new" element={<CategoryCreatePage />} />
        
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
// src/App.jsx
import { Navigate, Route, Routes } from "react-router-dom";
import { LoginPage } from "./pages/auth/LoginPage.jsx";
import { ProtectedRoute } from "./routes/ProtectedRoute.jsx";
import { AppLayout } from "./layouts/AppLayout.jsx"
import { DashboardPage } from "./pages/dashboard/DashboardPage.jsx";
import { ProductsPage } from "./pages/products/ProductsPage";
// import ProductCreatePage from "./pages/products/ProductCreatePage.jsx";
// import ProductDetailsPage from "./pages/products/ProductDetailsPage.jsx";
// import ProductEditPage from "./pages/products/ProductEditPage.jsx";
import CategoriesPage from "./pages/categories/CategoriesPage.jsx";
import CategoryDetailsPage from "./pages/categories/CategoryDetailsPage";
import CategoryCreatePage from "./pages/categories/CategoryCreatePage";
import CategoryEditPage from "./pages/categories/CategoryEditPage";

import BrandsPage from "./pages/brands/BrandsPage";
import BrandDetailsPage from "./pages/brands/BrandDetailsPage.jsx";
import BrandCreatePage from "./pages/brands/BrandCreatePage.jsx";
import BrandEditPage from "./pages/brands/BrandEditPage";

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

        {/* <Route path="/products/new" element={<ProductCreatePage />} />

        <Route path="/products/:id" element={<ProductDetailsPage />} />

        <Route path="/products/:id/edit" element={<ProductEditPage />} /> */}

        <Route path="/categories" element={<CategoriesPage />} />

        <Route path="/categories/:publicId" element={<CategoryDetailsPage />} />

        <Route path="/categories/new" element={<CategoryCreatePage />} />

        <Route path="/categories/:publicId/edit" element={<CategoryEditPage />} />

        <Route path="/brands" element={<BrandsPage />} />

        <Route path="/brands/:publicId" element={<BrandDetailsPage />} />
        
        <Route path="/brands/new" element={<BrandCreatePage />} />

        <Route path="/brands/:publicId/edit" element={<BrandEditPage />} />

      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
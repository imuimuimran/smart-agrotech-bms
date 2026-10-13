// src/pages/products/ProductsPage.jsx
import { useEffect, useState } from "react";
import { ProductService } from "../../services/productService";
import { Button } from "../../components/ui/Button";
import { Card } from "../../components/ui/Card";
import { LoadingSpinner } from "../../components/ui/LoadingSpinner";

export function ProductsPage() {
  const [products, setProducts] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let isMounted = true;
    
    async function loadProducts() {
      try {
        setIsLoading(true);
        setError("");
        
        const response = await ProductService.getProducts();
        // Standard structural extraction from server response context envelop
        const items = response?.data;
        
        if (!Array.isArray(items)) {
          throw new Error(
            "Unexpected products response layer format encountered. Please verify data properties structure."
          );
        }
        
        if (isMounted) {
          setProducts(items);
        }
      } catch (err) {
        if (isMounted) {
          setError(
            err.response?.data?.message ||
            err.message ||
            "Failed to load products from server."
          );
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    }
    
    loadProducts();
    
    return () => {
      isMounted = false;
    };
  }, []);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            Products
          </h1>
          <p className="mt-1 text-sm text-gray-500">
            View and manage your product catalog.
          </p>
        </div>
        <Button disabled>
          Add Product
        </Button>
      </div>

      <Card>
        {isLoading ? (
          <div className="flex justify-center py-12">
            <LoadingSpinner label="Retrieving system product matrix catalog..." />
          </div>
        ) : error ? (
          <div
            className="rounded-lg bg-red-50 p-4 text-sm text-red-700"
            role="alert"
          >
            {error}
          </div>
        ) : products.length === 0 ? (
          <p className="py-10 text-center text-sm text-gray-500">
            No products found in system storage catalog matrix.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200 text-sm">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left font-semibold text-gray-600">
                    Product
                  </th>
                  <th className="px-4 py-3 text-left font-semibold text-gray-600">
                    SKU
                  </th>
                  <th className="px-4 py-3 text-left font-semibold text-gray-600">
                    Price
                  </th>
                  <th className="px-4 py-3 text-left font-semibold text-gray-600">
                    Stock
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 bg-white">
                {products.map((product) => (
                  <tr key={product._id || product.id}>
                    <td className="whitespace-nowrap px-4 py-3 font-medium text-gray-900">
                      {product.productName || product.name || "—"}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-gray-600">
                      {product.sku || "—"}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-gray-600">
                      {product.price !== undefined ? `${product.price}` : "—"}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-gray-600">
                      {product.currentStock ?? product.quantity ?? "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
}

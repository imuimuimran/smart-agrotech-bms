// src/pages/products/ProductsPage.jsx
import { useEffect, useState, useCallback } from "react";
import { ProductService } from "../../services/productService";
import { Button } from "../../components/ui/Button";
import { Card } from "../../components/ui/Card";
import { LoadingSpinner } from "../../components/ui/LoadingSpinner";

export function ProductsPage() {
  const [products, setProducts] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");

  const [pagination, setPagination] = useState({
    page: 1,
    limit: 20,
    total: 0,
    totalPages: 0,
    hasNextPage: false,
    hasPreviousPage: false,
  });

  // FIX: Wrapped in useCallback to stop infinite cascading render triggers
  const loadProducts = useCallback(async (pageNumber = 1, currentLimit = 20) => {
    try {
      setIsLoading(true);
      setError("");

      const response = await ProductService.getProducts({
        page: pageNumber,
        limit: currentLimit,
      });

      // Secure extraction based exactly on your server's controller sendResponse envelope
      const items = response?.data;
      const pageInfo = response?.pagination;

      if (!Array.isArray(items)) {
        throw new Error("Product data is missing or not an array format.");
      }

      setProducts(items);

      if (pageInfo) {
        setPagination(pageInfo);
      }


      // if (pageInfo) {
      //   setPagination({
      //     page: Number(pageInfo.page || 1),
      //     limit: Number(pageInfo.limit || 20),
      //     // FIX: If the backend returns 0 due to an unmatched query or cache filter, fall back to the actual visible array item length
      //     total: pageInfo.total > 0 ? pageInfo.total : items.length,
      //     totalPages: pageInfo.totalPages > 0 ? pageInfo.totalPages : Math.ceil(items.length / (pageInfo.limit || 20)),
      //     hasNextPage: typeof pageInfo.hasNextPage === "boolean" ? pageInfo.hasNextPage : false,
      //     hasPreviousPage: typeof pageInfo.hasPreviousPage === "boolean" ? pageInfo.hasPreviousPage : false,
      //   });
      // }

      // if (pageInfo) {
      //   const extractedTotal = Number(pageInfo.total);
      //   const currentLimit = Number(pageInfo.limit || 20);

      //   // Enforce correct value calculations based on actual array rows if numbers are missing
      //   const activeTotal = extractedTotal > 0 ? extractedTotal : items.length;
      //   const activeTotalPages = Number(pageInfo.totalPages) > 0
      //     ? Number(pageInfo.totalPages)
      //     : Math.max(1, Math.ceil(activeTotal / currentLimit));

      //   setPagination({
      //     page: Number(pageInfo.page || 1),
      //     limit: currentLimit,
      //     total: activeTotal,
      //     totalPages: activeTotalPages,
      //     hasNextPage: typeof pageInfo.hasNextPage === "boolean"
      //       ? pageInfo.hasNextPage
      //       : Number(pageInfo.page || 1) < activeTotalPages,
      //     hasPreviousPage: typeof pageInfo.hasPreviousPage === "boolean"
      //       ? pageInfo.hasPreviousPage
      //       : Number(pageInfo.page || 1) > 1,
      //   });
      // }

    } catch (err) {
      setError(
        err.response?.data?.message ||
        err.message ||
        "Failed to load products from server."
      );
    } finally {
      setIsLoading(false);
    }
  }, []); // Empty dependency array ensures it retains a stable identity

  // FIX: Clean effect body without missing dependency gaps
  // useEffect(() => {
  //   loadProducts(1);
  // }, [loadProducts]);

  useEffect(() => {
    async function fetchData() {
      await loadProducts(1);
    }
    fetchData();
  }, [loadProducts]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Products</h1>
          <p className="mt-1 text-sm text-gray-500">View and manage your product catalog.</p>
        </div>
        <Button disabled>Add Product</Button>
      </div>

      <Card className="flex flex-col">
        {isLoading ? (
          <div className="flex justify-center py-12">
            <LoadingSpinner label="Retrieving backend product matrix rows..." />
          </div>
        ) : error ? (
          <div className="rounded-lg bg-red-50 p-4 text-sm text-red-700" role="alert">
            {error}
          </div>
        ) : products.length === 0 ? (
          <p className="py-10 text-center text-sm text-gray-500">No products found.</p>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200 text-sm">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-left font-semibold text-gray-600">Product Detail</th>
                    <th className="px-4 py-3 text-left font-semibold text-gray-600">SKU</th>
                    <th className="px-4 py-3 text-left font-semibold text-gray-600">Price</th>
                    <th className="px-4 py-3 text-left font-semibold text-gray-600">Stock Level</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 bg-white">
                  {products.map((product) => (
                    <tr key={product._id}>
                      <td className="whitespace-nowrap px-4 py-3">
                        <div className="font-medium text-gray-900">{product.productName}</div>
                        <div className="text-xs font-mono font-semibold text-emerald-700">
                          {product.publicId}
                        </div>
                      </td>
                      <td className="whitespace-nowrap px-4 py-3 font-mono text-gray-600">
                        {product.sku || "—"}
                      </td>
                      <td className="whitespace-nowrap px-4 py-3 text-gray-600">
                        {product.pricing?.sellingPrice !== undefined
                          ? `${product.pricing.sellingPrice} BDT`
                          : "—"
                        }
                      </td>
                      <td className="whitespace-nowrap px-4 py-3 text-gray-600">
                        {product.currentStock ?? 0} {product.unit || ""}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="flex items-center justify-between border-t border-slate-200 px-4 py-4 mt-4 bg-slate-50 rounded-b-xl">
              <p className="text-sm text-slate-500 font-medium">
                Page {pagination.page} of {pagination.totalPages}
                {" · "}
                Total {pagination.total} records found
              </p>
              <div className="flex gap-2">
                <Button
                  variant="secondary"
                  disabled={!pagination.hasPreviousPage || isLoading}
                  onClick={() => loadProducts(pagination.page - 1, pagination.limit)}
                >
                  Previous
                </Button>
                <Button
                  variant="primary"
                  disabled={!pagination.hasNextPage || isLoading}
                  onClick={() => loadProducts(pagination.page + 1, pagination.limit)}
                >
                  Next
                </Button>
              </div>
            </div>
          </>
        )}
      </Card>
    </div>
  );
}

// // src/pages/products/ProductsPage.jsx
// import { useEffect, useState, useCallback } from "react";
// import { ProductService } from "../../services/productService";
// import { Button } from "../../components/ui/Button";
// import { Card } from "../../components/ui/Card";
// import { LoadingSpinner } from "../../components/ui/LoadingSpinner";

// export function ProductsPage() {
//   const [products, setProducts] = useState([]);
//   const [isLoading, setIsLoading] = useState(true);
//   const [error, setError] = useState("");

//   const [pagination, setPagination] = useState({
//     page: 1,
//     limit: 20,
//     total: 0,
//     totalPages: 0,
//     hasNextPage: false,
//     hasPreviousPage: false,
//   });

//   // FIX: Wrapped in useCallback to stop infinite cascading render triggers
//   const loadProducts = useCallback(async (pageNumber = 1, currentLimit = 20) => {
//     try {
//       setIsLoading(true);
//       setError("");

//       const response = await ProductService.getProducts({
//         page: pageNumber,
//         limit: currentLimit,
//       });

//       // Secure extraction based exactly on your server's controller sendResponse envelope
//       const items = response?.data;
//       const pageInfo = response?.pagination;

//       if (!Array.isArray(items)) {
//         throw new Error("Product data is missing or not an array format.");
//       }

//       setProducts(items);

//       if (pageInfo) {
//         setPagination(pageInfo);
//       }
//     } catch (err) {
//       setError(
//         err.response?.data?.message ||
//         err.message ||
//         "Failed to load products from server."
//       );
//     } finally {
//       setIsLoading(false);
//     }
//   }, []); // Empty dependency array ensures it retains a stable identity

//   // FIX: Clean effect body without missing dependency gaps
//   // useEffect(() => {
//   //   loadProducts(1);
//   // }, [loadProducts]);

//   useEffect(() => {
//     async function fetchData() {
//       await loadProducts(1);
//     }
//     fetchData();
//   }, [loadProducts]);

//   return (
//     <div className="space-y-6">
//       <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
//         <div>
//           <h1 className="text-2xl font-bold text-gray-900">Products</h1>
//           <p className="mt-1 text-sm text-gray-500">View and manage your product catalog.</p>
//         </div>
//         <Button disabled>Add Product</Button>
//       </div>

//       <Card className="flex flex-col">
//         {isLoading ? (
//           <div className="flex justify-center py-12">
//             <LoadingSpinner label="Retrieving backend product matrix rows..." />
//           </div>
//         ) : error ? (
//           <div className="rounded-lg bg-red-50 p-4 text-sm text-red-700" role="alert">
//             {error}
//           </div>
//         ) : products.length === 0 ? (
//           <p className="py-10 text-center text-sm text-gray-500">No products found.</p>
//         ) : (
//           <>
//             <div className="overflow-x-auto">
//               <table className="min-w-full divide-y divide-gray-200 text-sm">
//                 <thead className="bg-gray-50">
//                   <tr>
//                     <th className="px-4 py-3 text-left font-semibold text-gray-600">Product Detail</th>
//                     <th className="px-4 py-3 text-left font-semibold text-gray-600">SKU</th>
//                     <th className="px-4 py-3 text-left font-semibold text-gray-600">Price</th>
//                     <th className="px-4 py-3 text-left font-semibold text-gray-600">Stock Level</th>
//                   </tr>
//                 </thead>
//                 <tbody className="divide-y divide-gray-100 bg-white">
//                   {products.map((product) => (
//                     <tr key={product._id}>
//                       <td className="whitespace-nowrap px-4 py-3">
//                         <div className="font-medium text-gray-900">{product.productName}</div>
//                         <div className="text-xs font-mono font-semibold text-emerald-700">
//                           {product.publicId}
//                         </div>
//                       </td>
//                       <td className="whitespace-nowrap px-4 py-3 font-mono text-gray-600">
//                         {product.sku || "—"}
//                       </td>
//                       <td className="whitespace-nowrap px-4 py-3 text-gray-600">
//                         {product.pricing?.sellingPrice !== undefined
//                           ? `${product.pricing.sellingPrice} BDT`
//                           : "—"
//                         }
//                       </td>
//                       <td className="whitespace-nowrap px-4 py-3 text-gray-600">
//                         {product.currentStock ?? 0} {product.unit || ""}
//                       </td>
//                     </tr>
//                   ))}
//                 </tbody>
//               </table>
//             </div>

//             <div className="flex items-center justify-between border-t border-slate-200 px-4 py-4 mt-4 bg-slate-50 rounded-b-xl">
//               <p className="text-sm text-slate-500 font-medium">
//                 Page {pagination.page} of {pagination.totalPages}
//                 {" · "}
//                 Total {pagination.total} records found
//               </p>
//               <div className="flex gap-2">
//                 <Button
//                   variant="secondary"
//                   disabled={!pagination.hasPreviousPage || isLoading}
//                   onClick={() => loadProducts(pagination.page - 1, pagination.limit)}
//                 >
//                   Previous
//                 </Button>
//                 <Button
//                   variant="primary"
//                   disabled={!pagination.hasNextPage || isLoading}
//                   onClick={() => loadProducts(pagination.page + 1, pagination.limit)}
//                 >
//                   Next
//                 </Button>
//               </div>
//             </div>
//           </>
//         )}
//       </Card>
//     </div>
//   );
// }





// src/pages/products/ProductsPage.jsx

import { useEffect, useState, useCallback } from "react";
import { ProductService } from "../../services/productService";
import { LookupService } from "../../services/lookupService";
import { Button } from "../../components/ui/Button";
import { Card } from "../../components/ui/Card";
import { Input } from "../../components/ui/Input";
import { LoadingSpinner } from "../../components/ui/LoadingSpinner";

const PAGE_SIZE = 20;

const INITIAL_FILTERS = {
  search: "",
  categoryId: "",
  brandId: "",
  productType: "",
  status: "",
  minPrice: "",
  maxPrice: "",
};

const INITIAL_PAGINATION = {
  page: 1,
  limit: PAGE_SIZE,
  total: 0,
  totalPages: 0,
  hasNextPage: false,
  hasPreviousPage: false,
};

export function ProductsPage() {
  const [products, setProducts] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");

  // Lookup data
  const [categories, setCategories] = useState([]);
  const [brands, setBrands] = useState([]);

  // Filter state
  const [filters, setFilters] = useState(INITIAL_FILTERS);
  const [activeParams, setActiveParams] = useState(INITIAL_FILTERS);

  // Pagination state
  const [pagination, setPagination] = useState(INITIAL_PAGINATION);

  // Load products using the backend's expected query parameters.
  const loadProducts = useCallback(
    async (pageNumber = 1, searchFilters = INITIAL_FILTERS) => {
      try {
        setIsLoading(true);
        setError("");

        const queryParams = {
          page: pageNumber,
          limit: PAGE_SIZE,
        };

        const search = searchFilters.search.trim();

        if (search) {
          queryParams.search = search;
        }

        if (searchFilters.categoryId) {
          queryParams.categoryId = searchFilters.categoryId;
        }

        if (searchFilters.brandId) {
          queryParams.brandId = searchFilters.brandId;
        }

        if (searchFilters.productType) {
          queryParams.productType = searchFilters.productType;
        }

        if (searchFilters.status) {
          queryParams.status = searchFilters.status;
        }

        if (searchFilters.minPrice !== "") {
          queryParams.minPrice = Number(searchFilters.minPrice);
        }

        if (searchFilters.maxPrice !== "") {
          queryParams.maxPrice = Number(searchFilters.maxPrice);
        }

        const response = await ProductService.getProducts(queryParams);

        const items = response?.data;
        const pageInfo = response?.pagination;

        if (!Array.isArray(items)) {
          throw new Error(
            "Product data is missing or not in the expected array format."
          );
        }

        setProducts(items);

        if (pageInfo) {
          setPagination({
            page: Number(pageInfo.page ?? pageNumber),
            limit: Number(pageInfo.limit ?? PAGE_SIZE),
            total: Number(pageInfo.total ?? items.length),
            totalPages: Number(
              pageInfo.totalPages ??
                Math.ceil(items.length / PAGE_SIZE)
            ),
            hasNextPage: Boolean(pageInfo.hasNextPage),
            hasPreviousPage: Boolean(pageInfo.hasPreviousPage),
          });
        } else {
          setPagination({
            page: pageNumber,
            limit: PAGE_SIZE,
            total: items.length,
            totalPages: Math.ceil(items.length / PAGE_SIZE),
            hasNextPage: false,
            hasPreviousPage: pageNumber > 1,
          });
        }
      } catch (err) {
        setError(
          err.response?.data?.message ||
            err.message ||
            "Failed to load products."
        );
      } finally {
        setIsLoading(false);
      }
    },
    []
  );

  // Load categories and brands once.
  useEffect(() => {
    let cancelled = false;

    async function loadLookups() {
      try {
        const [categoriesData, brandsData] = await Promise.all([
          LookupService.getCategories(),
          LookupService.getBrands(),
        ]);

        if (!cancelled) {
          setCategories(
            Array.isArray(categoriesData) ? categoriesData : []
          );

          setBrands(Array.isArray(brandsData) ? brandsData : []);
        }
      } catch (err) {
        if (!cancelled) {
          console.error(
            "Failed to load lookup configurations:",
            err
          );
        }
      }
    }

    loadLookups();

    return () => {
      cancelled = true;
    };
  }, []);

  // Load products on initial render and whenever applied filters change.
  // useEffect(() => {
  //   loadProducts(1, activeParams);
  // }, [loadProducts, activeParams]);

  useEffect(() => {
     async function fetchData() {
       await loadProducts(1, activeParams);
     }
     fetchData();
   }, [loadProducts, activeParams]);


  // Update individual filter fields.
  const handleFilterChange = (event) => {
    const { name, value } = event.target;

    setFilters((previousFilters) => ({
      ...previousFilters,
      [name]: value,
    }));
  };

  // Apply filters and fetch results from page one.
  const handleApplyFilters = (event) => {
    event.preventDefault();

    const minPrice =
      filters.minPrice === "" ? null : Number(filters.minPrice);

    const maxPrice =
      filters.maxPrice === "" ? null : Number(filters.maxPrice);

    if (
      (minPrice !== null &&
        (!Number.isFinite(minPrice) || minPrice < 0)) ||
      (maxPrice !== null &&
        (!Number.isFinite(maxPrice) || maxPrice < 0))
    ) {
      setError("Prices must be valid non-negative numbers.");
      return;
    }

    if (
      minPrice !== null &&
      maxPrice !== null &&
      minPrice > maxPrice
    ) {
      setError("Minimum price cannot exceed maximum price.");
      return;
    }

    setError("");

    setActiveParams({ ...filters });
  };

  // Clear all filters.
  const handleResetFilters = () => {
    setFilters({ ...INITIAL_FILTERS });
    setActiveParams({ ...INITIAL_FILTERS });
    setError("");
  };

  // Navigate to the previous page.
  const handlePreviousPage = () => {
    if (pagination.hasPreviousPage && !isLoading) {
      loadProducts(pagination.page - 1, activeParams);
    }
  };

  // Navigate to the next page.
  const handleNextPage = () => {
    if (pagination.hasNextPage && !isLoading) {
      loadProducts(pagination.page + 1, activeParams);
    }
  };

  return (
    <div className="space-y-6">
      {/* Page heading */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            Products
          </h1>

          <p className="mt-1 text-sm text-gray-500">
            View and manage your product catalog.
          </p>
        </div>

        <Button disabled>Add Product</Button>
      </div>

      {/* Search and advanced filters */}
      <Card className="bg-white">
        <form onSubmit={handleApplyFilters} className="space-y-4">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {/* Search */}
            <Input
              label="Search catalog"
              id="search"
              name="search"
              value={filters.search}
              onChange={handleFilterChange}
              placeholder="Name, SKU, Code, Barcode..."
            />

            {/* Category */}
            <div className="w-full">
              <label
                htmlFor="categoryId"
                className="mb-2 block text-sm font-medium text-slate-700"
              >
                Category
              </label>

              <select
                id="categoryId"
                name="categoryId"
                value={filters.categoryId}
                onChange={handleFilterChange}
                className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm outline-none focus:border-emerald-600 focus:ring-2 focus:ring-emerald-100"
              >
                <option value="">All Categories</option>

                {categories.map((category) => (
                  <option
                    key={category._id}
                    value={category._id}
                  >
                    {category.categoryName}
                  </option>
                ))}
              </select>
            </div>

            {/* Brand */}
            <div className="w-full">
              <label
                htmlFor="brandId"
                className="mb-2 block text-sm font-medium text-slate-700"
              >
                Brand
              </label>

              <select
                id="brandId"
                name="brandId"
                value={filters.brandId}
                onChange={handleFilterChange}
                className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm outline-none focus:border-emerald-600 focus:ring-2 focus:ring-emerald-100"
              >
                <option value="">All Brands</option>

                {brands.map((brand) => (
                  <option key={brand._id} value={brand._id}>
                    {brand.brandName}
                  </option>
                ))}
              </select>
            </div>

            {/* Product type */}
            <div className="w-full">
              <label
                htmlFor="productType"
                className="mb-2 block text-sm font-medium text-slate-700"
              >
                Type
              </label>

              <select
                id="productType"
                name="productType"
                value={filters.productType}
                onChange={handleFilterChange}
                className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm outline-none focus:border-emerald-600 focus:ring-2 focus:ring-emerald-100"
              >
                <option value="">All Types</option>
                <option value="physical">Physical</option>
                <option value="service">Service</option>
                <option value="digital">Digital</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 items-end gap-4 sm:grid-cols-3 lg:grid-cols-4">
            {/* Status */}
            <div className="w-full">
              <label
                htmlFor="status"
                className="mb-2 block text-sm font-medium text-slate-700"
              >
                Status
              </label>

              <select
                id="status"
                name="status"
                value={filters.status}
                onChange={handleFilterChange}
                className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm outline-none focus:border-emerald-600 focus:ring-2 focus:ring-emerald-100"
              >
                <option value="">All Statuses</option>
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
                <option value="discontinued">Discontinued</option>
              </select>
            </div>

            {/* Minimum price */}
            <Input
              label="Min Price (BDT)"
              id="minPrice"
              name="minPrice"
              type="number"
              min="0"
              value={filters.minPrice}
              onChange={handleFilterChange}
              placeholder="0"
            />

            {/* Maximum price */}
            <Input
              label="Max Price (BDT)"
              id="maxPrice"
              name="maxPrice"
              type="number"
              min="0"
              value={filters.maxPrice}
              onChange={handleFilterChange}
              placeholder="Any"
            />

            {/* Filter actions */}
            <div className="mt-2 flex w-full justify-end gap-2 sm:col-span-3 lg:col-span-1">
              <Button
                type="button"
                variant="secondary"
                onClick={handleResetFilters}
                className="w-full sm:w-auto"
              >
                Reset
              </Button>

              <Button
                type="submit"
                variant="primary"
                className="w-full sm:w-auto"
              >
                Search
              </Button>
            </div>
          </div>
        </form>
      </Card>

      {/* Product table */}
      <Card className="flex flex-col">
        {isLoading ? (
          <div className="flex justify-center py-12">
            <LoadingSpinner
              label="Querying item catalog configuration records..."
            />
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
            No products match your search filters.
          </p>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200 text-sm">
                <thead className="bg-gray-50">
                  <tr>
                    <th
                      scope="col"
                      className="px-4 py-3 text-left font-semibold text-gray-600"
                    >
                      Product
                    </th>

                    <th
                      scope="col"
                      className="px-4 py-3 text-left font-semibold text-gray-600"
                    >
                      Detail
                    </th>

                    <th
                      scope="col"
                      className="px-4 py-3 text-left font-semibold text-gray-600"
                    >
                      SKU
                    </th>

                    <th
                      scope="col"
                      className="px-4 py-3 text-right font-semibold text-gray-600"
                    >
                      Price
                    </th>

                    <th
                      scope="col"
                      className="px-4 py-3 text-right font-semibold text-gray-600"
                    >
                      Stock Level
                    </th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-gray-200 bg-white">
                  {products.map((product) => (
                    <tr
                      key={product._id}
                      className="transition-colors hover:bg-gray-50"
                    >
                      {/* Product name */}
                      <td className="whitespace-nowrap px-4 py-4">
                        <div className="font-medium text-gray-900">
                          {product.productName ||
                            product.name ||
                            "Unnamed Product"}
                        </div>

                        <div className="mt-1 text-xs text-gray-500">
                          {product.productCode ||
                            product.code ||
                            "—"}
                        </div>
                      </td>

                      {/* Product details */}
                      <td className="px-4 py-4 text-gray-600">
                        <div>
                          {product.category?.categoryName ||
                            product.categoryName ||
                            "—"}
                        </div>

                        <div className="mt-1 text-xs text-gray-500">
                          {product.brand?.brandName ||
                            product.brandName ||
                            "—"}
                        </div>
                      </td>

                      {/* SKU */}
                      <td className="whitespace-nowrap px-4 py-4 text-gray-600">
                        {product.sku || "—"}
                      </td>

                      {/* Selling price */}
                      <td className="whitespace-nowrap px-4 py-4 text-right font-medium text-gray-900">
                        {product.pricing?.sellingPrice !== undefined &&
                        product.pricing?.sellingPrice !== null ? (
                          `${product.pricing.sellingPrice} BDT`
                        ) : (
                          "—"
                        )}
                      </td>

                      {/* Stock level */}
                      <td className="whitespace-nowrap px-4 py-4 text-right text-gray-600">
                        {product.currentStock ?? 0}{" "}
                        {product.unit || ""}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            <div className="flex flex-col gap-4 border-t border-gray-200 px-4 py-4 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-sm text-gray-500">
                Page {pagination.page} of {pagination.totalPages}
                {" · "}
                Total {pagination.total} records found
              </p>

              <div className="flex items-center justify-end gap-2">
                <Button
                  type="button"
                  variant="secondary"
                  disabled={
                    !pagination.hasPreviousPage || isLoading
                  }
                  onClick={handlePreviousPage}
                >
                  Previous
                </Button>

                <Button
                  type="button"
                  variant="primary"
                  disabled={!pagination.hasNextPage || isLoading}
                  onClick={handleNextPage}
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
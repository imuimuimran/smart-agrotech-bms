// // src/pages/products/ProductsPage.jsx

// import { useEffect, useState, useCallback } from "react";
// import { ProductService } from "../../services/productService";
// import { LookupService } from "../../services/lookupService";
// import { Button } from "../../components/ui/Button";
// import { Card } from "../../components/ui/Card";
// import { Input } from "../../components/ui/Input";
// import { LoadingSpinner } from "../../components/ui/LoadingSpinner";
// import { ProductDetailsPage } from "./ProductDetailsPage";

// const PAGE_SIZE = 20;

// const INITIAL_FILTERS = {
//   search: "",
//   categoryId: "",
//   brandId: "",
//   productType: "",
//   status: "",
//   minPrice: "",
//   maxPrice: "",
// };

// const INITIAL_PAGINATION = {
//   page: 1,
//   limit: PAGE_SIZE,
//   total: 0,
//   totalPages: 0,
//   hasNextPage: false,
//   hasPreviousPage: false,
// };

// export function ProductsPage() {
//   const [products, setProducts] = useState([]);
//   const [isLoading, setIsLoading] = useState(true);
//   const [error, setError] = useState("");

//   // Lookup data
//   const [selectedProductId, setSelectedProductId] = useState(null);
//   const [categories, setCategories] = useState([]);
//   const [brands, setBrands] = useState([]);

//   // Filter state
//   const [filters, setFilters] = useState(INITIAL_FILTERS);
//   const [activeParams, setActiveParams] = useState(INITIAL_FILTERS);

//   // Pagination state
//   const [pagination, setPagination] = useState(INITIAL_PAGINATION);

//   // Load products using the backend's expected query parameters.
//   const loadProducts = useCallback(
//     async (pageNumber = 1, searchFilters = INITIAL_FILTERS) => {
//       try {
//         setIsLoading(true);
//         setError("");

//         const queryParams = {
//           page: pageNumber,
//           limit: PAGE_SIZE,
//         };

//         const search = searchFilters.search.trim();

//         if (search) {
//           queryParams.search = search;
//         }

//         if (searchFilters.categoryId) {
//           queryParams.categoryId = searchFilters.categoryId;
//         }

//         if (searchFilters.brandId) {
//           queryParams.brandId = searchFilters.brandId;
//         }

//         if (searchFilters.productType) {
//           queryParams.productType = searchFilters.productType;
//         }

//         if (searchFilters.status) {
//           queryParams.status = searchFilters.status;
//         }

//         if (searchFilters.minPrice !== "") {
//           queryParams.minPrice = Number(searchFilters.minPrice);
//         }

//         if (searchFilters.maxPrice !== "") {
//           queryParams.maxPrice = Number(searchFilters.maxPrice);
//         }

//         const response = await ProductService.getProducts(queryParams);

//         const items = response?.data;
//         const pageInfo = response?.pagination;

//         if (!Array.isArray(items)) {
//           throw new Error(
//             "Product data is missing or not in the expected array format."
//           );
//         }

//         setProducts(items);

//         if (pageInfo) {
//           setPagination({
//             page: Number(pageInfo.page ?? pageNumber),
//             limit: Number(pageInfo.limit ?? PAGE_SIZE),
//             total: Number(pageInfo.total ?? items.length),
//             totalPages: Number(
//               pageInfo.totalPages ??
//                 Math.ceil(items.length / PAGE_SIZE)
//             ),
//             hasNextPage: Boolean(pageInfo.hasNextPage),
//             hasPreviousPage: Boolean(pageInfo.hasPreviousPage),
//           });
//         } else {
//           setPagination({
//             page: pageNumber,
//             limit: PAGE_SIZE,
//             total: items.length,
//             totalPages: Math.ceil(items.length / PAGE_SIZE),
//             hasNextPage: false,
//             hasPreviousPage: pageNumber > 1,
//           });
//         }
//       } catch (err) {
//         setError(
//           err.response?.data?.message ||
//             err.message ||
//             "Failed to load products."
//         );
//       } finally {
//         setIsLoading(false);
//       }
//     },
//     []
//   );

//   // Load categories and brands once.
//   useEffect(() => {
//     let cancelled = false;

//     async function loadLookups() {
//       try {
//         const [categoriesData, brandsData] = await Promise.all([
//           LookupService.getCategories(),
//           LookupService.getBrands(),
//         ]);

//         if (!cancelled) {
//           setCategories(
//             Array.isArray(categoriesData) ? categoriesData : []
//           );

//           setBrands(Array.isArray(brandsData) ? brandsData : []);
//         }
//       } catch (err) {
//         if (!cancelled) {
//           console.error(
//             "Failed to load lookup configurations:",
//             err
//           );
//         }
//       }
//     }

//     loadLookups();

//     return () => {
//       cancelled = true;
//     };
//   }, []);

//   // Load products on initial render and whenever applied filters change.
//   // useEffect(() => {
//   //   loadProducts(1, activeParams);
//   // }, [loadProducts, activeParams]);

//   useEffect(() => {
//      async function fetchData() {
//        await loadProducts(1, activeParams);
//      }
//      fetchData();
//    }, [loadProducts, activeParams]);


//   // Update individual filter fields.
//   const handleFilterChange = (event) => {
//     const { name, value } = event.target;

//     setFilters((previousFilters) => ({
//       ...previousFilters,
//       [name]: value,
//     }));
//   };

//   // Apply filters and fetch results from page one.
//   const handleApplyFilters = (event) => {
//     event.preventDefault();

//     const minPrice =
//       filters.minPrice === "" ? null : Number(filters.minPrice);

//     const maxPrice =
//       filters.maxPrice === "" ? null : Number(filters.maxPrice);

//     if (
//       (minPrice !== null &&
//         (!Number.isFinite(minPrice) || minPrice < 0)) ||
//       (maxPrice !== null &&
//         (!Number.isFinite(maxPrice) || maxPrice < 0))
//     ) {
//       setError("Prices must be valid non-negative numbers.");
//       return;
//     }

//     if (
//       minPrice !== null &&
//       maxPrice !== null &&
//       minPrice > maxPrice
//     ) {
//       setError("Minimum price cannot exceed maximum price.");
//       return;
//     }

//     setError("");

//     setActiveParams({ ...filters });
//   };

//   // Clear all filters.
//   const handleResetFilters = () => {
//     setFilters({ ...INITIAL_FILTERS });
//     setActiveParams({ ...INITIAL_FILTERS });
//     setError("");
//   };

//   // Navigate to the previous page.
//   const handlePreviousPage = () => {
//     if (pagination.hasPreviousPage && !isLoading) {
//       loadProducts(pagination.page - 1, activeParams);
//     }
//   };

//   // Navigate to the next page.
//   const handleNextPage = () => {
//     if (pagination.hasNextPage && !isLoading) {
//       loadProducts(pagination.page + 1, activeParams);
//     }
//   };

//   if (selectedProductId) {
//     return (
//       <ProductDetailsPage
//         productId={selectedProductId}
//         onBack={() => setSelectedProductId(null)}
//       />
//     );
//   }

//   return (
//     <div className="space-y-6">
//       {/* Page heading */}
//       <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
//         <div>
//           <h1 className="text-2xl font-bold text-gray-900">
//             Products
//           </h1>

//           <p className="mt-1 text-sm text-gray-500">
//             View and manage your product catalog.
//           </p>
//         </div>

//         <Button disabled>Add Product</Button>
//       </div>

//       {/* Search and advanced filters */}
//       <Card className="bg-white">
//         <form onSubmit={handleApplyFilters} className="space-y-4">
//           <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
//             {/* Search */}
//             <Input
//               label="Search catalog"
//               id="search"
//               name="search"
//               value={filters.search}
//               onChange={handleFilterChange}
//               placeholder="Name, SKU, Code, Barcode..."
//             />

//             {/* Category */}
//             <div className="w-full">
//               <label
//                 htmlFor="categoryId"
//                 className="mb-2 block text-sm font-medium text-slate-700"
//               >
//                 Category
//               </label>

//               <select
//                 id="categoryId"
//                 name="categoryId"
//                 value={filters.categoryId}
//                 onChange={handleFilterChange}
//                 className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm outline-none focus:border-emerald-600 focus:ring-2 focus:ring-emerald-100"
//               >
//                 <option value="">All Categories</option>

//                 {categories.map((category) => (
//                   <option
//                     key={category._id}
//                     value={category._id}
//                   >
//                     {category.categoryName}
//                   </option>
//                 ))}
//               </select>
//             </div>

//             {/* Brand */}
//             <div className="w-full">
//               <label
//                 htmlFor="brandId"
//                 className="mb-2 block text-sm font-medium text-slate-700"
//               >
//                 Brand
//               </label>

//               <select
//                 id="brandId"
//                 name="brandId"
//                 value={filters.brandId}
//                 onChange={handleFilterChange}
//                 className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm outline-none focus:border-emerald-600 focus:ring-2 focus:ring-emerald-100"
//               >
//                 <option value="">All Brands</option>

//                 {brands.map((brand) => (
//                   <option key={brand._id} value={brand._id}>
//                     {brand.brandName}
//                   </option>
//                 ))}
//               </select>
//             </div>

//             {/* Product type */}
//             <div className="w-full">
//               <label
//                 htmlFor="productType"
//                 className="mb-2 block text-sm font-medium text-slate-700"
//               >
//                 Type
//               </label>

//               <select
//                 id="productType"
//                 name="productType"
//                 value={filters.productType}
//                 onChange={handleFilterChange}
//                 className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm outline-none focus:border-emerald-600 focus:ring-2 focus:ring-emerald-100"
//               >
//                 <option value="">All Types</option>
//                 <option value="physical">Physical</option>
//                 <option value="service">Service</option>
//                 <option value="digital">Digital</option>
//               </select>
//             </div>
//           </div>

//           <div className="grid grid-cols-1 items-end gap-4 sm:grid-cols-3 lg:grid-cols-4">
//             {/* Status */}
//             <div className="w-full">
//               <label
//                 htmlFor="status"
//                 className="mb-2 block text-sm font-medium text-slate-700"
//               >
//                 Status
//               </label>

//               <select
//                 id="status"
//                 name="status"
//                 value={filters.status}
//                 onChange={handleFilterChange}
//                 className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm outline-none focus:border-emerald-600 focus:ring-2 focus:ring-emerald-100"
//               >
//                 <option value="">All Statuses</option>
//                 <option value="active">Active</option>
//                 <option value="inactive">Inactive</option>
//                 <option value="discontinued">Discontinued</option>
//               </select>
//             </div>

//             {/* Minimum price */}
//             <Input
//               label="Min Price (BDT)"
//               id="minPrice"
//               name="minPrice"
//               type="number"
//               min="0"
//               value={filters.minPrice}
//               onChange={handleFilterChange}
//               placeholder="0"
//             />

//             {/* Maximum price */}
//             <Input
//               label="Max Price (BDT)"
//               id="maxPrice"
//               name="maxPrice"
//               type="number"
//               min="0"
//               value={filters.maxPrice}
//               onChange={handleFilterChange}
//               placeholder="Any"
//             />

//             {/* Filter actions */}
//             <div className="mt-2 flex w-full justify-end gap-2 sm:col-span-3 lg:col-span-1">
//               <Button
//                 type="button"
//                 variant="secondary"
//                 onClick={handleResetFilters}
//                 className="w-full sm:w-auto"
//               >
//                 Reset
//               </Button>

//               <Button
//                 type="submit"
//                 variant="primary"
//                 className="w-full sm:w-auto"
//               >
//                 Search
//               </Button>
//             </div>
//           </div>
//         </form>
//       </Card>

//       {/* Product table */}
//       <Card className="flex flex-col">
//         {isLoading ? (
//           <div className="flex justify-center py-12">
//             <LoadingSpinner
//               label="Querying item catalog configuration records..."
//             />
//           </div>
//         ) : error ? (
//           <div
//             className="rounded-lg bg-red-50 p-4 text-sm text-red-700"
//             role="alert"
//           >
//             {error}
//           </div>
//         ) : products.length === 0 ? (
//           <p className="py-10 text-center text-sm text-gray-500">
//             No products match your search filters.
//           </p>
//         ) : (
//           <>
//             <div className="overflow-x-auto">
//               <table className="min-w-full divide-y divide-gray-200 text-sm">
//                 <thead className="bg-gray-50">
//                   <tr>
//                     <th
//                       scope="col"
//                       className="px-4 py-3 text-left font-semibold text-gray-600"
//                     >
//                       Product
//                     </th>

//                     <th
//                       scope="col"
//                       className="px-4 py-3 text-left font-semibold text-gray-600"
//                     >
//                       Detail
//                     </th>

//                     <th
//                       scope="col"
//                       className="px-4 py-3 text-left font-semibold text-gray-600"
//                     >
//                       SKU
//                     </th>

//                     <th
//                       scope="col"
//                       className="px-4 py-3 text-right font-semibold text-gray-600"
//                     >
//                       Price
//                     </th>

//                     <th
//                       scope="col"
//                       className="px-4 py-3 text-right font-semibold text-gray-600"
//                     >
//                       Stock Level
//                     </th>
//                   </tr>
//                 </thead>

//                 <tbody className="divide-y divide-gray-200 bg-white">
//                   {products.map((product) => (
//                     <tr
//                       key={product._id}
//                       className="transition-colors hover:bg-gray-50"
//                     >
//                       {/* Product name */}
//                       <td className="whitespace-nowrap px-4 py-4">
//                         <div className="font-medium text-gray-900">
//                           {product.productName ||
//                             product.name ||
//                             "Unnamed Product"}
//                         </div>

//                         <div className="mt-1 text-xs text-gray-500">
//                           {product.productCode ||
//                             product.code ||
//                             "—"}
//                         </div>
//                       </td>

//                       {/* Product details */}
//                       <td className="px-4 py-4 text-gray-600">
//                         <div>
//                           {product.category?.categoryName ||
//                             product.categoryName ||
//                             "—"}
//                         </div>

//                         <div className="mt-1 text-xs text-gray-500">
//                           {product.brand?.brandName ||
//                             product.brandName ||
//                             "—"}
//                         </div>
//                       </td>

//                       {/* SKU */}
//                       <td className="whitespace-nowrap px-4 py-4 text-gray-600">
//                         {product.sku || "—"}
//                       </td>

//                       {/* Selling price */}
//                       <td className="whitespace-nowrap px-4 py-4 text-right font-medium text-gray-900">
//                         {product.pricing?.sellingPrice !== undefined &&
//                         product.pricing?.sellingPrice !== null ? (
//                           `${product.pricing.sellingPrice} BDT`
//                         ) : (
//                           "—"
//                         )}
//                       </td>

//                       {/* Stock level */}
//                       <td className="whitespace-nowrap px-4 py-4 text-right text-gray-600">
//                         {product.currentStock ?? 0}{" "}
//                         {product.unit || ""}
//                       </td>
//                     </tr>
//                   ))}
//                 </tbody>
//               </table>
//             </div>

//             {/* Pagination */}
//             <div className="flex flex-col gap-4 border-t border-gray-200 px-4 py-4 sm:flex-row sm:items-center sm:justify-between">
//               <p className="text-sm text-gray-500">
//                 Page {pagination.page} of {pagination.totalPages}
//                 {" · "}
//                 Total {pagination.total} records found
//               </p>

//               <div className="flex items-center justify-end gap-2">
//                 <Button
//                   type="button"
//                   variant="secondary"
//                   disabled={
//                     !pagination.hasPreviousPage || isLoading
//                   }
//                   onClick={handlePreviousPage}
//                 >
//                   Previous
//                 </Button>

//                 <Button
//                   type="button"
//                   variant="primary"
//                   disabled={!pagination.hasNextPage || isLoading}
//                   onClick={handleNextPage}
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







// // src/pages/products/ProductsPage.jsx

// import { useEffect, useState, useCallback } from "react";
// import { ProductService } from "../../services/productService";
// import { LookupService } from "../../services/lookupService";
// import { Button } from "../../components/ui/Button";
// import { Card } from "../../components/ui/Card";
// import { Input } from "../../components/ui/Input";
// import { LoadingSpinner } from "../../components/ui/LoadingSpinner";
// import { ProductDetailsPage } from "./ProductDetailsPage";

// const PAGE_SIZE = 20;
// const INITIAL_FILTERS = {
//   search: "",
//   categoryId: "",
//   brandId: "",
//   productType: "",
//   status: "",
//   minPrice: "",
//   maxPrice: "",
// };
// const INITIAL_PAGINATION = {
//   page: 1,
//   limit: PAGE_SIZE,
//   total: 0,
//   totalPages: 0,
//   hasNextPage: false,
//   hasPreviousPage: false,
// };

// export function ProductsPage() {
//   const [products, setProducts] = useState([]);
//   const [isLoading, setIsLoading] = useState(true);
//   const [error, setError] = useState("");
//   const [selectedProductId, setSelectedProductId] = useState(null);
//   const [categories, setCategories] = useState([]);
//   const [brands, setBrands] = useState([]);
//   const [filters, setFilters] = useState({ ...INITIAL_FILTERS });
//   const [activeParams, setActiveParams] = useState({ ...INITIAL_FILTERS });
//   const [pagination, setPagination] = useState({ ...INITIAL_PAGINATION });

//   const loadProducts = useCallback(async (pageNumber = 1, searchFilters = INITIAL_FILTERS) => {
//     try {
//       setIsLoading(true);
//       setError("");
//       const queryParams = { page: pageNumber, limit: PAGE_SIZE };
//       const search = (searchFilters.search || "").trim();
//       if (search) queryParams.search = search;
//       if (searchFilters.categoryId) queryParams.categoryId = searchFilters.categoryId;
//       if (searchFilters.brandId) queryParams.brandId = searchFilters.brandId;
//       if (searchFilters.productType) queryParams.productType = searchFilters.productType;
//       if (searchFilters.status) queryParams.status = searchFilters.status;
//       if (searchFilters.minPrice !== "") queryParams.minPrice = Number(searchFilters.minPrice);
//       if (searchFilters.maxPrice !== "") queryParams.maxPrice = Number(searchFilters.maxPrice);

//       const response = await ProductService.getProducts(queryParams);
//       const items = response?.data;
//       const pageInfo = response?.pagination;
//       if (!Array.isArray(items)) {
//         throw new Error("Product data is missing or not in the expected array format.");
//       }
//       setProducts(items);
//       if (pageInfo) {
//         setPagination({
//           page: Number(pageInfo.page ?? pageNumber),
//           limit: Number(pageInfo.limit ?? PAGE_SIZE),
//           total: Number(pageInfo.total ?? items.length),
//           totalPages: Number(pageInfo.totalPages ?? Math.ceil(items.length / PAGE_SIZE)),
//           hasNextPage: Boolean(pageInfo.hasNextPage),
//           hasPreviousPage: Boolean(pageInfo.hasPreviousPage),
//         });
//       } else {
//         setPagination({
//           page: pageNumber,
//           limit: PAGE_SIZE,
//           total: items.length,
//           totalPages: Math.ceil(items.length / PAGE_SIZE),
//           hasNextPage: false,
//           hasPreviousPage: pageNumber > 1,
//         });
//       }
//     } catch (err) {
//       setError(err?.response?.data?.message || err?.message || "Failed to load products.");
//       setProducts([]);
//     } finally {
//       setIsLoading(false);
//     }
//   }, []);

//   useEffect(() => {
//     let cancelled = false;
//     async function loadLookups() {
//       try {
//         const [categoriesData, brandsData] = await Promise.all([
//           LookupService.getCategories(),
//           LookupService.getBrands(),
//         ]);
//         if (!cancelled) {
//           setCategories(Array.isArray(categoriesData) ? categoriesData : []);
//           setBrands(Array.isArray(brandsData) ? brandsData : []);
//         }
//       } catch (err) {
//         if (!cancelled) console.error("Failed to load lookup configurations:", err);
//       }
//     }
//     loadLookups();
//     return () => { cancelled = true; };
//   }, []);

//   // useEffect(() => {
//   //   loadProducts(1, activeParams);
//   // }, [loadProducts, activeParams]);

//   useEffect(() => {
//     async function fetchData() {
//       await loadProducts(1, activeParams);
//     }
//     fetchData();
//   }, [loadProducts, activeParams]);

//   const handleFilterChange = (event) => {
//     const { name, value } = event.target;
//     setFilters((previous) => ({ ...previous, [name]: value }));
//   };

//   const handleApplyFilters = (event) => {
//     event.preventDefault();
//     const min = filters.minPrice === "" ? null : Number(filters.minPrice);
//     const max = filters.maxPrice === "" ? null : Number(filters.maxPrice);
//     if ((min !== null && (!Number.isFinite(min) || min < 0)) ||
//         (max !== null && (!Number.isFinite(max) || max < 0))) {
//       setError("Prices must be valid non-negative numbers.");
//       return;
//     }
//     if (min !== null && max !== null && min > max) {
//       setError("Minimum price cannot exceed maximum price.");
//       return;
//     }
//     setError("");
//     setActiveParams({ ...filters });
//   };

//   const handleResetFilters = () => {
//     setFilters({ ...INITIAL_FILTERS });
//     setActiveParams({ ...INITIAL_FILTERS });
//     setError("");
//   };

//   const handlePreviousPage = () => {
//     if (pagination.hasPreviousPage && !isLoading) {
//       loadProducts(pagination.page - 1, activeParams);
//     }
//   };

//   const handleNextPage = () => {
//     if (pagination.hasNextPage && !isLoading) {
//       loadProducts(pagination.page + 1, activeParams);
//     }
//   };

//   if (selectedProductId) {
//     return (
//       <ProductDetailsPage
//         productId={selectedProductId}
//         onBack={() => setSelectedProductId(null)}
//       />
//     );
//   }

//   return (
//     <div className="space-y-6">
//       <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
//         <div>
//           <h1 className="text-2xl font-bold text-gray-900">Products</h1>
//           <p className="mt-1 text-sm text-gray-500">View and manage your product catalog.</p>
//         </div>
//         <Button disabled>Add Product</Button>
//       </div>

//       <Card className="bg-white">
//         <form onSubmit={handleApplyFilters} className="space-y-4">
//           <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
//             <Input label="Search catalog" id="search" name="search"
//               value={filters.search} onChange={handleFilterChange}
//               placeholder="Name, SKU, Code, Barcode..." />

//             <div className="w-full">
//               <label htmlFor="categoryId" className="mb-2 block text-sm font-medium text-slate-700">Category</label>
//               <select id="categoryId" name="categoryId" value={filters.categoryId}
//                 onChange={handleFilterChange}
//                 className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm outline-none focus:border-emerald-600 focus:ring-2 focus:ring-emerald-100">
//                 <option value="">All Categories</option>
//                 {categories.map((category) => (
//                   <option key={category._id} value={category._id}>{category.categoryName}</option>
//                 ))}
//               </select>
//             </div>

//             <div className="w-full">
//               <label htmlFor="brandId" className="mb-2 block text-sm font-medium text-slate-700">Brand</label>
//               <select id="brandId" name="brandId" value={filters.brandId}
//                 onChange={handleFilterChange}
//                 className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm outline-none focus:border-emerald-600 focus:ring-2 focus:ring-emerald-100">
//                 <option value="">All Brands</option>
//                 {brands.map((brand) => (
//                   <option key={brand._id} value={brand._id}>{brand.brandName}</option>
//                 ))}
//               </select>
//             </div>

//             <div className="w-full">
//               <label htmlFor="productType" className="mb-2 block text-sm font-medium text-slate-700">Type</label>
//               <select id="productType" name="productType" value={filters.productType}
//                 onChange={handleFilterChange}
//                 className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm outline-none focus:border-emerald-600 focus:ring-2 focus:ring-emerald-100">
//                 <option value="">All Types</option>
//                 <option value="physical">Physical</option>
//                 <option value="service">Service</option>
//                 <option value="digital">Digital</option>
//               </select>
//             </div>
//           </div>

//           <div className="grid grid-cols-1 items-end gap-4 sm:grid-cols-3 lg:grid-cols-4">
//             <div className="w-full">
//               <label htmlFor="status" className="mb-2 block text-sm font-medium text-slate-700">Status</label>
//               <select id="status" name="status" value={filters.status}
//                 onChange={handleFilterChange}
//                 className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm outline-none focus:border-emerald-600 focus:ring-2 focus:ring-emerald-100">
//                 <option value="">All Statuses</option>
//                 <option value="active">Active</option>
//                 <option value="inactive">Inactive</option>
//                 <option value="discontinued">Discontinued</option>
//               </select>
//             </div>

//             <Input label="Min Price (BDT)" id="minPrice" name="minPrice" type="number" min="0"
//               value={filters.minPrice} onChange={handleFilterChange} placeholder="0" />
//             <Input label="Max Price (BDT)" id="maxPrice" name="maxPrice" type="number" min="0"
//               value={filters.maxPrice} onChange={handleFilterChange} placeholder="Any" />

//             <div className="mt-2 flex w-full justify-end gap-2 sm:col-span-3 lg:col-span-1">
//               <Button type="button" variant="secondary" onClick={handleResetFilters} className="w-full sm:w-auto">Reset</Button>
//               <Button type="submit" variant="primary" className="w-full sm:w-auto">Search</Button>
//             </div>
//           </div>
//         </form>
//       </Card>

//       <Card className="flex flex-col">
//         {isLoading ? (
//           <div className="flex justify-center py-12">
//             <LoadingSpinner label="Loading product catalog..." />
//           </div>
//         ) : error ? (
//           <div className="space-y-3 p-4">
//             <div className="rounded-lg bg-red-50 p-4 text-sm text-red-700" role="alert">{error}</div>
//             <Button type="button" variant="secondary"
//               onClick={() => loadProducts(pagination.page || 1, activeParams)}>Retry</Button>
//           </div>
//         ) : products.length === 0 ? (
//           <p className="py-10 text-center text-sm text-gray-500">No products match your search filters.</p>
//         ) : (
//           <>
//             <div className="overflow-x-auto">
//               <table className="min-w-full divide-y divide-gray-200 text-sm">
//                 <thead className="bg-gray-50">
//                   <tr>
//                     <th scope="col" className="px-4 py-3 text-left font-semibold text-gray-600">Product</th>
//                     <th scope="col" className="px-4 py-3 text-left font-semibold text-gray-600">Detail</th>
//                     <th scope="col" className="px-4 py-3 text-left font-semibold text-gray-600">SKU</th>
//                     <th scope="col" className="px-4 py-3 text-right font-semibold text-gray-600">Price</th>
//                     <th scope="col" className="px-4 py-3 text-right font-semibold text-gray-600">Stock Level</th>
//                     <th scope="col" className="px-4 py-3 text-right font-semibold text-gray-600">Action</th>
//                   </tr>
//                 </thead>
//                 <tbody className="divide-y divide-gray-200 bg-white">
//                   {products.map((product) => (
//                     <tr key={product._id}
//                       className="cursor-pointer transition-colors hover:bg-gray-50"
//                       onClick={() => product._id && setSelectedProductId(product._id)}>
//                       <td className="whitespace-nowrap px-4 py-4">
//                         <div className="font-medium text-gray-900">{product.productName || product.name || "Unnamed Product"}</div>
//                         <div className="mt-1 text-xs text-gray-500">{product.productCode || product.code || "—"}</div>
//                       </td>
//                       <td className="px-4 py-4 text-gray-600">
//                         <div>{product.categoryId?.categoryName || product.category?.categoryName || "—"}</div>
//                         <div className="mt-1 text-xs text-gray-500">{product.brandId?.brandName || product.brand?.brandName || "—"}</div>
//                       </td>
//                       <td className="whitespace-nowrap px-4 py-4 text-gray-600">{product.sku || "—"}</td>
//                       <td className="whitespace-nowrap px-4 py-4 text-right font-medium text-gray-900">
//                         {product.pricing?.sellingPrice !== undefined && product.pricing?.sellingPrice !== null
//                           ? `${Number(product.pricing.sellingPrice).toLocaleString("en-BD")} BDT`
//                           : "—"}
//                       </td>
//                       <td className="whitespace-nowrap px-4 py-4 text-right text-gray-600">{product.currentStock ?? 0} {product.unit || ""}</td>
//                       <td className="whitespace-nowrap px-4 py-4 text-right">
//                         <Button type="button" variant="secondary"
//                           disabled={!product._id}
//                           onClick={(event) => {
//                             event?.stopPropagation?.();
//                             if (product._id) setSelectedProductId(product._id);
//                           }}>View</Button>
//                       </td>
//                     </tr>
//                   ))}
//                 </tbody>
//               </table>
//             </div>

//             <div className="flex flex-col gap-4 border-t border-gray-200 px-4 py-4 sm:flex-row sm:items-center sm:justify-between">
//               <p className="text-sm text-gray-500">
//                 Page {pagination.page} of {pagination.totalPages} · Total {pagination.total} records found
//               </p>
//               <div className="flex items-center justify-end gap-2">
//                 <Button type="button" variant="secondary"
//                   disabled={!pagination.hasPreviousPage || isLoading}
//                   onClick={handlePreviousPage}>Previous</Button>
//                 <Button type="button" variant="primary"
//                   disabled={!pagination.hasNextPage || isLoading}
//                   onClick={handleNextPage}>Next</Button>
//               </div>
//             </div>
//           </>
//         )}
//       </Card>
//     </div>
//   );
// }

// export default ProductsPage;





// // src/pages/products/ProductsPage.jsx

// import { useCallback, useEffect, useState } from "react";
// import { ProductService } from "../../services/productService";
// import { LookupService } from "../../services/lookupService";
// import { Button } from "../../components/ui/Button";
// import { Card } from "../../components/ui/Card";
// import { Input } from "../../components/ui/Input";
// import { LoadingSpinner } from "../../components/ui/LoadingSpinner";
// import { ProductDetailsPage } from "./ProductDetailsPage";
// import { ProductCreatePage } from "./ProductCreatePage";
// import { useAuth } from "../../hooks/useAuth";

// const PAGE_SIZE = 20;
// const INITIAL_FILTERS = {
//   search: "",
//   categoryId: "",
//   brandId: "",
//   productType: "",
//   status: "",
//   minPrice: "",
//   maxPrice: "",
// };
// const INITIAL_PAGINATION = {
//   page: 1, limit: PAGE_SIZE, total: 0, totalPages: 0,
//   hasNextPage: false, hasPreviousPage: false,
// };

// function unwrapList(result) {
//   if (Array.isArray(result)) return result;
//   if (Array.isArray(result?.data)) return result.data;
//   if (Array.isArray(result?.data?.data)) return result.data.data;
//   if (Array.isArray(result?.items)) return result.items;
//   return [];
// }

// function getProductId(product) {
//   return product?._id || product?.id || product?.productId;
// }

// function getSellingPrice(product) {
//   return product?.pricing?.sellingPrice ?? product?.sellingPrice ?? product?.price;
// }

// /**
//  * Pass the authenticated user/role from your existing auth layer:
//  * <ProductsPage currentUser={user} /> or <ProductsPage userRole={user.role} />.
//  * This component deliberately does not assume a hard-coded "admin" role.
//  */
// export function ProductsPage({ currentUser, user, userRole, canCreateProducts: explicitCreatePermission }) {
//   const { user: authenticatedUser } = useAuth();
//   const [products, setProducts] = useState([]);
//   const [isLoading, setIsLoading] = useState(true);
//   const [error, setError] = useState("");
//   const [selectedProductId, setSelectedProductId] = useState(null);
//   const [isCreating, setIsCreating] = useState(false);
//   const [categories, setCategories] = useState([]);
//   const [brands, setBrands] = useState([]);
//   const [filters, setFilters] = useState({ ...INITIAL_FILTERS });
//   const [activeParams, setActiveParams] = useState({ ...INITIAL_FILTERS });
//   const [pagination, setPagination] = useState({ ...INITIAL_PAGINATION });

//   // App.jsx renders <ProductsPage /> without role props, so use the real AuthContext user.
//   // Props remain supported for reuse/testing, but authenticatedUser is the default source.
//   const effectiveUser = currentUser ?? user ?? authenticatedUser;
//   const rawRole =
//     userRole ??
//     effectiveUser?.role?.name ??
//     effectiveUser?.role ??
//     effectiveUser?.user?.role?.name ??
//     effectiveUser?.user?.role ??
//     effectiveUser?.userRole ??
//     effectiveUser?.roleName ??
//     "";
//   const role = String(rawRole).toLowerCase().replace(/[\s-]+/g, "_");

//   const rolePermission = ["admin", "super_admin", "inventory_manager", "manager"].includes(role);
//   const canCreate = typeof explicitCreatePermission === "boolean"
//     ? explicitCreatePermission
//     : rolePermission;

//   const loadProducts = useCallback(async (pageNumber = 1, searchFilters = INITIAL_FILTERS) => {
//     setIsLoading(true);
//     setError("");
//     try {
//       const params = { page: pageNumber, limit: PAGE_SIZE };
//       const search = (searchFilters.search || "").trim();
//       if (search) params.search = search;
//       if (searchFilters.categoryId) params.categoryId = searchFilters.categoryId;
//       if (searchFilters.brandId) params.brandId = searchFilters.brandId;
//       if (searchFilters.productType) params.productType = searchFilters.productType;
//       if (searchFilters.status) params.status = searchFilters.status;
//       if (searchFilters.minPrice !== "") params.minPrice = Number(searchFilters.minPrice);
//       if (searchFilters.maxPrice !== "") params.maxPrice = Number(searchFilters.maxPrice);

//       const response = await ProductService.getProducts(params);
//       const items = unwrapList(response?.data ?? response);
//       if (!Array.isArray(items)) throw new Error("The products service returned an unexpected response.");
//       setProducts(items);
//       const pageInfo = response?.pagination ?? response?.data?.pagination;
//       setPagination({
//         page: Number(pageInfo?.page ?? pageNumber),
//         limit: Number(pageInfo?.limit ?? PAGE_SIZE),
//         total: Number(pageInfo?.total ?? items.length),
//         totalPages: Number(pageInfo?.totalPages ?? Math.ceil(items.length / PAGE_SIZE)),
//         hasNextPage: Boolean(pageInfo?.hasNextPage ?? (pageNumber < Number(pageInfo?.totalPages ?? 0))),
//         hasPreviousPage: Boolean(pageInfo?.hasPreviousPage ?? pageNumber > 1),
//       });
//     } catch (loadError) {
//       setError(loadError?.response?.data?.message || loadError?.message || "Failed to load products.");
//       setProducts([]);
//       setPagination({ ...INITIAL_PAGINATION, page: pageNumber });
//     } finally {
//       setIsLoading(false);
//     }
//   }, []);

//   // useEffect(() => {
//   //   loadProducts(1, activeParams);
//   // }, [loadProducts, activeParams]);


//     useEffect(() => {
//     async function fetchData() {
//       await loadProducts(1, activeParams);
//     }
//     fetchData();
//   }, [loadProducts, activeParams]);

//   useEffect(() => {
//     let active = true;
//     Promise.all([LookupService.getCategories(), LookupService.getBrands()])
//       .then(([categoryResult, brandResult]) => {
//         if (active) {
//           setCategories(unwrapList(categoryResult));
//           setBrands(unwrapList(brandResult));
//         }
//       })
//       .catch((lookupError) => {
//         if (active) {
//           // Product listing remains usable if lookup filters cannot be loaded.
//           console.error("Failed to load product filter options:", lookupError);
//         }
//       });
//     return () => { active = false; };
//   }, []);

//   function handleFilterChange(event) {
//     const { name, value } = event.target;
//     setFilters((current) => ({ ...current, [name]: value }));
//   }

//   function handleApplyFilters(event) {
//     event.preventDefault();
//     const min = filters.minPrice === "" ? null : Number(filters.minPrice);
//     const max = filters.maxPrice === "" ? null : Number(filters.maxPrice);
//     if ((min !== null && (!Number.isFinite(min) || min < 0)) ||
//         (max !== null && (!Number.isFinite(max) || max < 0))) {
//       setError("Prices must be valid non-negative numbers.");
//       return;
//     }
//     if (min !== null && max !== null && min > max) {
//       setError("Minimum price cannot exceed maximum price.");
//       return;
//     }
//     setActiveParams({ ...filters });
//   }

//   function handleResetFilters() {
//     setFilters({ ...INITIAL_FILTERS });
//     setActiveParams({ ...INITIAL_FILTERS });
//     setError("");
//   }

//   async function handleCreated() {
//     setIsCreating(false);
//     setSelectedProductId(null);
//     await loadProducts(1, activeParams);
//   }

//   if (selectedProductId) {
//     return <ProductDetailsPage productId={selectedProductId} onBack={() => setSelectedProductId(null)} />;
//   }

//   if (isCreating) {
//     return <ProductCreatePage onBack={() => setIsCreating(false)} onSuccess={handleCreated} />;
//   }

//   return (
//     <div className="space-y-6">
//       <header className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
//         <div>
//           <h1 className="text-2xl font-bold text-gray-900">Products</h1>
//           <p className="mt-1 text-sm text-gray-600">View and manage your product catalog.</p>
//         </div>
//         {canCreate && (
//           <Button type="button" onClick={() => setIsCreating(true)}>Create product</Button>
//         )}
//       </header>

//       <Card className="bg-white">
//         <form onSubmit={handleApplyFilters} className="space-y-4">
//           <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
//             <Input label="Search products" id="search" name="search" value={filters.search} onChange={handleFilterChange} placeholder="Name, SKU, code, barcode" />
//             <div>
//               <label htmlFor="categoryId" className="mb-1 block text-sm font-medium text-slate-700">Category</label>
//               <select id="categoryId" name="categoryId" value={filters.categoryId} onChange={handleFilterChange} className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm">
//                 <option value="">All categories</option>
//                 {categories.map((item) => <option key={item._id || item.id} value={item._id || item.id}>{item.categoryName || item.name || item.title}</option>)}
//               </select>
//             </div>
//             <div>
//               <label htmlFor="brandId" className="mb-1 block text-sm font-medium text-slate-700">Brand</label>
//               <select id="brandId" name="brandId" value={filters.brandId} onChange={handleFilterChange} className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm">
//                 <option value="">All brands</option>
//                 {brands.map((item) => <option key={item._id || item.id} value={item._id || item.id}>{item.brandName || item.name || item.title}</option>)}
//               </select>
//             </div>
//             <div>
//               <label htmlFor="productType" className="mb-1 block text-sm font-medium text-slate-700">Type</label>
//               <select id="productType" name="productType" value={filters.productType} onChange={handleFilterChange} className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm">
//                 <option value="">All types</option><option value="physical">Physical</option><option value="service">Service</option><option value="digital">Digital</option>
//               </select>
//             </div>
//             <div>
//               <label htmlFor="status" className="mb-1 block text-sm font-medium text-slate-700">Status</label>
//               <select id="status" name="status" value={filters.status} onChange={handleFilterChange} className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm">
//                 <option value="">All statuses</option><option value="active">Active</option><option value="inactive">Inactive</option><option value="discontinued">Discontinued</option>
//               </select>
//             </div>
//             <Input label="Minimum price" id="minPrice" name="minPrice" type="number" min="0" step="any" value={filters.minPrice} onChange={handleFilterChange} />
//             <Input label="Maximum price" id="maxPrice" name="maxPrice" type="number" min="0" step="any" value={filters.maxPrice} onChange={handleFilterChange} />
//           </div>
//           <div className="flex flex-wrap gap-2">
//             <Button type="submit">Apply filters</Button>
//             <Button type="button" variant="secondary" onClick={handleResetFilters}>Reset</Button>
//           </div>
//         </form>
//       </Card>

//       {error && <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700" role="alert">{error}</div>}

//       <Card className="overflow-hidden bg-white p-0">
//         {isLoading ? (
//           <div className="flex justify-center py-16"><LoadingSpinner label="Loading products..." /></div>
//         ) : products.length === 0 ? (
//           <div className="py-12 text-center text-sm text-slate-500">No products found for these filters.</div>
//         ) : (
//           <div className="overflow-x-auto">
//             <table className="min-w-full divide-y divide-slate-200 text-sm">
//               <thead className="bg-slate-50 text-left text-slate-600">
//                 <tr>
//                   <th className="px-4 py-3 font-semibold">Product</th>
//                   <th className="px-4 py-3 font-semibold">Code / SKU</th>
//                   <th className="px-4 py-3 font-semibold">Category</th>
//                   <th className="px-4 py-3 font-semibold">Price</th>
//                   <th className="px-4 py-3 font-semibold">Status</th>
//                   <th className="px-4 py-3 font-semibold">Action</th>
//                 </tr>
//               </thead>
//               <tbody className="divide-y divide-slate-100">
//                 {products.map((product, index) => {
//                   const id = getProductId(product);
//                   const category = product?.category?.categoryName || product?.categoryName || product?.categoryId?.categoryName || "—";
//                   const price = getSellingPrice(product);
//                   return (
//                     <tr key={id || `${product?.productName || "product"}-${index}`} className="hover:bg-slate-50">
//                       <td className="px-4 py-3">
//                         <div className="font-medium text-slate-900">{product?.productName || product?.name || "Unnamed product"}</div>
//                         {product?.sku && <div className="text-xs text-slate-500">SKU: {product.sku}</div>}
//                       </td>
//                       <td className="px-4 py-3 text-slate-600">{product?.productCode || "—"}{product?.sku ? ` / ${product.sku}` : ""}</td>
//                       <td className="px-4 py-3 text-slate-600">{category}</td>
//                       <td className="px-4 py-3 text-slate-600">{price == null ? "—" : Number(price).toLocaleString(undefined, { maximumFractionDigits: 2 })}</td>
//                       <td className="px-4 py-3"><span className="rounded-full bg-slate-100 px-2 py-1 text-xs capitalize text-slate-700">{product?.status || "—"}</span></td>
//                       <td className="px-4 py-3">
//                         <Button type="button" variant="secondary" disabled={!id} onClick={() => setSelectedProductId(id)}>View</Button>
//                       </td>
//                     </tr>
//                   );
//                 })}
//               </tbody>
//             </table>
//           </div>
//         )}
//         <div className="flex flex-col gap-3 border-t border-slate-200 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
//           <p className="text-sm text-slate-600">
//             Page {pagination.page}{pagination.totalPages ? ` of ${pagination.totalPages}` : ""} · {pagination.total} product(s)
//           </p>
//           <div className="flex gap-2">
//             <Button type="button" variant="secondary" disabled={isLoading || !pagination.hasPreviousPage} onClick={() => loadProducts(Math.max(1, pagination.page - 1), activeParams)}>Previous</Button>
//             <Button type="button" variant="secondary" disabled={isLoading || !pagination.hasNextPage} onClick={() => loadProducts(pagination.page + 1, activeParams)}>Next</Button>
//           </div>
//         </div>
//       </Card>
//     </div>
//   );
// }

// export default ProductsPage;







// src/pages/products/ProductsPage.jsx

import { useCallback, useEffect, useState } from "react";
import { ProductService } from "../../services/productService";
import { LookupService } from "../../services/lookupService";
import { Button } from "../../components/ui/Button";
import { Card } from "../../components/ui/Card";
import { Input } from "../../components/ui/Input";
import { LoadingSpinner } from "../../components/ui/LoadingSpinner";
import { ProductDetailsPage } from "./ProductDetailsPage";
import { ProductCreatePage } from "./ProductCreatePage";
import { ProductEditPage } from "./ProductEditPage";
import { useAuth } from "../../hooks/useAuth";

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

function unwrapList(result) {
  if (Array.isArray(result)) return result;
  if (Array.isArray(result?.data)) return result.data;
  if (Array.isArray(result?.data?.data)) return result.data.data;
  if (Array.isArray(result?.items)) return result.items;
  if (Array.isArray(result?.results)) return result.results;
  return [];
}

function getProductId(product) {
  return product?._id || product?.id || product?.productId || "";
}

function getSellingPrice(product) {
  return product?.pricing?.sellingPrice ?? product?.sellingPrice ?? product?.price;
}

function getRole(user, explicitRole) {
  const rawRole =
    explicitRole ??
    user?.role?.name ??
    user?.role ??
    user?.user?.role?.name ??
    user?.user?.role ??
    user?.userRole ??
    user?.roleName ??
    "";
  return String(rawRole).trim().toLowerCase().replace(/[\s-]+/g, "_");
}

function getErrorMessage(error, fallback) {
  return (
    error?.response?.data?.message ||
    error?.response?.data?.error ||
    error?.message ||
    fallback
  );
}

function formatPrice(value) {
  if (value === undefined || value === null || value === "") return "—";
  const number = Number(value);
  return Number.isFinite(number)
    ? number.toLocaleString(undefined, { maximumFractionDigits: 2 })
    : "—";
}

export function ProductsPage({
  currentUser,
  user,
  userRole,
  canCreateProducts: explicitCreatePermission,
}) {
  const { user: authenticatedUser } = useAuth();

  const [products, setProducts] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [selectedProductId, setSelectedProductId] = useState(null);
  const [isCreating, setIsCreating] = useState(false);
  const [editingProductId, setEditingProductId] = useState(null);
  const [categories, setCategories] = useState([]);
  const [brands, setBrands] = useState([]);
  const [filters, setFilters] = useState({ ...INITIAL_FILTERS });
  const [activeParams, setActiveParams] = useState({ ...INITIAL_FILTERS });
  const [pagination, setPagination] = useState({ ...INITIAL_PAGINATION });

  const effectiveUser = currentUser ?? user ?? authenticatedUser;
  const role = getRole(effectiveUser, userRole);
  const roleCanCreate = ["admin", "super_admin", "inventory_manager", "manager"].includes(role);
  const canCreate =
    typeof explicitCreatePermission === "boolean"
      ? explicitCreatePermission
      : roleCanCreate;
  // Only ADMIN and MANAGER (and the supported super-admin alias) may enter edit mode.
  const canUpdate = ["admin", "super_admin", "manager"].includes(role);

  const loadProducts = useCallback(async (pageNumber = 1, searchFilters = INITIAL_FILTERS) => {
    setIsLoading(true);
    setError("");

    try {
      const params = { page: pageNumber, limit: PAGE_SIZE };
      const search = (searchFilters.search || "").trim();

      if (search) params.search = search;
      if (searchFilters.categoryId) params.categoryId = searchFilters.categoryId;
      if (searchFilters.brandId) params.brandId = searchFilters.brandId;
      if (searchFilters.productType) params.productType = searchFilters.productType;
      if (searchFilters.status) params.status = searchFilters.status;
      if (searchFilters.minPrice !== "") params.minPrice = Number(searchFilters.minPrice);
      if (searchFilters.maxPrice !== "") params.maxPrice = Number(searchFilters.maxPrice);

      const response = await ProductService.getProducts(params);
      const responseData = response?.data ?? response;
      const items = unwrapList(responseData);

      setProducts(items);
      const pageInfo =
        response?.pagination ??
        response?.data?.pagination ??
        responseData?.pagination ??
        {};

      const totalPages = Number(
        pageInfo.totalPages ?? Math.ceil(Number(pageInfo.total ?? items.length) / PAGE_SIZE),
      );

      setPagination({
        page: Number(pageInfo.page ?? pageNumber),
        limit: Number(pageInfo.limit ?? PAGE_SIZE),
        total: Number(pageInfo.total ?? items.length),
        totalPages,
        hasNextPage: Boolean(pageInfo.hasNextPage ?? pageNumber < totalPages),
        hasPreviousPage: Boolean(pageInfo.hasPreviousPage ?? pageNumber > 1),
      });
    } catch (loadError) {
      setError(getErrorMessage(loadError, "Failed to load products."));
      setProducts([]);
      setPagination({ ...INITIAL_PAGINATION, page: pageNumber });
    } finally {
      setIsLoading(false);
    }
  }, []);

  // useEffect(() => {
  //   loadProducts(1, activeParams);
  // }, [loadProducts, activeParams]);

  useEffect(() => {
    async function fetchData() {
      await loadProducts(1, activeParams);
    }
    fetchData();
  }, [loadProducts, activeParams]);

  useEffect(() => {
    let active = true;

    Promise.all([LookupService.getCategories(), LookupService.getBrands()])
      .then(([categoryResult, brandResult]) => {
        if (!active) return;
        setCategories(unwrapList(categoryResult?.data ?? categoryResult));
        setBrands(unwrapList(brandResult?.data ?? brandResult));
      })
      .catch((lookupError) => {
        if (active) {
          // Filters remain usable even if lookup lists cannot be loaded.
          console.error("Failed to load product filter options:", lookupError);
        }
      });

    return () => {
      active = false;
    };
  }, []);

  function handleFilterChange(event) {
    const { name, value } = event.target;
    setFilters((current) => ({ ...current, [name]: value }));
  }

  function handleApplyFilters(event) {
    event.preventDefault();

    const min = filters.minPrice === "" ? null : Number(filters.minPrice);
    const max = filters.maxPrice === "" ? null : Number(filters.maxPrice);

    if (
      (min !== null && (!Number.isFinite(min) || min < 0)) ||
      (max !== null && (!Number.isFinite(max) || max < 0))
    ) {
      setError("Prices must be valid non-negative numbers.");
      return;
    }

    if (min !== null && max !== null && min > max) {
      setError("Minimum price cannot exceed maximum price.");
      return;
    }

    setError("");
    setActiveParams({ ...filters });
  }

  function handleResetFilters() {
    setFilters({ ...INITIAL_FILTERS });
    setActiveParams({ ...INITIAL_FILTERS });
    setError("");
  }

  async function handleCreated() {
    setIsCreating(false);
    setSelectedProductId(null);
    setEditingProductId(null);
    await loadProducts(1, activeParams);
  }

  async function handleUpdated() {
    // Return to the edited product's details when possible.
    const detailsId = selectedProductId || editingProductId;
    setEditingProductId(null);
    if (detailsId) setSelectedProductId(detailsId);
    await loadProducts(pagination.page, activeParams);
  }

  function openDetails(product) {
    const id = getProductId(product);
    if (id) setSelectedProductId(id);
  }

  function openEdit(id) {
    // Defense-in-depth UI gate; backend authorization remains authoritative.
    if (!canUpdate || !id) return;
    setEditingProductId(id);
  }

  function returnFromEdit() {
    setEditingProductId(null);
  }

  if (editingProductId) {
    if (!canUpdate) {
      // Prevent an unauthorized user from entering edit mode, even if state is triggered unexpectedly.
      return (
        <div className="space-y-4">
          <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700" role="alert">
            You do not have permission to edit products.
          </div>
          <Button type="button" variant="secondary" onClick={returnFromEdit}>
            Back
          </Button>
        </div>
      );
    }

    return (
      <ProductEditPage
        productId={editingProductId}
        onBack={returnFromEdit}
        onSuccess={handleUpdated}
      />
    );
  }

  if (selectedProductId) {
    return (
      <ProductDetailsPage
        productId={selectedProductId}
        onBack={() => setSelectedProductId(null)}
        onEdit={openEdit}
      />
    );
  }

  if (isCreating) {
    return (
      <ProductCreatePage
        onBack={() => setIsCreating(false)}
        onSuccess={handleCreated}
      />
    );
  }

  return (
    <div className="space-y-6">
      <header className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Products</h1>
          <p className="mt-1 text-sm text-gray-600">View and manage your product catalog.</p>
        </div>
        {canCreate && (
          <Button type="button" onClick={() => setIsCreating(true)}>
            Create product
          </Button>
        )}
      </header>

      <Card className="bg-white">
        <form onSubmit={handleApplyFilters} className="space-y-4">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <Input
              label="Search products"
              id="search"
              name="search"
              value={filters.search}
              onChange={handleFilterChange}
              placeholder="Name, SKU, code, barcode"
            />

            <div>
              <label htmlFor="categoryId" className="mb-1 block text-sm font-medium text-slate-700">
                Category
              </label>
              <select
                id="categoryId"
                name="categoryId"
                value={filters.categoryId}
                onChange={handleFilterChange}
                className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm"
              >
                <option value="">All categories</option>
                {categories.map((item) => {
                  const id = item?._id || item?.id;
                  if (!id) return null;
                  return (
                    <option key={id} value={id}>
                      {item.categoryName || item.name || item.title || "Unnamed category"}
                    </option>
                  );
                })}
              </select>
            </div>

            <div>
              <label htmlFor="brandId" className="mb-1 block text-sm font-medium text-slate-700">
                Brand
              </label>
              <select
                id="brandId"
                name="brandId"
                value={filters.brandId}
                onChange={handleFilterChange}
                className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm"
              >
                <option value="">All brands</option>
                {brands.map((item) => {
                  const id = item?._id || item?.id;
                  if (!id) return null;
                  return (
                    <option key={id} value={id}>
                      {item.brandName || item.name || item.title || "Unnamed brand"}
                    </option>
                  );
                })}
              </select>
            </div>

            <div>
              <label htmlFor="productType" className="mb-1 block text-sm font-medium text-slate-700">
                Product type
              </label>
              <select
                id="productType"
                name="productType"
                value={filters.productType}
                onChange={handleFilterChange}
                className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm"
              >
                <option value="">All types</option>
                <option value="physical">Physical</option>
                <option value="service">Service</option>
                <option value="digital">Digital</option>
              </select>
            </div>

            <div>
              <label htmlFor="status" className="mb-1 block text-sm font-medium text-slate-700">
                Status
              </label>
              <select
                id="status"
                name="status"
                value={filters.status}
                onChange={handleFilterChange}
                className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm"
              >
                <option value="">All statuses</option>
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
                <option value="discontinued">Discontinued</option>
              </select>
            </div>

            <Input
              label="Minimum price"
              id="minPrice"
              name="minPrice"
              inputType="number"
              value={filters.minPrice}
              onChange={handleFilterChange}
              placeholder="0"
            />
            <Input
              label="Maximum price"
              id="maxPrice"
              name="maxPrice"
              inputType="number"
              value={filters.maxPrice}
              onChange={handleFilterChange}
              placeholder="No maximum"
            />
          </div>

          <div className="flex flex-wrap gap-2">
            <Button type="submit">Apply filters</Button>
            <Button type="button" variant="secondary" onClick={handleResetFilters}>
              Reset
            </Button>
          </div>
        </form>
      </Card>

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700" role="alert">
          {error}
        </div>
      )}

      <Card className="overflow-hidden bg-white p-0">
        {isLoading ? (
          <div className="flex justify-center py-16">
            <LoadingSpinner label="Loading products..." />
          </div>
        ) : products.length === 0 ? (
          <div className="px-6 py-12 text-center">
            <h2 className="text-base font-semibold text-gray-900">No products found</h2>
            <p className="mt-1 text-sm text-gray-600">
              Try changing your search terms or filters.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-200">
              <thead className="bg-slate-50">
                <tr>
                  <th scope="col" className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">Product</th>
                  <th scope="col" className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">Code / SKU</th>
                  <th scope="col" className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">Category</th>
                  <th scope="col" className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wide text-slate-500">Selling price</th>
                  <th scope="col" className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">Status</th>
                  <th scope="col" className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wide text-slate-500">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 bg-white">
                {products.map((product, index) => {
                  const id = getProductId(product);
                  const categoryValue = product?.categoryId ?? product?.category;
                  const category =
                    typeof categoryValue === "object"
                      ? categoryValue?.categoryName || categoryValue?.name || categoryValue?.title || "—"
                      : categoryValue || "—";
                  const price = getSellingPrice(product);
                  const status = String(product?.status || "unknown");
                  const statusClass =
                    status.toLowerCase() === "active"
                      ? "bg-emerald-50 text-emerald-700"
                      : status.toLowerCase() === "inactive"
                        ? "bg-amber-50 text-amber-700"
                        : "bg-slate-100 text-slate-600";

                  return (
                    <tr key={id || `${product?.productName || "product"}-${index}`} className="hover:bg-slate-50">
                      <td className="px-4 py-4">
                        <button
                          type="button"
                          className="text-left font-medium text-slate-900 hover:text-emerald-700"
                          onClick={() => openDetails(product)}
                          disabled={!id}
                        >
                          {product?.productName || "Unnamed product"}
                        </button>
                        <div className="mt-1 text-xs text-slate-500">
                          {product?.productType || "—"}
                        </div>
                      </td>
                      <td className="whitespace-nowrap px-4 py-4 text-sm text-slate-600">
                        <div>{product?.productCode || "—"}</div>
                        {product?.sku && <div className="mt-1 text-xs text-slate-500">{product.sku}</div>}
                      </td>
                      <td className="px-4 py-4 text-sm text-slate-600">{category}</td>
                      <td className="whitespace-nowrap px-4 py-4 text-right text-sm font-medium text-slate-900">
                        {formatPrice(price)}
                      </td>
                      <td className="px-4 py-4">
                        <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-medium capitalize ${statusClass}`}>
                          {status}
                        </span>
                      </td>
                      <td className="whitespace-nowrap px-4 py-4 text-right">
                        <Button
                          type="button"
                          variant="secondary"
                          size="sm"
                          onClick={() => openDetails(product)}
                          disabled={!id}
                        >
                          View
                        </Button>
                        {canUpdate && (
                          <Button
                            type="button"
                            variant="secondary"
                            size="sm"
                            onClick={() => openEdit(id)}
                            disabled={!id}
                          >
                            Edit
                          </Button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm text-slate-600">
          Page {pagination.page}
          {pagination.totalPages ? ` of ${pagination.totalPages}` : ""} · {pagination.total} product(s)
        </p>
        <div className="flex gap-2">
          <Button
            type="button"
            variant="secondary"
            disabled={isLoading || !pagination.hasPreviousPage}
            onClick={() => loadProducts(Math.max(1, pagination.page - 1), activeParams)}
          >
            Previous
          </Button>
          <Button
            type="button"
            variant="secondary"
            disabled={isLoading || !pagination.hasNextPage}
            onClick={() => loadProducts(pagination.page + 1, activeParams)}
          >
            Next
          </Button>
        </div>
      </div>
    </div>
  );
}

export default ProductsPage;

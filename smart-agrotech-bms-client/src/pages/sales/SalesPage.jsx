
// // import { useCallback, useEffect, useState } from "react";
// import { useEffect, useState } from "react";


// import { SaleService } from "../../services/saleService";

// import { Badge } from "../../components/ui/Badge";
// import { Button } from "../../components/ui/Button";
// import { Card } from "../../components/ui/Card";
// import { Input } from "../../components/ui/Input";
// import { LoadingSpinner } from "../../components/ui/LoadingSpinner";

// const PAGE_SIZE = 10;

// const SALE_STATUSES = [
//   "DRAFT",
//   "CONFIRMED",
//   "partial_paid",
//   "paid",
//   "COMPLETED",
//   "CANCELLED",
//   "returned",
// ];

// const SORT_OPTIONS = [
//   { value: "createdAt", label: "Newest first" },
//   { value: "saleDate", label: "Sale date" },
//   { value: "invoiceNumber", label: "Invoice number" },
//   { value: "totalAmount", label: "Total amount" },
//   { value: "paidAmount", label: "Paid amount" },
//   { value: "dueAmount", label: "Due amount" },
// ];

// const formatAmount = (value) => {
//   const amount = Number(value);

//   if (!Number.isFinite(amount)) {
//     return "—";
//   }

//   return amount.toLocaleString(undefined, {
//     minimumFractionDigits: 2,
//     maximumFractionDigits: 2,
//   });
// };

// const formatDate = (value) => {
//   if (!value) return "—";

//   const date = new Date(value);

//   if (Number.isNaN(date.getTime())) {
//     return "—";
//   }

//   return date.toLocaleDateString();
// };

// const formatStatus = (status) => {
//   if (!status) return "Unknown";

//   return String(status)
//     .replaceAll("_", " ")
//     .toLowerCase()
//     .replace(/\b\w/g, (character) => character.toUpperCase());
// };

// const getStatusVariant = (status) => {
//   const normalized = String(status || "").toLowerCase();

//   if (["paid", "completed"].includes(normalized)) {
//     return "success";
//   }

//   if (["partial_paid", "confirmed"].includes(normalized)) {
//     return "warning";
//   }

//   if (["cancelled", "returned"].includes(normalized)) {
//     return "danger";
//   }

//   return "neutral";
// };

// const getErrorMessage = (error) => {
//   return (
//     error?.response?.data?.message ||
//     error?.message ||
//     "Unable to load sales. Please try again."
//   );
// };

// export function SalesPage() {
//   const [sales, setSales] = useState([]);
//   const [meta, setMeta] = useState({
//     page: 1,
//     limit: PAGE_SIZE,
//     total: 0,
//     totalPages: 1,
//   });

//   const [searchInput, setSearchInput] = useState("");
//   const [search, setSearch] = useState("");
//   const [status, setStatus] = useState("");
//   const [sortBy, setSortBy] = useState("createdAt");
//   const [sortOrder, setSortOrder] = useState("desc");

//   const [isLoading, setIsLoading] = useState(true);
//   const [error, setError] = useState("");

//   // const loadSales = useCallback(async () => {
//   //   setIsLoading(true);
//   //   setError("");

//   //   try {
//   //     const response = await SaleService.getSales({
//   //       search,
//   //       page: meta.page,
//   //       limit: PAGE_SIZE,
//   //       status,
//   //       sortBy,
//   //       sortOrder,
//   //     });

//   //     if (!response?.success) {
//   //       throw new Error(
//   //         response?.message || "The Sales request was not successful."
//   //       );
//   //     }

//   //     setSales(Array.isArray(response.data) ? response.data : []);

//   //     setMeta({
//   //       page: Number(response.meta?.page) || meta.page,
//   //       limit: Number(response.meta?.limit) || PAGE_SIZE,
//   //       total: Number(response.meta?.total) || 0,
//   //       totalPages: Math.max(
//   //         1,
//   //         Number(response.meta?.totalPages) || 1
//   //       ),
//   //     });
//   //   } catch (requestError) {
//   //     setSales([]);
//   //     setError(getErrorMessage(requestError));
//   //   } finally {
//   //     setIsLoading(false);
//   //   }
//   // }, [search, status, sortBy, sortOrder, meta.page]);

//   // useEffect(() => {
//   //   loadSales();
//   // }, [loadSales]);

//   const [refreshTrigger, setRefreshTrigger] = useState(0);

// // 1. Trigger manual refreshes/retries via event handler
// const handleRefresh = () => {
//   setRefreshTrigger((prev) => prev + 1);
// };

// // 2. Fetch inside useEffect with cleanup
// useEffect(() => {
//   let ignore = false;

//   async function fetchSales() {
//     // Yield to microtask queue so setState is not called synchronously
//     await Promise.resolve();
//     if (ignore) return;

//     setIsLoading(true);
//     setError("");

//     try {
//       const response = await SaleService.getSales({
//         search,
//         page: meta.page,
//         limit: PAGE_SIZE,
//         status,
//         sortBy,
//         sortOrder,
//       });

//       if (ignore) return;

//       if (!response?.success) {
//         throw new Error(
//           response?.message || "The Sales request was not successful."
//         );
//       }

//       setSales(Array.isArray(response.data) ? response.data : []);
//       setMeta((prev) => ({
//         ...prev,
//         limit: Number(response.meta?.limit) || PAGE_SIZE,
//         total: Number(response.meta?.total) || 0,
//         totalPages: Math.max(1, Number(response.meta?.totalPages) || 1),
//       }));
//     } catch (requestError) {
//       if (!ignore) {
//         setSales([]);
//         setError(getErrorMessage(requestError));
//       }
//     } finally {
//       if (!ignore) {
//         setIsLoading(false);
//       }
//     }
//   }

//   fetchSales();

//   return () => {
//     ignore = true;
//   };
// }, [search, status, sortBy, sortOrder, meta.page, refreshTrigger]);


//   const handleSearchSubmit = (event) => {
//     event.preventDefault();

//     setMeta((current) => ({
//       ...current,
//       page: 1,
//     }));

//     setSearch(searchInput.trim());
//   };

//   const handleStatusChange = (event) => {
//     setStatus(event.target.value);
//     setMeta((current) => ({
//       ...current,
//       page: 1,
//     }));
//   };

//   const handleSortChange = (event) => {
//     setSortBy(event.target.value);
//     setMeta((current) => ({
//       ...current,
//       page: 1,
//     }));
//   };

//   const handleSortOrderChange = (event) => {
//     setSortOrder(event.target.value);
//     setMeta((current) => ({
//       ...current,
//       page: 1,
//     }));
//   };

//   const handlePageChange = (nextPage) => {
//     setMeta((current) => ({
//       ...current,
//       page: nextPage,
//     }));
//   };

//   const startRecord =
//     meta.total === 0 ? 0 : (meta.page - 1) * PAGE_SIZE + 1;

//   const endRecord = Math.min(meta.page * PAGE_SIZE, meta.total);

//   return (
//     <div className="space-y-6">
//       <div>
//         <h1 className="text-2xl font-bold text-slate-900">
//           Sales
//         </h1>
//         <p className="mt-1 text-sm text-slate-500">
//           View and search recorded sales transactions.
//         </p>
//       </div>

//       <Card>
//         <form
//           onSubmit={handleSearchSubmit}
//           className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4"
//         >
//           <div className="lg:col-span-2">
//             <Input
//               id="sales-search"
//               label="Search invoice"
//               placeholder="Enter invoice number"
//               value={searchInput}
//               onChange={(event) => setSearchInput(event.target.value)}
//             />
//           </div>

//           <div>
//             <label
//               htmlFor="sales-status"
//               className="mb-2 block text-sm font-medium text-slate-700"
//             >
//               Status
//             </label>
//             <select
//               id="sales-status"
//               value={status}
//               onChange={handleStatusChange}
//               className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm outline-none focus:border-emerald-600 focus:ring-2 focus:ring-emerald-100"
//             >
//               <option value="">All statuses</option>
//               {SALE_STATUSES.map((item) => (
//                 <option key={item} value={item}>
//                   {formatStatus(item)}
//                 </option>
//               ))}
//             </select>
//           </div>

//           <div className="flex items-end">
//             <Button type="submit" className="w-full">
//               Search
//             </Button>
//           </div>

//           <div>
//             <label
//               htmlFor="sales-sort"
//               className="mb-2 block text-sm font-medium text-slate-700"
//             >
//               Sort by
//             </label>
//             <select
//               id="sales-sort"
//               value={sortBy}
//               onChange={handleSortChange}
//               className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm outline-none focus:border-emerald-600 focus:ring-2 focus:ring-emerald-100"
//             >
//               {SORT_OPTIONS.map((option) => (
//                 <option key={option.value} value={option.value}>
//                   {option.label}
//                 </option>
//               ))}
//             </select>
//           </div>

//           <div>
//             <label
//               htmlFor="sales-sort-order"
//               className="mb-2 block text-sm font-medium text-slate-700"
//             >
//               Order
//             </label>
//             <select
//               id="sales-sort-order"
//               value={sortOrder}
//               onChange={handleSortOrderChange}
//               className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm outline-none focus:border-emerald-600 focus:ring-2 focus:ring-emerald-100"
//             >
//               <option value="desc">Descending</option>
//               <option value="asc">Ascending</option>
//             </select>
//           </div>
//         </form>
//       </Card>

//       <Card className="p-0!">
//         <div className="flex flex-col gap-2 border-b border-slate-200 px-6 py-4 sm:flex-row sm:items-center sm:justify-between">
//           <div>
//             <h2 className="text-lg font-semibold text-slate-900">
//               Sales records
//             </h2>
//             <p className="text-sm text-slate-500">
//               {meta.total.toLocaleString()} total records
//             </p>
//           </div>

//           <Button
//             variant="secondary"
//             onClick={handleRefresh}
//             disabled={isLoading}
//           >
//             Refresh
//           </Button>
//         </div>

//         {isLoading ? (
//           <div className="p-6">
//             <LoadingSpinner label="Loading sales..." />
//           </div>
//         ) : error ? (
//           <div className="p-6">
//             <p className="text-sm text-red-600">{error}</p>
//             <Button
//               className="mt-4"
//               onClick={handleRefresh}
//             >
//               Retry
//             </Button>
//           </div>
//         ) : sales.length === 0 ? (
//           <div className="px-6 py-12 text-center">
//             <h3 className="font-semibold text-slate-800">
//               No sales found
//             </h3>
//             <p className="mt-1 text-sm text-slate-500">
//               No sales records match the current search or filters.
//             </p>
//           </div>
//         ) : (
//           <>
//             <div className="overflow-x-auto">
//               <table className="min-w-full divide-y divide-slate-200">
//                 <thead className="bg-slate-50">
//                   <tr>
//                     {[
//                       "Invoice",
//                       "Customer",
//                       "Sale date",
//                       "Total",
//                       "Paid",
//                       "Due",
//                       "Status",
//                     ].map((heading) => (
//                       <th
//                         key={heading}
//                         scope="col"
//                         className="whitespace-nowrap px-6 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500"
//                       >
//                         {heading}
//                       </th>
//                     ))}
//                   </tr>
//                 </thead>

//                 <tbody className="divide-y divide-slate-200 bg-white">
//                   {sales.map((sale) => (
//                     <tr
//                       key={sale._id || sale.publicId}
//                       className="hover:bg-slate-50"
//                     >
//                       <td className="whitespace-nowrap px-6 py-4 text-sm font-medium text-slate-900">
//                         {sale.invoiceNumber || sale.publicId || "—"}
//                       </td>

//                       <td className="min-w-48 px-6 py-4">
//                         <p className="text-sm font-medium text-slate-800">
//                           {sale.customerId?.name || "Unknown customer"}
//                         </p>
//                         {sale.customerId?.phone && (
//                           <p className="mt-1 text-xs text-slate-500">
//                             {sale.customerId.phone}
//                           </p>
//                         )}
//                       </td>

//                       <td className="whitespace-nowrap px-6 py-4 text-sm text-slate-600">
//                         {formatDate(sale.saleDate)}
//                       </td>

//                       <td className="whitespace-nowrap px-6 py-4 text-sm text-slate-700">
//                         {formatAmount(sale.totalAmount)}
//                       </td>

//                       <td className="whitespace-nowrap px-6 py-4 text-sm text-emerald-700">
//                         {formatAmount(sale.paidAmount)}
//                       </td>

//                       <td className="whitespace-nowrap px-6 py-4 text-sm text-slate-700">
//                         {formatAmount(sale.dueAmount)}
//                       </td>

//                       <td className="whitespace-nowrap px-6 py-4">
//                         <Badge variant={getStatusVariant(sale.status)}>
//                           {formatStatus(sale.status)}
//                         </Badge>
//                       </td>
//                     </tr>
//                   ))}
//                 </tbody>
//               </table>
//             </div>

//             <div className="flex flex-col gap-3 border-t border-slate-200 px-6 py-4 sm:flex-row sm:items-center sm:justify-between">
//               <p className="text-sm text-slate-500">
//                 Showing {startRecord}–{endRecord} of {meta.total}
//               </p>

//               <div className="flex items-center gap-2">
//                 <Button
//                   variant="secondary"
//                   disabled={meta.page <= 1}
//                   onClick={() => handlePageChange(meta.page - 1)}
//                 >
//                   Previous
//                 </Button>

//                 <span className="px-2 text-sm text-slate-600">
//                   Page {meta.page} of {meta.totalPages}
//                 </span>

//                 <Button
//                   variant="secondary"
//                   disabled={meta.page >= meta.totalPages}
//                   onClick={() => handlePageChange(meta.page + 1)}
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

// export default SalesPage;







import { useEffect, useState } from "react";

import { SaleService } from "../../services/saleService";

import { Badge } from "../../components/ui/Badge";
import { Button } from "../../components/ui/Button";
import { Card } from "../../components/ui/Card";
import { Input } from "../../components/ui/Input";
import { LoadingSpinner } from "../../components/ui/LoadingSpinner";

const PAGE_SIZE = 10;

const SALE_STATUSES = [
  "DRAFT",
  "CONFIRMED",
  "partial_paid",
  "paid",
  "COMPLETED",
  "CANCELLED",
  "returned",
];

const SORT_OPTIONS = [
  { value: "createdAt", label: "Newest first" },
  { value: "saleDate", label: "Sale date" },
  { value: "invoiceNumber", label: "Invoice number" },
  { value: "totalAmount", label: "Total amount" },
  { value: "paidAmount", label: "Paid amount" },
  { value: "dueAmount", label: "Due amount" },
];

const formatAmount = (value) => {
  const amount = Number(value);

  if (!Number.isFinite(amount)) {
    return "—";
  }

  return amount.toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
};

const formatDate = (value) => {
  if (!value) return "—";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "—";
  }

  return date.toLocaleDateString();
};

const formatStatus = (status) => {
  if (!status) return "Unknown";

  return String(status)
    .replaceAll("_", " ")
    .toLowerCase()
    .replace(/\b\w/g, (character) => character.toUpperCase());
};

const getStatusVariant = (status) => {
  const normalized = String(status || "").toLowerCase();

  if (["paid", "completed"].includes(normalized)) {
    return "success";
  }

  if (["partial_paid", "confirmed"].includes(normalized)) {
    return "warning";
  }

  if (["cancelled", "returned"].includes(normalized)) {
    return "danger";
  }

  return "neutral";
};

const getErrorMessage = (error) => {
  return (
    error?.response?.data?.message ||
    error?.message ||
    "Unable to load sales. Please try again."
  );
};

export function SalesPage() {
  const [sales, setSales] = useState([]);
  const [meta, setMeta] = useState({
    page: 1,
    limit: PAGE_SIZE,
    total: 0,
    totalPages: 1,
  });

  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("");
  const [sortBy, setSortBy] = useState("createdAt");
  const [sortOrder, setSortOrder] = useState("desc");

  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");

  const [refreshTrigger, setRefreshTrigger] = useState(0);

// 1. Trigger manual refreshes/retries via event handler
const handleRefresh = () => {
  setRefreshTrigger((prev) => prev + 1);
};

// 2. Fetch inside useEffect with cleanup
useEffect(() => {
  let ignore = false;

  async function fetchSales() {
    // Yield to microtask queue so setState is not called synchronously
    await Promise.resolve();
    if (ignore) return;

    setIsLoading(true);
    setError("");

    try {
      const response = await SaleService.getSales({
        search,
        page: meta.page,
        limit: PAGE_SIZE,
        status,
        sortBy,
        sortOrder,
      });

      if (ignore) return;

      if (!response?.success) {
        throw new Error(
          response?.message || "The Sales request was not successful."
        );
      }

      setSales(Array.isArray(response.data) ? response.data : []);
      const responsePage = Number(response.meta?.page) || meta.page;
      const responseLimit = Number(response.meta?.limit) || PAGE_SIZE;
      const responseTotal = Number(response.meta?.total) || 0;
      const responseTotalPages = Number(response.meta?.totalPages) || 0;

      setMeta((prev) => ({
        ...prev,
        page: responsePage,
        limit: responseLimit,
        total: responseTotal,
        totalPages: responseTotalPages,
      }));
    } catch (requestError) {
      if (!ignore) {
        setSales([]);
        setError(getErrorMessage(requestError));
      }
    } finally {
      if (!ignore) {
        setIsLoading(false);
      }
    }
  }

  fetchSales();

  return () => {
    ignore = true;
  };
}, [search, status, sortBy, sortOrder, meta.page, refreshTrigger]);


  const handleSearchSubmit = (event) => {
    event.preventDefault();

    setMeta((current) => ({
      ...current,
      page: 1,
    }));

    setSearch(searchInput.trim());
  };

  const handleStatusChange = (event) => {
    setStatus(event.target.value);
    setMeta((current) => ({
      ...current,
      page: 1,
    }));
  };

  const handleSortChange = (event) => {
    setSortBy(event.target.value);
    setMeta((current) => ({
      ...current,
      page: 1,
    }));
  };

  const handleSortOrderChange = (event) => {
    setSortOrder(event.target.value);
    setMeta((current) => ({
      ...current,
      page: 1,
    }));
  };

  const handlePageChange = (nextPage) => {
    const lastPage = meta.totalPages;

    if (
      isLoading ||
      !Number.isInteger(nextPage) ||
      nextPage < 1 ||
      nextPage > lastPage ||
      nextPage === meta.page
    ) {
      return;
    }

    setMeta((current) => ({
      ...current,
      page: nextPage,
    }));
  };

  const effectivePageSize = meta.limit || PAGE_SIZE;
  const startRecord =
    meta.total === 0 ? 0 : (meta.page - 1) * effectivePageSize + 1;

  const endRecord = Math.min(
    meta.page * effectivePageSize,
    meta.total
  );

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">
          Sales
        </h1>
        <p className="mt-1 text-sm text-slate-500">
          View and search recorded sales transactions.
        </p>
      </div>

      <Card>
        <form
          onSubmit={handleSearchSubmit}
          className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4"
        >
          <div className="lg:col-span-2">
            <Input
              id="sales-search"
              label="Search invoice"
              placeholder="Enter invoice number"
              value={searchInput}
              onChange={(event) => setSearchInput(event.target.value)}
            />
          </div>

          <div>
            <label
              htmlFor="sales-status"
              className="mb-2 block text-sm font-medium text-slate-700"
            >
              Status
            </label>
            <select
              id="sales-status"
              value={status}
              onChange={handleStatusChange}
              className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm outline-none focus:border-emerald-600 focus:ring-2 focus:ring-emerald-100"
            >
              <option value="">All statuses</option>
              {SALE_STATUSES.map((item) => (
                <option key={item} value={item}>
                  {formatStatus(item)}
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-end">
            <Button type="submit" className="w-full">
              Search
            </Button>
          </div>

          <div>
            <label
              htmlFor="sales-sort"
              className="mb-2 block text-sm font-medium text-slate-700"
            >
              Sort by
            </label>
            <select
              id="sales-sort"
              value={sortBy}
              onChange={handleSortChange}
              className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm outline-none focus:border-emerald-600 focus:ring-2 focus:ring-emerald-100"
            >
              {SORT_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label
              htmlFor="sales-sort-order"
              className="mb-2 block text-sm font-medium text-slate-700"
            >
              Order
            </label>
            <select
              id="sales-sort-order"
              value={sortOrder}
              onChange={handleSortOrderChange}
              className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm outline-none focus:border-emerald-600 focus:ring-2 focus:ring-emerald-100"
            >
              <option value="desc">Descending</option>
              <option value="asc">Ascending</option>
            </select>
          </div>
        </form>
      </Card>

      <Card className="p-0!">
        <div className="flex flex-col gap-2 border-b border-slate-200 px-6 py-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-lg font-semibold text-slate-900">
              Sales records
            </h2>
            <p className="text-sm text-slate-500">
              {meta.total.toLocaleString()} total records
            </p>
          </div>

          <Button
            variant="secondary"
            onClick={handleRefresh}
            disabled={isLoading}
          >
            Refresh
          </Button>
        </div>

        {isLoading ? (
          <div className="p-6">
            <LoadingSpinner label="Loading sales..." />
          </div>
        ) : error ? (
          <div className="p-6">
            <p className="text-sm text-red-600">{error}</p>
            <Button
              className="mt-4"
              onClick={handleRefresh}
            >
              Retry
            </Button>
          </div>
        ) : sales.length === 0 ? (
          <>
            <div className="px-6 py-12 text-center">
              <h3 className="font-semibold text-slate-800">
                No sales found
              </h3>
              <p className="mt-1 text-sm text-slate-500">
                No sales records match the current search or filters.
              </p>
            </div>
            <div className="flex flex-col gap-3 border-t border-slate-200 px-6 py-4 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-sm text-slate-500">
                Showing 0 of {meta.total} sales
              </p>
              <div className="flex items-center gap-2">
                <Button variant="secondary" disabled>
                  Previous
                </Button>
                <span className="px-2 text-sm text-slate-600">
                  Page {meta.page} of {meta.totalPages}
                </span>
                <Button variant="secondary" disabled>
                  Next
                </Button>
              </div>
            </div>
          </>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-slate-200">
                <thead className="bg-slate-50">
                  <tr>
                    {[
                      "Invoice",
                      "Customer",
                      "Sale date",
                      "Total",
                      "Paid",
                      "Due",
                      "Status",
                    ].map((heading) => (
                      <th
                        key={heading}
                        scope="col"
                        className="whitespace-nowrap px-6 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500"
                      >
                        {heading}
                      </th>
                    ))}
                  </tr>
                </thead>

                <tbody className="divide-y divide-slate-200 bg-white">
                  {sales.map((sale) => (
                    <tr
                      key={sale._id || sale.publicId}
                      className="hover:bg-slate-50"
                    >
                      <td className="whitespace-nowrap px-6 py-4 text-sm font-medium text-slate-900">
                        {sale.invoiceNumber || sale.publicId || "—"}
                      </td>

                      <td className="min-w-48 px-6 py-4">
                        <p className="text-sm font-medium text-slate-800">
                          {sale.customerId?.name || "Unknown customer"}
                        </p>
                        {sale.customerId?.phone && (
                          <p className="mt-1 text-xs text-slate-500">
                            {sale.customerId.phone}
                          </p>
                        )}
                      </td>

                      <td className="whitespace-nowrap px-6 py-4 text-sm text-slate-600">
                        {formatDate(sale.saleDate)}
                      </td>

                      <td className="whitespace-nowrap px-6 py-4 text-sm text-slate-700">
                        {formatAmount(sale.totalAmount)}
                      </td>

                      <td className="whitespace-nowrap px-6 py-4 text-sm text-emerald-700">
                        {formatAmount(sale.paidAmount)}
                      </td>

                      <td className="whitespace-nowrap px-6 py-4 text-sm text-slate-700">
                        {formatAmount(sale.dueAmount)}
                      </td>

                      <td className="whitespace-nowrap px-6 py-4">
                        <Badge variant={getStatusVariant(sale.status)}>
                          {formatStatus(sale.status)}
                        </Badge>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="flex flex-col gap-3 border-t border-slate-200 px-6 py-4 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-sm text-slate-500">
                Showing {startRecord}–{endRecord} of {meta.total}
              </p>

              <div className="flex items-center gap-2">
                <Button
                  variant="secondary"
                  disabled={isLoading || meta.page <= 1}
                  onClick={() => handlePageChange(meta.page - 1)}
                >
                  Previous
                </Button>

                <span className="px-2 text-sm text-slate-600">
                  Page {meta.page} of {meta.totalPages}
                </span>

                <Button
                  variant="secondary"
                  disabled={
                    isLoading ||
                    meta.totalPages === 0 ||
                    meta.page >= meta.totalPages
                  }
                  onClick={() => handlePageChange(meta.page + 1)}
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

export default SalesPage;


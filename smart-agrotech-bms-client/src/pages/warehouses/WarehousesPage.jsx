import { useCallback, useEffect, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { Plus, Search, RefreshCw } from "lucide-react";
import { WarehouseService } from "../../services/warehouseService";
import { Card } from "../../components/ui/Card";
import { Button } from "../../components/ui/Button";
import { LoadingSpinner } from "../../components/ui/LoadingSpinner";
import { useAuth } from "../../hooks/useAuth";

const PAGE_SIZE = 10;
function getRole(user) {
  const raw = user?.role?.name ?? user?.role ?? user?.user?.role?.name ?? user?.user?.role ?? user?.userRole ?? user?.roleName ?? "";
  return String(raw).trim().toLowerCase().replace(/[\s-]+/g, "_");
}
function getErrorMessage(error) {
  const data = error?.response?.data;
  if (Array.isArray(data?.errors)) return data.errors.map((item) => item?.message || item?.msg || String(item)).join(" ");
  if (typeof data?.message === "string" && data.message.trim()) return data.message;
  if (error?.message === "Network Error") return "Could not connect to the server. Check that the backend is running.";
  return error?.message || "Unable to load warehouses.";
}

export default function WarehousesPage() {
  const { user } = useAuth();
  const location = useLocation();
  const canCreate = ["admin", "moderator"].includes(getRole(user));
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [warehouses, setWarehouses] = useState([]);
  const [meta, setMeta] = useState({ page: 1, limit: PAGE_SIZE, total: 0, totalPages: 0 });
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const notice = location.state?.notice || "";

  const loadWarehouses = useCallback(async () => {
    setIsLoading(true);
    setError("");
    try {
      const response = await WarehouseService.getWarehouses({ page, limit: PAGE_SIZE, search: search.trim() || undefined, sortBy: "createdAt", sortOrder: "desc" });
      const rows = Array.isArray(response?.data) ? response.data : Array.isArray(response?.data?.data) ? response.data.data : [];
      setWarehouses(rows);
      setMeta(response?.meta || response?.data?.meta || { page, limit: PAGE_SIZE, total: rows.length, totalPages: rows.length ? 1 : 0 });
    } catch (loadError) {
      setWarehouses([]);
      setError(getErrorMessage(loadError));
    } finally {
      setIsLoading(false);
    }
  }, [page, search]);

  useEffect(() => {
    const timer = setTimeout(() => { void loadWarehouses(); }, 0);
    return () => clearTimeout(timer);
  }, [loadWarehouses]);


  function handleSearch(event) {
    event.preventDefault();
    setPage(1);
    void loadWarehouses();
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div><h1 className="text-2xl font-bold text-slate-900">Warehouse Management</h1><p className="mt-1 text-sm text-slate-500">Manage active warehouse locations used by sales and inventory.</p></div>
        {canCreate && <Link to="/warehouses/new" className="inline-flex items-center justify-center gap-2 rounded-lg bg-emerald-700 px-4 py-2.5 text-sm font-semibold text-white hover:bg-emerald-800"><Plus size={17} /> Create Warehouse</Link>}
      </div>
      {notice && <div role="status" className="rounded-lg bg-emerald-50 p-3 text-sm text-emerald-800">{notice}</div>}
      <Card>
        <form onSubmit={handleSearch} className="flex flex-col gap-3 sm:flex-row">
          <div className="relative flex-1"><Search size={17} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" /><input value={search} onChange={(event) => { setSearch(event.target.value); setPage(1); }} placeholder="Search warehouse name or code" className="w-full rounded-lg border border-slate-300 py-2.5 pl-10 pr-3 text-sm" /></div>
          <Button type="submit">Search</Button>
          <Button type="button" variant="secondary" onClick={() => { setSearch(""); setPage(1); }}><RefreshCw size={15} /> Reset</Button>
        </form>
      </Card>
      <Card>
        {isLoading ? <LoadingSpinner label="Loading warehouses..." /> : error ? <div className="space-y-3"><p role="alert" className="text-sm text-red-700">{error}</p><Button type="button" onClick={() => void loadWarehouses()}>Try again</Button></div> : warehouses.length === 0 ? <div className="py-8 text-center"><h2 className="font-semibold text-slate-800">No active warehouses found</h2><p className="mt-1 text-sm text-slate-500">Create an active warehouse to make it available in the Sales form.</p></div> : <div className="overflow-x-auto"><table className="min-w-full divide-y divide-slate-200 text-sm"><thead className="bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500"><tr><th className="px-4 py-3">Warehouse</th><th className="px-4 py-3">Code</th><th className="px-4 py-3">Status</th><th className="px-4 py-3">Public ID</th></tr></thead><tbody className="divide-y divide-slate-100">{warehouses.map((warehouse) => <tr key={warehouse._id || warehouse.publicId}><td className="px-4 py-3 font-medium text-slate-900">{warehouse.warehouseName}</td><td className="px-4 py-3 text-slate-600">{warehouse.warehouseCode}</td><td className="px-4 py-3"><span className="rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-medium text-emerald-700">{warehouse.status}</span></td><td className="px-4 py-3 text-slate-500">{warehouse.publicId}</td></tr>)}</tbody></table></div>}
        {!isLoading && !error && meta.totalPages > 1 && <div className="mt-5 flex items-center justify-between"><p className="text-sm text-slate-500">Page {meta.page || page} of {meta.totalPages}</p><div className="flex gap-2"><Button type="button" variant="secondary" disabled={page <= 1} onClick={() => setPage((value) => Math.max(1, value - 1))}>Previous</Button><Button type="button" variant="secondary" disabled={page >= meta.totalPages} onClick={() => setPage((value) => value + 1)}>Next</Button></div></div>}
      </Card>
      <p className="text-xs text-slate-500">This list follows the current backend contract and shows active, non-deleted warehouses only. Inactive/deleted warehouse administration is not included in the supplied API.</p>
    </div>
  );
}

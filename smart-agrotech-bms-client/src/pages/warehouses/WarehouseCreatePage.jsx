import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { WarehouseService } from "../../services/warehouseService";
import { Card } from "../../components/ui/Card";
import { Button } from "../../components/ui/Button";

const INITIAL_FORM = {
  warehouseName: "",
  warehouseCode: "",
  description: "",
  address: "",
  contactPerson: "",
  phone: "",
  status: "active",
};

function getErrorMessage(error) {
  const data = error?.response?.data;
  if (Array.isArray(data?.errors) && data.errors.length) {
    return data.errors.map((item) => item?.message || item?.msg || String(item)).join(" ");
  }
  if (typeof data?.message === "string" && data.message.trim()) return data.message;
  if (error?.message === "Network Error") return "Could not connect to the server. Check that the backend is running.";
  return error?.message || "Unable to create warehouse. Please try again.";
}

export default function WarehouseCreatePage() {
  const navigate = useNavigate();
  const [formData, setFormData] = useState(INITIAL_FORM);
  const [apiError, setApiError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  function handleChange(event) {
    const { name, value } = event.target;
    setFormData((previous) => ({ ...previous, [name]: value }));
  }

  async function handleSubmit(event) {
    event.preventDefault();
    if (isSubmitting) return;
    setApiError("");
    if (!formData.warehouseName.trim() || !formData.warehouseCode.trim()) {
      setApiError("Warehouse name and warehouse code are required.");
      return;
    }
    setIsSubmitting(true);
    try {
      const payload = {
        warehouseName: formData.warehouseName.trim(),
        warehouseCode: formData.warehouseCode.trim().toUpperCase(),
        description: formData.description.trim(),
        address: formData.address.trim(),
        contactPerson: formData.contactPerson.trim(),
        phone: formData.phone.trim(),
        status: formData.status,
      };
      await WarehouseService.createWarehouse(payload);
      navigate("/warehouses", { replace: true, state: { notice: "Warehouse created successfully." } });
    } catch (error) {
      setApiError(getErrorMessage(error));
    } finally {
      setIsSubmitting(false);
    }
  }

  const fields = [
    ["warehouseName", "Warehouse name", "text", true],
    ["warehouseCode", "Warehouse code", "text", true],
    ["contactPerson", "Contact person", "text", false],
    ["phone", "Phone", "tel", false],
    ["address", "Address", "text", false],
  ];

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <Link to="/warehouses" className="text-sm font-medium text-emerald-700 hover:underline">← Back to warehouses</Link>
        <h1 className="mt-3 text-2xl font-bold text-slate-900">Create Warehouse</h1>
        <p className="mt-1 text-sm text-slate-500">Add a warehouse location to your business.</p>
      </div>
      <Card>
        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="grid gap-5 sm:grid-cols-2">
            {fields.map(([name, label, type, required]) => (
              <div key={name} className={name === "address" ? "sm:col-span-2" : ""}>
                <label htmlFor={name} className="mb-2 block text-sm font-medium text-slate-700">{label}{required ? " *" : ""}</label>
                <input id={name} name={name} type={type} value={formData[name]} onChange={handleChange} required={required} maxLength={name === "warehouseName" ? 150 : name === "warehouseCode" ? 30 : undefined} className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm outline-none focus:border-emerald-600 focus:ring-2 focus:ring-emerald-100" />
              </div>
            ))}
            <div className="sm:col-span-2">
              <label htmlFor="description" className="mb-2 block text-sm font-medium text-slate-700">Description</label>
              <textarea id="description" name="description" value={formData.description} onChange={handleChange} rows={3} maxLength={500} className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm outline-none focus:border-emerald-600 focus:ring-2 focus:ring-emerald-100" />
            </div>
            <div>
              <label htmlFor="status" className="mb-2 block text-sm font-medium text-slate-700">Status</label>
              <select id="status" name="status" value={formData.status} onChange={handleChange} className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm">
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
              </select>
            </div>
          </div>
          {apiError && <p role="alert" className="rounded-lg bg-red-50 p-3 text-sm text-red-700">{apiError}</p>}
          <div className="flex flex-wrap justify-end gap-3">
            <Link to="/warehouses" className="rounded-lg border border-slate-300 px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50">Cancel</Link>
            <Button type="submit" disabled={isSubmitting}>{isSubmitting ? "Creating..." : "Create Warehouse"}</Button>
          </div>
        </form>
      </Card>
    </div>
  );
}

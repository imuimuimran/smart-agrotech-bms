import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import BrandService from "../../services/brandService";
import { Button } from "../../components/ui/Button";
import { Card } from "../../components/ui/Card";

const INITIAL_FORM = { brandName: "", brandCode: "", description: "", logo: "", website: "", country: "", status: "active" };

function FieldError({ children }) {
  return children ? <p className="mt-1 text-sm text-red-600" role="alert">{children}</p> : null;
}

function getApiMessage(error) {
  const data = error?.response?.data;
  if (typeof data?.message === "string" && data.message.trim()) return data.message;
  if (error?.response?.status === 401) return "Your session may have expired. Please sign in again.";
  if (error?.response?.status === 403) return "Your account is not permitted to create brands. Only administrators and moderators can create brands.";
  if (error?.response?.status === 409) return "A brand with this name or code already exists. Check the values and try again.";
  if (error?.message === "Network Error") return "Could not connect to the server. Check that the backend is running.";
  return error?.message || "Brand creation failed. Please try again.";
}

function validUrlOrEmpty(value) {
  const text = value.trim();
  if (!text) return true;
  try { const parsed = new URL(text); return Boolean(parsed.protocol && parsed.host); }
  catch { return false; }
}

function validate(form) {
  const errors = {};
  const name = form.brandName.trim();
  const code = form.brandCode.trim();
  if (name.length < 2) errors.brandName = "Brand name must be at least 2 characters.";
  else if (name.length > 100) errors.brandName = "Brand name cannot exceed 100 characters.";
  if (code.length < 2) errors.brandCode = "Brand code must be at least 2 characters.";
  else if (code.length > 20) errors.brandCode = "Brand code cannot exceed 20 characters.";
  if (form.description.trim().length > 500) errors.description = "Description cannot exceed 500 characters.";
  if (form.country.trim().length > 100) errors.country = "Country cannot exceed 100 characters.";
  if (!validUrlOrEmpty(form.logo)) errors.logo = "Logo must be a valid URL or left blank.";
  if (!validUrlOrEmpty(form.website)) errors.website = "Website must be a valid URL or left blank.";
  if (!["active", "inactive"].includes(form.status)) errors.status = "Choose active or inactive.";
  return errors;
}

function TextField({ id, label, value, onChange, error, required, maxLength, placeholder, hint }) {
  return <div>
    <label htmlFor={id} className="mb-1.5 block text-sm font-medium text-slate-700">{label}{required && <span className="ml-1 text-red-600">*</span>}</label>
    <input id={id} name={id} value={value} onChange={onChange} required={required} maxLength={maxLength} placeholder={placeholder} aria-invalid={Boolean(error)} className={`w-full rounded-lg border bg-white px-3 py-2.5 text-sm text-slate-900 outline-none focus:ring-2 ${error ? "border-red-400 focus:border-red-500 focus:ring-red-100" : "border-slate-300 focus:border-emerald-600 focus:ring-emerald-100"}`} />
    {hint && !error && <p className="mt-1 text-xs text-slate-500">{hint}</p>}
    <FieldError>{error}</FieldError>
  </div>;
}

export default function BrandCreatePage({ onBack, onSuccess }) {
  const navigate = useNavigate();
  const [form, setForm] = useState({ ...INITIAL_FORM });
  const [fieldErrors, setFieldErrors] = useState({});
  const [apiError, setApiError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [createdBrand, setCreatedBrand] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  function handleChange(event) {
    const { name, value } = event.target;
    setForm((current) => ({ ...current, [name]: name === "brandCode" ? value.toUpperCase() : value }));
    setFieldErrors((current) => ({ ...current, [name]: undefined }));
    setApiError(""); setSuccessMessage(""); setCreatedBrand(null);
  }

  function goBack() { if (onBack) onBack(); else navigate("/brands"); }

  async function handleSubmit(event) {
    event.preventDefault();
    if (isSubmitting) return;
    const errors = validate(form);
    setFieldErrors(errors); setApiError(""); setSuccessMessage(""); setCreatedBrand(null);
    if (Object.keys(errors).length) { setApiError("Please correct the highlighted fields and submit again."); return; }
    const payload = {
      brandName: form.brandName.trim(), brandCode: form.brandCode.trim().toUpperCase(),
      description: form.description.trim(), logo: form.logo.trim(), website: form.website.trim(),
      country: form.country.trim(), status: form.status,
    };
    setIsSubmitting(true);
    try {
      // Backend contract: POST /api/v1/brands, response envelope { success, message, data: brand }.
      const result = await BrandService.createBrand(payload);
      const saved = result?.data || null;
      setCreatedBrand(saved);
      setSuccessMessage(result?.message || "Brand created successfully.");
      setForm({ ...INITIAL_FORM }); setFieldErrors({});
      if (onSuccess) onSuccess(saved);
    } catch (error) {
      setApiError(getApiMessage(error));
      const details = error?.response?.data?.errors || error?.response?.data?.error?.issues;
      if (Array.isArray(details)) {
        const next = {};
        details.forEach((item) => {
          const field = Array.isArray(item.path) ? item.path[item.path.length - 1] : item.field;
          if (field && Object.prototype.hasOwnProperty.call(INITIAL_FORM, field)) next[field] = item.message || item.msg || "Please check this field.";
        });
        if (Object.keys(next).length) setFieldErrors(next);
      }
    } finally { setIsSubmitting(false); }
  }

  return <main className="mx-auto max-w-4xl space-y-5 p-4 sm:p-6 lg:p-8">
    <div><Link to="/brands" className="text-sm font-medium text-emerald-700 hover:text-emerald-900">← Back to brands</Link>
      <h1 className="mt-3 text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">Create brand</h1>
      <p className="mt-1 text-sm text-slate-500">Add a brand to the Smart AgroTech BMS catalog.</p></div>
    <Card className="p-5 sm:p-7">
      <form onSubmit={handleSubmit} noValidate>
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
          <TextField id="brandName" label="Brand name" value={form.brandName} onChange={handleChange} error={fieldErrors.brandName} required maxLength={100} placeholder="e.g. Acme Agro" hint="2–100 characters." />
          <TextField id="brandCode" label="Brand code" value={form.brandCode} onChange={handleChange} error={fieldErrors.brandCode} required maxLength={20} placeholder="e.g. ACME" hint="2–20 characters; sent in uppercase." />
          <div className="sm:col-span-2"><label htmlFor="description" className="mb-1.5 block text-sm font-medium text-slate-700">Description</label>
            <textarea id="description" name="description" value={form.description} onChange={handleChange} maxLength={500} rows={4} placeholder="Optional description of the brand" aria-invalid={Boolean(fieldErrors.description)} className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-900 outline-none focus:border-emerald-600 focus:ring-2 focus:ring-emerald-100" />
            <div className="mt-1 flex justify-between gap-3"><FieldError>{fieldErrors.description}</FieldError><span className="ml-auto text-xs text-slate-500">{form.description.length}/500</span></div></div>
          <TextField id="logo" label="Logo URL" value={form.logo} onChange={handleChange} error={fieldErrors.logo} placeholder="https://example.com/logo.png" hint="Optional; enter a valid URL or leave blank." />
          <TextField id="website" label="Website URL" value={form.website} onChange={handleChange} error={fieldErrors.website} placeholder="https://example.com" hint="Optional; enter a valid URL or leave blank." />
          <TextField id="country" label="Country" value={form.country} onChange={handleChange} error={fieldErrors.country} maxLength={100} placeholder="e.g. Bangladesh" hint="Optional; up to 100 characters." />
          <div><label htmlFor="status" className="mb-1.5 block text-sm font-medium text-slate-700">Status</label>
            <select id="status" name="status" value={form.status} onChange={handleChange} className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-900 outline-none focus:border-emerald-600 focus:ring-2 focus:ring-emerald-100"><option value="active">Active</option><option value="inactive">Inactive</option></select><FieldError>{fieldErrors.status}</FieldError></div>
        </div>
        {apiError && <div role="alert" className="mt-5 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">{apiError}</div>}
        {successMessage && <div role="status" className="mt-5 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-900"><p className="font-semibold">{successMessage}</p>
          {createdBrand?.publicId && <p className="mt-1">Brand ID: {createdBrand.publicId}</p>}
          {createdBrand?.publicId && <Link to={`/brands/${encodeURIComponent(createdBrand.publicId)}`} className="mt-2 inline-block font-medium underline underline-offset-2">View created brand</Link>}
          <div><Link to="/brands" className="mt-2 inline-block font-medium underline underline-offset-2">Return to brands list</Link></div></div>}
        <div className="mt-7 flex flex-col-reverse gap-3 border-t border-slate-100 pt-5 sm:flex-row sm:justify-end">
          <Button type="button" variant="secondary" disabled={isSubmitting} onClick={goBack}>Cancel</Button>
          <Button type="submit" disabled={isSubmitting} loading={isSubmitting}>{isSubmitting ? "Creating brand…" : "Create brand"}</Button>
        </div>
        <p className="mt-3 text-xs text-slate-500">Fields marked with * are required. Brand ID and audit fields are generated by the server.</p>
      </form>
    </Card>
  </main>;
}

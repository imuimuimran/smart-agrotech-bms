// src/pages/brands/BrandEditPage.jsx

import { useCallback, useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import BrandService from "../../services/brandService";
import { Button } from "../../components/ui/Button";
import { Card } from "../../components/ui/Card";
import { LoadingSpinner } from "../../components/ui/LoadingSpinner";

const EMPTY_FORM = {
  brandName: "",
  brandCode: "",
  description: "",
  logo: "",
  website: "",
  country: "",
  status: "active",
};

function getErrorMessage(error) {
  const response = error?.response;
  const data = response?.data;
  const issues = data?.errors ?? data?.error?.issues ?? data?.issues;

  if (Array.isArray(issues) && issues.length) {
    return issues
      .map((issue) => issue?.message || issue?.msg || String(issue))
      .join(" ");
  }

  if (response?.status === 400 || response?.status === 422) {
    return data?.message || "Some fields are invalid. Check the form and try again.";
  }
  if (response?.status === 401) {
    return "Your session has expired. Sign in again and retry.";
  }
  if (response?.status === 403) {
    return "You do not have permission to edit brands. Only ADMIN and MODERATOR roles can update a brand.";
  }
  if (response?.status === 404) {
    return "This brand could not be found. It may have been removed or the ID may be incorrect.";
  }
  if (response?.status === 409) {
    return data?.message || "A brand with this name or code already exists.";
  }
  if (!response) {
    return "Could not reach the server. Check your connection and try again.";
  }
  return data?.message || error?.message || "Brand update failed. Please try again.";
}

function validateForm(form) {
  const errors = {};
  if (form.brandName.trim().length < 2 || form.brandName.trim().length > 100) {
    errors.brandName = "Brand name must be between 2 and 100 characters.";
  }
  if (form.brandCode.trim().length < 2 || form.brandCode.trim().length > 20) {
    errors.brandCode = "Brand code must be between 2 and 20 characters.";
  }
  if (form.description.trim().length > 500) {
    errors.description = "Description cannot exceed 500 characters.";
  }
  if (form.country.trim().length > 100) {
    errors.country = "Country cannot exceed 100 characters.";
  }

  for (const key of ["logo", "website"]) {
    const value = form[key].trim();
    if (!value) continue;
    try {
      const url = new URL(value);
      if (!url.protocol || !url.hostname) throw new Error("Invalid URL");
    } catch {
      errors[key] = `${key === "logo" ? "Logo" : "Website"} must be a valid URL or left blank.`;
    }
  }

  if (!["active", "inactive"].includes(form.status)) {
    errors.status = "Choose a valid status.";
  }
  return errors;
}

function Field({ label, name, value, onChange, error, ...props }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-sm font-medium text-slate-700">{label}</span>
      <input
        name={name}
        value={value}
        onChange={onChange}
        aria-invalid={Boolean(error)}
        aria-describedby={error ? `${name}-error` : undefined}
        className={`w-full rounded-lg border bg-white px-3 py-2.5 text-sm text-slate-900 outline-none transition focus:border-emerald-600 focus:ring-2 focus:ring-emerald-100 ${error ? "border-red-400" : "border-slate-300"}`}
        {...props}
      />
      {error && <span id={`${name}-error`} className="mt-1 block text-sm text-red-600">{error}</span>}
    </label>
  );
}

/**
 * Brand edit form. The backend identifies brands by publicId (for example BRD-100001),
 * and its PATCH schema supports partial updates to the fields shown below.
 */
export default function BrandEditPage({ onBack, onSuccess }) {
  const { publicId } = useParams();
  const navigate = useNavigate();
  const [brand, setBrand] = useState(null);
  const [form, setForm] = useState({ ...EMPTY_FORM });
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [loadError, setLoadError] = useState("");
  const [submitError, setSubmitError] = useState("");
  const [fieldErrors, setFieldErrors] = useState({});
  const [successMessage, setSuccessMessage] = useState("");

  const loadBrand = useCallback(async () => {
    if (!publicId) {
      setLoadError("A brand public ID is required to edit a brand.");
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setLoadError("");
    try {
      const result = await BrandService.getBrand(publicId);
      const record = result?.data ?? result?.brand ?? null;
      if (!record || typeof record !== "object") {
        setBrand(null);
        setLoadError("The server did not return a brand record.");
        return;
      }

      setBrand(record);
      setForm({
        brandName: record.brandName ?? "",
        brandCode: record.brandCode ?? "",
        description: record.description ?? "",
        logo: record.logo ?? "",
        website: record.website ?? "",
        country: record.country ?? "",
        status: record.status ?? "active",
      });
    } catch (error) {
      setLoadError(getErrorMessage(error));
    } finally {
      setIsLoading(false);
    }
  }, [publicId]);

  useEffect(() => {
    let active = true;
    const run = async () => {
      if (!publicId) {
        if (active) {
          setLoadError("A brand public ID is required to edit a brand.");
          setIsLoading(false);
        }
        return;
      }
      setIsLoading(true);
      setLoadError("");
      try {
        const result = await BrandService.getBrand(publicId);
        const record = result?.data ?? result?.brand ?? null;
        if (!active) return;
        if (!record || typeof record !== "object") {
          setBrand(null);
          setLoadError("The server did not return a brand record.");
          return;
        }
        setBrand(record);
        setForm({
          brandName: record.brandName ?? "",
          brandCode: record.brandCode ?? "",
          description: record.description ?? "",
          logo: record.logo ?? "",
          website: record.website ?? "",
          country: record.country ?? "",
          status: record.status ?? "active",
        });
      } catch (error) {
        if (active) setLoadError(getErrorMessage(error));
      } finally {
        if (active) setIsLoading(false);
      }
    };
    run();
    return () => { active = false; };
  }, [publicId]);

  const handleChange = (event) => {
    const { name, value } = event.target;
    setForm((current) => ({ ...current, [name]: value }));
    setFieldErrors((current) => ({ ...current, [name]: undefined }));
    setSubmitError("");
    setSuccessMessage("");
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (isSubmitting || !brand) return;
    setSubmitError("");
    setSuccessMessage("");

    const errors = validateForm(form);
    setFieldErrors(errors);
    if (Object.keys(errors).length) {
      setSubmitError("Please correct the highlighted fields before saving.");
      return;
    }

    // Send all editable fields from the loaded form so unchanged values are preserved.
    // The backend accepts partial PATCH bodies; publicId and audit fields are not editable.
    const payload = {
      brandName: form.brandName.trim().replace(/\s+/g, " "),
      brandCode: form.brandCode.trim().toUpperCase(),
      description: form.description.trim(),
      logo: form.logo.trim(),
      website: form.website.trim(),
      country: form.country.trim(),
      status: form.status,
    };

    setIsSubmitting(true);
    try {
      const result = await BrandService.updateBrand(publicId, payload);
      const updated = result?.data ?? result?.brand ?? null;
      if (updated) {
        setBrand(updated);
        setForm({
          brandName: updated.brandName ?? payload.brandName,
          brandCode: updated.brandCode ?? payload.brandCode,
          description: updated.description ?? payload.description,
          logo: updated.logo ?? payload.logo,
          website: updated.website ?? payload.website,
          country: updated.country ?? payload.country,
          status: updated.status ?? payload.status,
        });
      } else {
        // Some service wrappers return a response envelope without the updated data.
        await loadBrand();
      }
      setSuccessMessage(result?.message || "Brand updated successfully.");
      if (typeof onSuccess === "function") onSuccess(updated ?? brand);
    } catch (error) {
      setSubmitError(getErrorMessage(error));
    } finally {
      setIsSubmitting(false);
    }
  };

  const goBack = () => {
    if (typeof onBack === "function") onBack();
    else navigate(`/brands/${encodeURIComponent(publicId)}`);
  };

  if (isLoading) {
    return (
      <div className="flex min-h-64 items-center justify-center p-8" role="status" aria-live="polite">
        <LoadingSpinner />
        <span className="ml-3 text-sm text-slate-600">Loading brand details…</span>
      </div>
    );
  }

  if (loadError || !brand) {
    return (
      <main className="mx-auto max-w-3xl p-4 sm:p-6">
        <Card>
          <div className="space-y-4 p-5">
            <h1 className="text-xl font-semibold text-slate-900">Unable to load brand</h1>
            <p className="text-sm text-red-700" role="alert">{loadError || "Brand not found."}</p>
            <div className="flex flex-wrap gap-3">
              <Button onClick={loadBrand}>Retry</Button>
              <Button variant="secondary" onClick={() => navigate("/brands")}>Back to brands</Button>
            </div>
          </div>
        </Card>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-4xl space-y-6 p-4 sm:p-6 lg:p-8">
      <header className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-sm text-slate-500">Brands / {brand.publicId}</p>
          <h1 className="mt-1 text-2xl font-bold tracking-tight text-slate-900">Edit brand</h1>
          <p className="mt-1 text-sm text-slate-600">Update the brand profile and save your changes.</p>
        </div>
        <Button variant="secondary" onClick={goBack}>Cancel</Button>
      </header>

      <Card>
        <form onSubmit={handleSubmit} noValidate className="space-y-6 p-5 sm:p-7">
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
            <Field label="Brand name *" name="brandName" value={form.brandName} onChange={handleChange} error={fieldErrors.brandName} required maxLength={100} autoComplete="organization" />
            <Field label="Brand code *" name="brandCode" value={form.brandCode} onChange={handleChange} error={fieldErrors.brandCode} required maxLength={20} />
            <Field label="Country" name="country" value={form.country} onChange={handleChange} error={fieldErrors.country} maxLength={100} autoComplete="country-name" />
            <label className="block">
              <span className="mb-1.5 block text-sm font-medium text-slate-700">Status *</span>
              <select name="status" value={form.status} onChange={handleChange} className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm outline-none focus:border-emerald-600 focus:ring-2 focus:ring-emerald-100">
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
              </select>
              {fieldErrors.status && <span className="mt-1 block text-sm text-red-600">{fieldErrors.status}</span>}
            </label>
            <div className="sm:col-span-2">
              <label className="block">
                <span className="mb-1.5 block text-sm font-medium text-slate-700">Description</span>
                <textarea name="description" value={form.description} onChange={handleChange} maxLength={500} rows={4} aria-invalid={Boolean(fieldErrors.description)} className={`w-full rounded-lg border bg-white px-3 py-2.5 text-sm outline-none focus:border-emerald-600 focus:ring-2 focus:ring-emerald-100 ${fieldErrors.description ? "border-red-400" : "border-slate-300"}`} />
                <span className="mt-1 block text-xs text-slate-500">{form.description.length}/500 characters</span>
                {fieldErrors.description && <span className="mt-1 block text-sm text-red-600">{fieldErrors.description}</span>}
              </label>
            </div>
            <Field label="Logo URL" name="logo" value={form.logo} onChange={handleChange} error={fieldErrors.logo} type="url" placeholder="https://example.com/logo.png" />
            <Field label="Website URL" name="website" value={form.website} onChange={handleChange} error={fieldErrors.website} type="url" placeholder="https://example.com" />
          </div>

          {submitError && <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-800" role="alert">{submitError}</div>}
          {successMessage && (
            <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-800" role="status">
              {successMessage} {brand.publicId ? <Link className="font-semibold underline" to={`/brands/${encodeURIComponent(brand.publicId)}`}>View updated brand</Link> : null}
            </div>
          )}

          <div className="flex flex-col-reverse gap-3 border-t border-slate-100 pt-5 sm:flex-row sm:justify-end">
            <Button type="button" variant="secondary" onClick={goBack} disabled={isSubmitting}>Cancel</Button>
            <Button type="submit" loading={isSubmitting} disabled={isSubmitting}>{isSubmitting ? "Saving changes…" : "Save changes"}</Button>
          </div>
        </form>
      </Card>
    </main>
  );
}

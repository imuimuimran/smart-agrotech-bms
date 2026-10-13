// src/components/ui/LoadingSpinner.jsx

export function LoadingSpinner({ label = "Loading..." }) {
  return (
    <div
      role="status"
      className="flex items-center gap-3 text-sm text-slate-600"
    >
      <span className="h-5 w-5 animate-spin rounded-full border-2 border-slate-300 border-t-emerald-700" />
      <span>{label}</span>
    </div>
  );
}

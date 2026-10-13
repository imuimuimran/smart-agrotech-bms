// src/components/layout/Topbar.jsx

import { useNavigate } from "react-router-dom";
import { useAuth } from "../../hooks/useAuth"; // Preserves your explicit named lint-clean path

export function Topbar({ onMenuClick }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    try {
      await logout();
    } finally {
      navigate("/login", { replace: true });
    }
  };

  return (
    <header className="flex min-h-16 items-center justify-between gap-3 border-b border-slate-200 bg-white px-4 sm:px-6">
      <div className="flex min-w-0 items-center gap-3">
        {/* Hamburger Toggle - triggers the menu callback on mobile and tablet */}
        <button
          type="button"
          aria-label="Open navigation menu"
          aria-controls="app-sidebar"
          onClick={onMenuClick}
          className="rounded-lg p-2 text-slate-600 hover:bg-slate-100 lg:hidden"
        >
          <svg
            xmlns="http://w3.org"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth="2"
            className="h-6 w-6"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M4 6h16M4 12h16M4 18h16"
            />
          </svg>
        </button>

        <h1 className="truncate text-lg font-semibold text-slate-800">
          Dashboard
        </h1>
      </div>

      <div className="flex shrink-0 items-center gap-3 sm:gap-4">
        <div className="hidden text-right sm:block">
          <p className="max-w-40 truncate text-sm font-medium text-slate-800">
            {user?.name || user?.email || "User"}
          </p>
          <p className="text-xs capitalize text-slate-500">
            {user?.role || "Authenticated"}
          </p>
        </div>
        <button
          type="button"
          onClick={handleLogout}
          className="rounded-lg border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-100 sm:px-4"
        >
          Logout
        </button>
      </div>
    </header>
  );
}

// src/components/layout/Sidebar.jsx

import { NavLink } from "react-router-dom";

const navigationItems = [
  {
    label: "Dashboard",
    to: "/",
    end: true
  },
  {
    label: "Brands",
    to: "/brands",
    end: false
  },
  {
    label: "Categories",
    to: "/categories",
    end: false,
  },
  {
    label: "Products",
    to: "/products",
    end: false
  },
];

export function Sidebar({ isOpen, onClose }) {
  return (
    <>
      {/* Mobile structural backdrop overlay */}
      {isOpen && (
        <button
          type="button"
          aria-label="Close navigation menu"
          onClick={onClose}
          className="fixed inset-0 z-40 bg-slate-950/40 lg:hidden"
        />
      )}

      {/* Adaptive responsive layout drawer container */}
      <aside
        id="app-sidebar"
        className={`fixed inset-y-0 left-0 z-50 flex w-64 flex-col border-r border-slate-200 bg-white transition-transform duration-200 lg:static lg:z-auto lg:translate-x-0 ${isOpen ? "translate-x-0" : "-translate-x-full"
          }`}
      >
        <div className="flex min-h-16 items-center justify-between border-b border-slate-200 px-6 py-5">
          <div>
            <h2 className="text-lg font-bold text-emerald-800">
              Smart AgroTech
            </h2>
            <p className="mt-1 text-xs text-slate-500">
              Business Management System
            </p>
          </div>
          <button
            type="button"
            aria-label="Close navigation menu"
            onClick={onClose}
            className="rounded-lg p-2 text-slate-500 hover:bg-slate-100 lg:hidden"
          >
            ✕
          </button>
        </div>

        <nav className="flex-1 space-y-1 overflow-y-auto p-4">
          {navigationItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              onClick={onClose}
              className={({ isActive }) =>
                `block rounded-lg px-4 py-3 text-sm font-medium transition ${isActive
                  ? "bg-emerald-50 text-emerald-800"
                  : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
                }`
              }
            >
              {item.label}
            </NavLink>
          ))}
        </nav>

        <div className="border-t border-slate-200 p-4 text-xs text-slate-500">
          Smart AgroTech BMS
        </div>
      </aside>
    </>
  );
}

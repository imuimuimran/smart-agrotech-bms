// src/layouts/AppLayout.jsx
import { Outlet } from "react-router-dom";
import { Sidebar } from "../components/layout/Sidebar.jsx"; 
import { Topbar } from "../components/layout/Topbar.jsx"; 

export function AppLayout() {
  return (
    <div className="flex min-h-screen bg-slate-50">
      <Sidebar />
      <div className="flex min-w-0 flex-1 flex-col">
        <Topbar />
        <main className="flex-1 p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
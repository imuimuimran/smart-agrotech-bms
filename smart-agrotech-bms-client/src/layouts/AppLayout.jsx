// smart-agrotech-bms-client/src/layouts/AppLayout.jsx

import { useState } from "react";
import { Outlet } from "react-router-dom";
import { Sidebar } from "../components/layout/Sidebar.jsx"; 
import { Topbar } from "../components/layout/Topbar.jsx"; 

export function AppLayout() {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const closeSidebar = () => setIsSidebarOpen(false);

  return (
    <div className="flex min-h-screen bg-slate-50 overflow-x-hidden relative">
      <Sidebar
        isOpen={isSidebarOpen}
        onClose={closeSidebar}
      />
      <div className="flex min-w-0 flex-1 flex-col">
        <Topbar onMenuClick={() => setIsSidebarOpen(true)} />
        <main className="flex-1 p-4 sm:p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
}

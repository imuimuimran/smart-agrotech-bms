// // smart-agrotech-bms-client/src/layouts/AppLayout.jsx
// import { Outlet } from "react-router-dom";
// import { Sidebar } from "../components/layout/Sidebar.jsx"; 
// import { Topbar } from "../components/layout/Topbar.jsx"; 

// export function AppLayout() {
//   return (
//     <div className="flex min-h-screen w-full bg-slate-50 overflow-x-hidden">
//       {/* Sidebar gets structural width management */}
//       <div className="hidden md:block w-64 shrink-0 border-r border-slate-200 bg-white">
//         <Sidebar />
//       </div>

//       {/* Main panel expands flexibly without collapsing layout containers */}
//       <div className="flex min-w-0 flex-1 flex-col">
//         <Topbar />
//         <main className="w-full flex-1 p-4 sm:p-6 md:p-8">
//           <Outlet />
//         </main>
//       </div>
//     </div>
//   );
// }



import { useState } from "react";
import { Outlet } from "react-router-dom";
import { Sidebar } from "../components/layout/Sidebar.jsx"; 
import { Topbar } from "../components/layout/Topbar.jsx"; 

export function AppLayout() {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const toggleMobileMenu = () => setIsMobileMenuOpen((prev) => !prev);
  const closeMobileMenu = () => setIsMobileMenuOpen(false);

  return (
    <div className="flex min-h-screen w-full bg-slate-50 overflow-x-hidden relative">
      
      {/* 1. DESKTOP SIDEBAR VIEW: Safe, structural width lock wrapper */}
      <aside className="hidden md:block w-64 shrink-0 border-r border-slate-200 bg-white">
        <Sidebar />
      </aside>

      {/* 2. MOBILE MODAL DRAWER OVERLAY: Visible only on menu toggle event triggers */}
      {isMobileMenuOpen && (
        <div className="fixed inset-0 z-50 flex md:hidden">
          {/* Backdrop screen dims content area behind mobile window drawer */}
          <div 
            className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs transition-opacity" 
            onClick={closeMobileMenu}
          />
          
          {/* Slide-out navigation wrapper panel container */}
          <div className="relative flex w-64 max-w-xs flex-1 flex-col border-r border-slate-200 bg-white shadow-xl animate-in slide-in-from-left duration-200">
            <div className="absolute top-4 right-4 z-10">
              <button
                type="button"
                onClick={closeMobileMenu}
                className="rounded-lg p-2 text-slate-500 hover:bg-slate-100"
              >
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            {/* Inject mobile click trigger context closures so clicking menu closing active views */}
            <Sidebar onItemClick={closeMobileMenu} />
          </div>
        </div>
      )}

      {/* 3. WORKING WORKSPACE FRAMEWORK CONTAINER */}
      <div className="flex min-w-0 flex-1 flex-col">
        <Topbar onMenuToggle={toggleMobileMenu} />
        <main className="w-full flex-1 p-4 sm:p-6 md:p-8">
          <Outlet />
        </main>
      </div>
    </div>
  );
}

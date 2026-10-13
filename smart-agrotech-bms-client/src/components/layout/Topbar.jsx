// // src/components/layout/Topbar.jsx
// import { useNavigate } from "react-router-dom";
// // import { useAuth } from "../../contexts/AuthContext.jsx";
// import { useAuth } from "../../hooks/useAuth";

// export function Topbar() {
//   const { user, logout } = useAuth();
//   const navigate = useNavigate();

//   const handleLogout = async () => {
//     try {
//       await logout();
//     } finally {
//       navigate("/login", { replace: true });
//     }
//   };

//   return (
//     <header className="flex min-h-16 items-center justify-between border-b border-slate-200 bg-white px-6">
//       <h1 className="text-lg font-semibold text-slate-800">
//         Dashboard
//       </h1>
//       <div className="flex items-center gap-4">
//         <div className="hidden text-right sm:block">
//           <p className="text-sm font-medium text-slate-800">
//             {user?.name || user?.email || "User"}
//           </p>
//           <p className="text-xs capitalize text-slate-500">
//             {user?.role || "Authenticated"}
//           </p>
//         </div>
//         <button
//           type="button"
//           onClick={handleLogout}
//           className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-100"
//         >
//           Logout
//         </button>
//       </div>
//     </header>
//   );
// }



import { useNavigate } from "react-router-dom";
import { useAuth } from "../../hooks/useAuth";

export function Topbar({ onMenuToggle }) {
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
    <header className="flex min-h-16 items-center justify-between border-b border-slate-200 bg-white px-4 sm:px-6">
      <div className="flex items-center gap-3">
        {/* Hamburger Toggle - visible only on mobile/tablet */}
        <button
          type="button"
          onClick={onMenuToggle}
          className="rounded-lg p-2 text-slate-600 hover:bg-slate-100 focus:outline-none md:hidden"
          aria-label="Toggle navigation drawer menu"
        >
          <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
          </svg>
        </button>
        
        <h1 className="text-lg font-semibold text-slate-800">
          Dashboard
        </h1>
      </div>

      <div className="flex items-center gap-4">
        <div className="hidden text-right sm:block">
          <p className="text-sm font-medium text-slate-800">
            {user?.name || user?.email || "User"}
          </p>
          <p className="text-xs capitalize text-slate-500">
            {user?.role || "Authenticated"}
          </p>
        </div>
        <button
          type="button"
          onClick={handleLogout}
          className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-100"
        >
          Logout
        </button>
      </div>
    </header>
  );
}

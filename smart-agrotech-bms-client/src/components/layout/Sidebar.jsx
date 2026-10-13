// // src/components/layout/Sidebar.jsx
// import { NavLink } from "react-router-dom";

// const navigationItems = [
//   { label: "Dashboard", to: "/", end: true },
// ];

// export function Sidebar() {
//   return (
//     <aside className="flex w-64 shrink-0 flex-col border-r border-slate-200 bg-white">
//       <div className="border-b border-slate-200 px-6 py-5">
//         <h2 className="text-lg font-bold text-emerald-800">
//           Smart AgroTech
//         </h2>
//         <p className="mt-1 text-xs text-slate-500">
//           Business Management System
//         </p>
//       </div>
//       <nav className="flex-1 space-y-1 p-4">
//         {navigationItems.map((item) => (
//           <NavLink
//             key={item.to}
//             to={item.to}
//             end={item.end}
//             className={({ isActive }) =>
//               `block rounded-lg px-4 py-3 text-sm font-medium transition ${
//                 isActive
//                   ? "bg-emerald-50 text-emerald-800"
//                   : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
//               }`
//             }
//           >
//             {item.label}
//           </NavLink>
//         ))}
//       </nav>
//       <div className="border-t border-slate-200 p-4 text-xs text-slate-500">
//         Smart AgroTech BMS
//       </div>
//     </aside>
//   );
// }


import { NavLink } from "react-router-dom";

const navigationItems = [
  { label: "Dashboard", to: "/", end: true },
];

export function Sidebar({ onItemClick }) {
  return (
    <div className="flex h-full w-full flex-col bg-white">
      <div className="border-b border-slate-200 px-6 py-5">
        <h2 className="text-lg font-bold text-emerald-800">
          Smart AgroTech
        </h2>
        <p className="mt-1 text-xs text-slate-500">
          Business Management System
        </p>
      </div>
      
      <nav className="flex-1 space-y-1 p-4">
        {navigationItems.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.end}
            onClick={onItemClick}
            className={({ isActive }) =>
              `block rounded-lg px-4 py-3 text-sm font-medium transition ${
                isActive
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
    </div>
  );
}

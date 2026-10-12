// src/App.jsx
import { Navigate, Route, Routes } from "react-router-dom";
import { LoginPage } from "./pages/auth/LoginPage.jsx"; 
import { ProtectedRoute } from "./routes/ProtectedRoute.jsx"; 
import { AppLayout } from "./layouts/AppLayout.jsx"

// function HomePlaceholder() {
//   return (
//     <main className="p-8">
//       <h1 className="text-2xl font-bold text-slate-900">
//         Dashboard placeholder
//       </h1>
//       <p className="mt-2 text-slate-600">
//         Authentication is working. The dashboard will be implemented next.
//       </p>
//     </main>
//   );
// }

function DashboardPage() {
  return (
    <section>
      <h2 className="text-2xl font-bold text-slate-900">
        Welcome to Smart AgroTech BMS
      </h2>
      <p className="mt-2 text-slate-600">
        Your business management workspace is ready.
      </p>
      <div className="mt-6 rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <p className="font-medium text-slate-800">
          Dashboard
        </p>
        <p className="mt-2 text-sm text-slate-500">
          Business metrics and module summaries will appear here in a later step.
        </p>
      </div>
    </section>
  );
}

function ForbiddenPage() {
  return (
    <main className="p-8">
      <h1 className="text-2xl font-bold text-red-700">Access denied</h1>
      <p className="mt-2 text-slate-600">
        You do not have permission to access this page.
      </p>
    </main>
  );
}

export function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/forbidden" element={<ForbiddenPage />} />
      <Route
        element={
          <ProtectedRoute>
            <AppLayout />
          </ProtectedRoute>
        }
      >
        <Route index element={<DashboardPage />} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
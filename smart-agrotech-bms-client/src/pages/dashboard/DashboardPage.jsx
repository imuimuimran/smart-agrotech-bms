// smart-agrotech-bms-client/src/pages/dashboard/DashboardPage.jsx
const dashboardSections = [
  { 
    title: "Sales", 
    description: "Access sales operations and transaction records." 
  },
  { 
    title: "Purchases", 
    description: "Access purchase operations and supplier transactions." 
  },
  { 
    title: "Inventory", 
    description: "Review inventory operations and stock movements." 
  },
  { 
    title: "Customers & Suppliers", 
    description: "Access customer and supplier management." 
  },
  { 
    title: "Reports", 
    description: "Access business reports and financial summaries." 
  },
  { 
    title: "Activity Logs", 
    description: "Review recorded system activities." 
  }
];

export function DashboardPage() {
  return (
    <div className="mx-auto w-full max-w-7xl space-y-8">
      <section>
        <p className="text-sm font-medium text-emerald-700">Smart AgroTech BMS</p>
        <h2 className="mt-2 text-3xl font-bold tracking-tight text-slate-900">Dashboard</h2>
        <p className="mt-2 text-slate-600">Your business operations, organized in one workspace.</p>
      </section>

      <section>
        <h3 className="mb-4 text-lg font-semibold text-slate-900">Business modules</h3>
        
        {/* Core Fix: Explicit responsive breakpoints for columns */}
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 w-full">
          {dashboardSections.map((section) => (
            <article
              key={section.title}
              className="flex flex-col justify-between rounded-xl border border-slate-200 bg-white p-6 shadow-sm transition hover:border-emerald-300 hover:shadow-md"
            >
              <div>
                <h4 className="font-semibold text-slate-900">{section.title}</h4>
                <p className="mt-2 text-sm leading-6 text-slate-600">{section.description}</p>
              </div>
              <span className="mt-4 inline-block text-xs font-medium text-slate-400">
                Module navigation will be connected in later steps
              </span>
            </article>
          ))}
        </div>
      </section>

      <section className="rounded-xl border border-dashed border-slate-300 bg-white p-6 w-full">
        <h3 className="font-semibold text-slate-900">Business summary</h3>
        <p className="mt-2 text-sm leading-6 text-slate-600">
          Sales totals, purchase totals, current stock, outstanding dues, and financial summaries 
          will be connected to verified backend reporting APIs in a later integration step.
        </p>
      </section>
    </div>
  );
}

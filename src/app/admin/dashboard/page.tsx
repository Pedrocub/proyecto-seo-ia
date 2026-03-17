"use client";

const STATS = [
  { label: "Leads Totales", value: "0", change: null, icon: "👥" },
  { label: "Auditorías Generadas", value: "0", change: null, icon: "📋" },
  { label: "Emails Enviados", value: "0", change: null, icon: "📧" },
  { label: "Tasa de Apertura", value: "0%", change: null, icon: "📬" },
  { label: "Clicks en CTA", value: "0", change: null, icon: "🖱️" },
  { label: "Conversiones", value: "0", change: null, icon: "🎯" },
];

export default function DashboardPage() {
  return (
    <div>
      {/* Header */}
      <div className="mb-8">
        <h1 className="font-[family-name:var(--font-poppins)] text-2xl font-bold text-navy-900">
          Dashboard
        </h1>
        <p className="text-navy-500 text-sm mt-1">
          Resumen general de tu plataforma de prospección
        </p>
      </div>

      {/* Stats grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
        {STATS.map((stat) => (
          <div
            key={stat.label}
            className="bg-white rounded-xl border border-warm-200 shadow-sm p-5"
          >
            <div className="flex items-center justify-between mb-3">
              <span className="text-2xl">{stat.icon}</span>
            </div>
            <p className="text-navy-900 text-2xl font-bold font-[family-name:var(--font-poppins)]">
              {stat.value}
            </p>
            <p className="text-navy-500 text-sm mt-1">{stat.label}</p>
          </div>
        ))}
      </div>

      {/* Recent activity */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-xl border border-warm-200 shadow-sm p-6">
          <h2 className="font-[family-name:var(--font-poppins)] text-lg font-semibold text-navy-900 mb-4">
            Leads Recientes
          </h2>
          <div className="flex items-center justify-center h-40 text-navy-400 text-sm">
            No hay leads aún. Inicia una campaña para empezar.
          </div>
        </div>

        <div className="bg-white rounded-xl border border-warm-200 shadow-sm p-6">
          <h2 className="font-[family-name:var(--font-poppins)] text-lg font-semibold text-navy-900 mb-4">
            Campañas Activas
          </h2>
          <div className="flex items-center justify-center h-40 text-navy-400 text-sm">
            No hay campañas activas. Crea una nueva campaña.
          </div>
        </div>
      </div>
    </div>
  );
}

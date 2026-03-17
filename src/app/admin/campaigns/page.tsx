"use client";

import { useState } from "react";

const STATUS_LABELS: Record<string, { label: string; color: string }> = {
  draft: { label: "Borrador", color: "bg-warm-200 text-navy-700" },
  scraping: { label: "Scraping", color: "bg-blue-100 text-blue-700" },
  analyzing: { label: "Analizando", color: "bg-yellow-100 text-yellow-700" },
  emailing: { label: "Enviando", color: "bg-purple-100 text-purple-700" },
  completed: { label: "Completada", color: "bg-green-100 text-green-700" },
};

const DEMO_CAMPAIGNS = [
  {
    id: "1",
    name: "Medicina Estética - Madrid",
    city: "Madrid",
    category: "medicina-estetica",
    searchQuery: "clínica medicina estética Madrid",
    status: "draft",
    leadsFound: 0,
    leadsAnalyzed: 0,
    emailsSent: 0,
    emailsOpened: 0,
    ctaClicks: 0,
    createdAt: "17 Mar 2026",
  },
];

export default function CampaignsPage() {
  const [showNewModal, setShowNewModal] = useState(false);

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="font-[family-name:var(--font-poppins)] text-2xl font-bold text-navy-900">
            Campañas
          </h1>
          <p className="text-navy-500 text-sm mt-1">
            Gestiona campañas de prospección automatizada
          </p>
        </div>
        <button
          onClick={() => setShowNewModal(true)}
          className="bg-teal-600 hover:bg-teal-500 text-white font-medium px-4 py-2 rounded-lg transition-colors text-sm"
        >
          + Nueva Campaña
        </button>
      </div>

      {/* Campaigns list */}
      <div className="space-y-4">
        {DEMO_CAMPAIGNS.map((campaign) => {
          const statusInfo = STATUS_LABELS[campaign.status] || STATUS_LABELS.draft;
          return (
            <div
              key={campaign.id}
              className="bg-white rounded-xl border border-warm-200 shadow-sm p-6"
            >
              <div className="flex items-start justify-between mb-4">
                <div>
                  <div className="flex items-center gap-3 mb-1">
                    <h3 className="font-[family-name:var(--font-poppins)] text-lg font-semibold text-navy-900">
                      {campaign.name}
                    </h3>
                    <span className={`${statusInfo.color} text-xs font-medium px-2.5 py-1 rounded-full`}>
                      {statusInfo.label}
                    </span>
                  </div>
                  <p className="text-navy-500 text-sm">
                    {campaign.city} · {campaign.searchQuery}
                  </p>
                </div>
                <span className="text-navy-400 text-xs">{campaign.createdAt}</span>
              </div>

              {/* Pipeline stats */}
              <div className="grid grid-cols-5 gap-4 mb-4">
                <PipelineStat label="Leads" value={campaign.leadsFound} icon="👥" />
                <PipelineStat label="Analizados" value={campaign.leadsAnalyzed} icon="📋" />
                <PipelineStat label="Enviados" value={campaign.emailsSent} icon="📧" />
                <PipelineStat label="Abiertos" value={campaign.emailsOpened} icon="📬" />
                <PipelineStat label="Clicks" value={campaign.ctaClicks} icon="🖱️" />
              </div>

              {/* Pipeline progress */}
              <div className="flex items-center gap-1 mb-4">
                {["Scraping", "Análisis", "Email", "Tracking"].map((step, i) => (
                  <div key={step} className="flex-1">
                    <div className={`h-2 rounded-full ${i === 0 ? "bg-warm-200" : "bg-warm-100"}`} />
                    <p className="text-navy-400 text-xs mt-1 text-center">{step}</p>
                  </div>
                ))}
              </div>

              {/* Actions */}
              <div className="flex gap-2">
                <button className="bg-teal-600 hover:bg-teal-500 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors">
                  Iniciar Scraping
                </button>
                <button className="bg-warm-100 hover:bg-warm-200 text-navy-700 text-sm font-medium px-4 py-2 rounded-lg transition-colors">
                  Editar
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* New Campaign Modal */}
      {showNewModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl max-w-lg w-full p-6">
            <h2 className="font-[family-name:var(--font-poppins)] text-xl font-bold text-navy-900 mb-6">
              Nueva Campaña
            </h2>
            <form className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-navy-700 mb-1">Nombre de la campaña</label>
                <input type="text" placeholder="Ej: Medicina Estética - Barcelona" className="w-full border border-warm-200 rounded-lg px-4 py-2 text-sm text-navy-900 focus:outline-none focus:ring-2 focus:ring-teal-500" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-navy-700 mb-1">Ciudad</label>
                  <input type="text" placeholder="Madrid" className="w-full border border-warm-200 rounded-lg px-4 py-2 text-sm text-navy-900 focus:outline-none focus:ring-2 focus:ring-teal-500" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-navy-700 mb-1">Categoría</label>
                  <select className="w-full border border-warm-200 rounded-lg px-4 py-2 text-sm text-navy-900 focus:outline-none focus:ring-2 focus:ring-teal-500">
                    <option value="medicina-estetica">Medicina Estética</option>
                    <option value="cirugia-plastica">Cirugía Plástica</option>
                    <option value="dermatologia">Dermatología</option>
                    <option value="odontologia">Odontología</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-navy-700 mb-1">Búsqueda en Google Maps</label>
                <input type="text" placeholder="clínica medicina estética Madrid" className="w-full border border-warm-200 rounded-lg px-4 py-2 text-sm text-navy-900 focus:outline-none focus:ring-2 focus:ring-teal-500" />
              </div>
              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  className="flex-1 bg-teal-600 hover:bg-teal-500 text-white font-medium py-2.5 rounded-lg transition-colors text-sm"
                >
                  Crear Campaña
                </button>
                <button
                  type="button"
                  onClick={() => setShowNewModal(false)}
                  className="flex-1 bg-warm-100 hover:bg-warm-200 text-navy-700 font-medium py-2.5 rounded-lg transition-colors text-sm"
                >
                  Cancelar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

function PipelineStat({ label, value, icon }: { label: string; value: number; icon: string }) {
  return (
    <div className="text-center">
      <span className="text-lg">{icon}</span>
      <p className="text-navy-900 font-bold text-lg">{value}</p>
      <p className="text-navy-400 text-xs">{label}</p>
    </div>
  );
}

"use client";

import { useState } from "react";

const STATUS_LABELS: Record<string, { label: string; color: string }> = {
  new: { label: "Nuevo", color: "bg-blue-100 text-blue-700" },
  analyzed: { label: "Analizado", color: "bg-yellow-100 text-yellow-700" },
  emailed: { label: "Email Enviado", color: "bg-purple-100 text-purple-700" },
  opened: { label: "Email Abierto", color: "bg-teal-100 text-teal-700" },
  clicked: { label: "Click en CTA", color: "bg-green-100 text-green-700" },
  converted: { label: "Convertido", color: "bg-emerald-100 text-emerald-700" },
};

// Demo data
const DEMO_LEADS = [
  {
    id: "1",
    businessName: "Clínica Estética Bella",
    contactName: "Dra. María García",
    email: "info@clinicabella.com",
    phone: "+34 612 345 678",
    website: "https://clinicaesteticabella.com",
    city: "Madrid",
    rating: 4.2,
    reviewCount: 87,
    status: "analyzed",
  },
  {
    id: "2",
    businessName: "Centro Médico Estético Luminous",
    contactName: "Dr. Carlos Ruiz",
    email: "contacto@luminous.es",
    phone: "+34 623 456 789",
    website: "https://luminousestetica.es",
    city: "Madrid",
    rating: 4.5,
    reviewCount: 124,
    status: "new",
  },
  {
    id: "3",
    businessName: "Clínica Dermoestética Vital",
    contactName: "Dra. Ana López",
    email: "info@vital-estetica.com",
    phone: "+34 634 567 890",
    website: "https://vital-estetica.com",
    city: "Madrid",
    rating: 3.9,
    reviewCount: 56,
    status: "emailed",
  },
];

export default function LeadsPage() {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  const filteredLeads = DEMO_LEADS.filter((lead) => {
    const matchesSearch =
      lead.businessName.toLowerCase().includes(search.toLowerCase()) ||
      (lead.contactName?.toLowerCase().includes(search.toLowerCase()));
    const matchesStatus = statusFilter === "all" || lead.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="font-[family-name:var(--font-poppins)] text-2xl font-bold text-navy-900">
            Leads
          </h1>
          <p className="text-navy-500 text-sm mt-1">
            Gestiona los leads capturados desde Google Maps
          </p>
        </div>
        <button className="bg-teal-600 hover:bg-teal-500 text-white font-medium px-4 py-2 rounded-lg transition-colors text-sm">
          + Nueva Búsqueda
        </button>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3 mb-6">
        <input
          type="text"
          placeholder="Buscar por nombre..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="flex-1 bg-white border border-warm-200 rounded-lg px-4 py-2 text-sm text-navy-900 placeholder:text-navy-400 focus:outline-none focus:ring-2 focus:ring-teal-500"
        />
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="bg-white border border-warm-200 rounded-lg px-4 py-2 text-sm text-navy-900 focus:outline-none focus:ring-2 focus:ring-teal-500"
        >
          <option value="all">Todos los estados</option>
          {Object.entries(STATUS_LABELS).map(([key, val]) => (
            <option key={key} value={key}>{val.label}</option>
          ))}
        </select>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-warm-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-warm-50 border-b border-warm-200">
                <th className="text-left px-5 py-3 text-navy-600 text-xs font-semibold uppercase tracking-wide">Negocio</th>
                <th className="text-left px-5 py-3 text-navy-600 text-xs font-semibold uppercase tracking-wide">Contacto</th>
                <th className="text-left px-5 py-3 text-navy-600 text-xs font-semibold uppercase tracking-wide">Ciudad</th>
                <th className="text-center px-5 py-3 text-navy-600 text-xs font-semibold uppercase tracking-wide">Rating</th>
                <th className="text-center px-5 py-3 text-navy-600 text-xs font-semibold uppercase tracking-wide">Estado</th>
                <th className="text-right px-5 py-3 text-navy-600 text-xs font-semibold uppercase tracking-wide">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {filteredLeads.map((lead) => {
                const statusInfo = STATUS_LABELS[lead.status] || STATUS_LABELS.new;
                return (
                  <tr key={lead.id} className="border-b border-warm-100 hover:bg-warm-50/50 transition-colors">
                    <td className="px-5 py-4">
                      <p className="text-navy-900 font-medium text-sm">{lead.businessName}</p>
                      <p className="text-navy-400 text-xs truncate max-w-[200px]">{lead.website}</p>
                    </td>
                    <td className="px-5 py-4">
                      <p className="text-navy-800 text-sm">{lead.contactName || "—"}</p>
                      <p className="text-navy-400 text-xs">{lead.email || "—"}</p>
                    </td>
                    <td className="px-5 py-4 text-navy-600 text-sm">{lead.city}</td>
                    <td className="px-5 py-4 text-center">
                      <span className="text-navy-800 text-sm font-medium">
                        ⭐ {lead.rating} ({lead.reviewCount})
                      </span>
                    </td>
                    <td className="px-5 py-4 text-center">
                      <span className={`${statusInfo.color} text-xs font-medium px-2.5 py-1 rounded-full`}>
                        {statusInfo.label}
                      </span>
                    </td>
                    <td className="px-5 py-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button className="text-teal-600 hover:text-teal-500 text-xs font-medium">
                          Analizar
                        </button>
                        <button className="text-navy-400 hover:text-navy-600 text-xs font-medium">
                          Ver
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

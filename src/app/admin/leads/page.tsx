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

interface Lead {
  id: string;
  businessName: string;
  contactName?: string;
  email?: string;
  phone?: string;
  website?: string;
  city: string;
  rating?: number;
  reviewCount?: number;
  status: string;
  analysis?: {
    overallGrade: string;
    overallScore: number;
    totalIssues: number;
  };
}

export default function LeadsPage() {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [leads, setLeads] = useState<Lead[]>([]);
  const [showScrapeModal, setShowScrapeModal] = useState(false);
  const [scrapeQuery, setScrapeQuery] = useState("medicina estética");
  const [scrapeCity, setScrapeCity] = useState("");
  const [scraping, setScraping] = useState(false);
  const [analyzing, setAnalyzing] = useState<string | null>(null);

  const filteredLeads = leads.filter((lead) => {
    const matchesSearch =
      lead.businessName.toLowerCase().includes(search.toLowerCase()) ||
      (lead.contactName?.toLowerCase().includes(search.toLowerCase()));
    const matchesStatus = statusFilter === "all" || lead.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  async function handleScrape() {
    if (!scrapeCity.trim()) return;
    setScraping(true);
    try {
      const res = await fetch("/api/scrape", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          query: scrapeQuery,
          city: scrapeCity,
          category: "medicina-estetica",
        }),
      });
      const data = await res.json();
      if (data.success) {
        const newLeads: Lead[] = data.results.map((r: Record<string, unknown>, i: number) => ({
          id: `lead-${Date.now()}-${i}`,
          businessName: r.businessName as string,
          contactName: undefined,
          email: undefined,
          phone: r.phone as string | undefined,
          website: r.website as string | undefined,
          city: scrapeCity,
          rating: r.rating as number | undefined,
          reviewCount: r.reviewCount as number | undefined,
          status: "new",
        }));
        setLeads((prev) => [...prev, ...newLeads]);
        setShowScrapeModal(false);
        setScrapeCity("");
      }
    } catch (err) {
      console.error("Scrape error:", err);
    }
    setScraping(false);
  }

  async function handleAnalyze(lead: Lead) {
    if (!lead.website) return;
    setAnalyzing(lead.id);
    try {
      const res = await fetch("/api/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: lead.website }),
      });
      const data = await res.json();
      if (data.success) {
        setLeads((prev) =>
          prev.map((l) =>
            l.id === lead.id
              ? {
                  ...l,
                  status: "analyzed",
                  analysis: {
                    overallGrade: data.overallGrade,
                    overallScore: data.overallScore,
                    totalIssues: data.totalIssues,
                  },
                }
              : l
          )
        );
      }
    } catch (err) {
      console.error("Analyze error:", err);
    }
    setAnalyzing(null);
  }

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
        <button
          onClick={() => setShowScrapeModal(true)}
          className="bg-teal-600 hover:bg-teal-500 text-white font-medium px-4 py-2 rounded-lg transition-colors text-sm"
        >
          + Buscar en Google Maps
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

      {/* Stats bar */}
      {leads.length > 0 && (
        <div className="flex gap-3 mb-4">
          <span className="bg-warm-100 text-navy-700 text-xs font-medium px-3 py-1.5 rounded-full">
            {leads.length} leads totales
          </span>
          <span className="bg-blue-50 text-blue-700 text-xs font-medium px-3 py-1.5 rounded-full">
            {leads.filter(l => l.status === "new").length} nuevos
          </span>
          <span className="bg-yellow-50 text-yellow-700 text-xs font-medium px-3 py-1.5 rounded-full">
            {leads.filter(l => l.status === "analyzed").length} analizados
          </span>
        </div>
      )}

      {/* Table */}
      {leads.length === 0 ? (
        <div className="bg-white rounded-xl border-2 border-dashed border-warm-300 flex items-center justify-center py-16">
          <div className="text-center">
            <p className="text-3xl mb-3">🔍</p>
            <p className="text-navy-600 font-medium mb-2">No hay leads aún</p>
            <p className="text-navy-400 text-sm mb-4">
              Busca negocios en Google Maps para empezar tu prospección
            </p>
            <button
              onClick={() => setShowScrapeModal(true)}
              className="bg-teal-600 hover:bg-teal-500 text-white font-medium px-4 py-2 rounded-lg transition-colors text-sm"
            >
              Buscar en Google Maps
            </button>
          </div>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-warm-200 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-warm-50 border-b border-warm-200">
                  <th className="text-left px-5 py-3 text-navy-600 text-xs font-semibold uppercase tracking-wide">Negocio</th>
                  <th className="text-left px-5 py-3 text-navy-600 text-xs font-semibold uppercase tracking-wide">Web</th>
                  <th className="text-left px-5 py-3 text-navy-600 text-xs font-semibold uppercase tracking-wide">Ciudad</th>
                  <th className="text-center px-5 py-3 text-navy-600 text-xs font-semibold uppercase tracking-wide">Rating</th>
                  <th className="text-center px-5 py-3 text-navy-600 text-xs font-semibold uppercase tracking-wide">Nota</th>
                  <th className="text-center px-5 py-3 text-navy-600 text-xs font-semibold uppercase tracking-wide">Estado</th>
                  <th className="text-right px-5 py-3 text-navy-600 text-xs font-semibold uppercase tracking-wide">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {filteredLeads.map((lead) => {
                  const statusInfo = STATUS_LABELS[lead.status] || STATUS_LABELS.new;
                  const gradeColors: Record<string, string> = {
                    A: "bg-green-500", B: "bg-teal-500", C: "bg-yellow-500", D: "bg-orange-500", F: "bg-red-500",
                  };
                  return (
                    <tr key={lead.id} className="border-b border-warm-100 hover:bg-warm-50/50 transition-colors">
                      <td className="px-5 py-4">
                        <p className="text-navy-900 font-medium text-sm">{lead.businessName}</p>
                        <p className="text-navy-400 text-xs">{lead.phone || "—"}</p>
                      </td>
                      <td className="px-5 py-4">
                        <p className="text-navy-600 text-xs truncate max-w-[180px]">
                          {lead.website ? new URL(lead.website).hostname : "—"}
                        </p>
                      </td>
                      <td className="px-5 py-4 text-navy-600 text-sm">{lead.city}</td>
                      <td className="px-5 py-4 text-center">
                        <span className="text-navy-800 text-sm font-medium">
                          {lead.rating ? `⭐ ${lead.rating}` : "—"}
                          {lead.reviewCount ? ` (${lead.reviewCount})` : ""}
                        </span>
                      </td>
                      <td className="px-5 py-4 text-center">
                        {lead.analysis ? (
                          <span className={`${gradeColors[lead.analysis.overallGrade] || "bg-gray-500"} text-white text-xs font-bold w-8 h-8 rounded-lg inline-flex items-center justify-center`}>
                            {lead.analysis.overallGrade}
                          </span>
                        ) : (
                          <span className="text-navy-300 text-xs">—</span>
                        )}
                      </td>
                      <td className="px-5 py-4 text-center">
                        <span className={`${statusInfo.color} text-xs font-medium px-2.5 py-1 rounded-full`}>
                          {statusInfo.label}
                        </span>
                      </td>
                      <td className="px-5 py-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          {lead.status === "new" && lead.website && (
                            <button
                              onClick={() => handleAnalyze(lead)}
                              disabled={analyzing === lead.id}
                              className="text-teal-600 hover:text-teal-500 text-xs font-medium disabled:opacity-50"
                            >
                              {analyzing === lead.id ? "Analizando..." : "Analizar"}
                            </button>
                          )}
                          {lead.analysis && (
                            <a
                              href={`/audit/${lead.businessName.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`}
                              target="_blank"
                              className="text-teal-600 hover:text-teal-500 text-xs font-medium"
                            >
                              Ver reporte
                            </a>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Scrape Modal */}
      {showScrapeModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl max-w-lg w-full p-6">
            <h2 className="font-[family-name:var(--font-poppins)] text-xl font-bold text-navy-900 mb-2">
              Buscar en Google Maps
            </h2>
            <p className="text-navy-500 text-sm mb-6">
              Encuentra negocios de medicina estética por ciudad
            </p>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-navy-700 mb-1">Tipo de negocio</label>
                <input
                  type="text"
                  value={scrapeQuery}
                  onChange={(e) => setScrapeQuery(e.target.value)}
                  placeholder="medicina estética"
                  className="w-full border border-warm-200 rounded-lg px-4 py-2 text-sm text-navy-900 focus:outline-none focus:ring-2 focus:ring-teal-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-navy-700 mb-1">Ciudad</label>
                <input
                  type="text"
                  value={scrapeCity}
                  onChange={(e) => setScrapeCity(e.target.value)}
                  placeholder="Madrid, Barcelona, Valencia..."
                  className="w-full border border-warm-200 rounded-lg px-4 py-2 text-sm text-navy-900 focus:outline-none focus:ring-2 focus:ring-teal-500"
                  autoFocus
                />
              </div>
              <div className="flex gap-3 pt-2">
                <button
                  onClick={handleScrape}
                  disabled={scraping || !scrapeCity.trim()}
                  className="flex-1 bg-teal-600 hover:bg-teal-500 text-white font-medium py-2.5 rounded-lg transition-colors text-sm disabled:opacity-50"
                >
                  {scraping ? "Buscando..." : "Buscar Negocios"}
                </button>
                <button
                  onClick={() => setShowScrapeModal(false)}
                  className="flex-1 bg-warm-100 hover:bg-warm-200 text-navy-700 font-medium py-2.5 rounded-lg transition-colors text-sm"
                >
                  Cancelar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

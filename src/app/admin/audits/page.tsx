"use client";

import { useState, useEffect } from "react";

interface AuditItem {
  id: string;
  slug: string;
  businessName: string;
  siteUrl: string;
  overallScore: number;
  overallGrade: string;
  totalIssues: number;
  auditDate: string;
  viewCount: number;
  ctaClicks: number;
}

const gradeColors: Record<string, string> = {
  A: "bg-green-500", B: "bg-teal-500", C: "bg-yellow-500", D: "bg-orange-500", F: "bg-red-500",
};

export default function AuditsPage() {
  const [audits, setAudits] = useState<AuditItem[]>([]);
  const [url, setUrl] = useState("");
  const [businessName, setBusinessName] = useState("");
  const [analyzing, setAnalyzing] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  useEffect(() => {
    fetch("/api/audit")
      .then((r) => r.json())
      .then((data) => setAudits(data.audits || []))
      .catch(() => {});
  }, []);

  async function handleAnalyze(e: React.FormEvent) {
    e.preventDefault();
    if (!url.trim()) return;

    setAnalyzing(true);
    setError("");
    setSuccess("");

    try {
      const res = await fetch("/api/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: url.trim(), businessName: businessName.trim() || undefined }),
      });
      const data = await res.json();

      if (data.success) {
        setSuccess(`Auditoría generada: nota ${data.overallGrade} (${data.overallScore}/100) — ${data.totalIssues} problemas`);
        setUrl("");
        setBusinessName("");
        const refreshed = await fetch("/api/audit").then(r => r.json());
        setAudits(refreshed.audits || []);
      } else {
        setError(data.error || "Error al analizar");
      }
    } catch (err) {
      setError("Error de conexión: " + String(err));
    }
    setAnalyzing(false);
  }

  function copyUrl(slug: string) {
    const baseUrl = window.location.origin;
    navigator.clipboard.writeText(`${baseUrl}/audit/${slug}`);
  }

  return (
    <div>
      <div className="mb-8">
        <h1 className="font-[family-name:var(--font-poppins)] text-2xl font-bold text-navy-900">
          Auditorías
        </h1>
        <p className="text-navy-500 text-sm mt-1">
          Analiza cualquier web y genera un reporte de visibilidad AI
        </p>
      </div>

      {/* Analyze form */}
      <div className="bg-white rounded-xl border border-warm-200 shadow-sm p-6 mb-6">
        <h2 className="font-[family-name:var(--font-poppins)] text-lg font-semibold text-navy-900 mb-4">
          Analizar una web
        </h2>
        <form onSubmit={handleAnalyze} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-navy-700 mb-1">URL del sitio web *</label>
              <input
                type="text"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                placeholder="https://clinicaejemplo.com"
                className="w-full border border-warm-200 rounded-lg px-4 py-2.5 text-sm text-navy-900 placeholder:text-navy-400 focus:outline-none focus:ring-2 focus:ring-teal-500"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-navy-700 mb-1">Nombre del negocio (opcional)</label>
              <input
                type="text"
                value={businessName}
                onChange={(e) => setBusinessName(e.target.value)}
                placeholder="Clínica Estética Ejemplo"
                className="w-full border border-warm-200 rounded-lg px-4 py-2.5 text-sm text-navy-900 placeholder:text-navy-400 focus:outline-none focus:ring-2 focus:ring-teal-500"
              />
            </div>
          </div>
          <button
            type="submit"
            disabled={analyzing || !url.trim()}
            className="bg-teal-600 hover:bg-teal-500 text-white font-medium px-6 py-2.5 rounded-lg transition-colors text-sm disabled:opacity-50"
          >
            {analyzing ? "Analizando... (puede tardar 15-30 seg)" : "Analizar Web"}
          </button>
        </form>

        {error && (
          <div className="mt-4 bg-red-50 border border-red-200 rounded-lg px-4 py-3">
            <p className="text-red-700 text-sm">{error}</p>
          </div>
        )}
        {success && (
          <div className="mt-4 bg-green-50 border border-green-200 rounded-lg px-4 py-3">
            <p className="text-green-700 text-sm">{success}</p>
          </div>
        )}
      </div>

      {/* Audits grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {audits.map((audit) => (
          <div key={audit.id} className="bg-white rounded-xl border border-warm-200 shadow-sm overflow-hidden hover:shadow-md transition-shadow">
            <div className="bg-navy-900 p-4 flex items-center justify-between">
              <div className="min-w-0 flex-1 mr-3">
                <p className="text-white font-semibold text-sm truncate">{audit.businessName}</p>
                <p className="text-navy-400 text-xs truncate">{audit.siteUrl}</p>
              </div>
              <div className={`${gradeColors[audit.overallGrade] || "bg-gray-500"} w-12 h-12 rounded-lg flex items-center justify-center shrink-0`}>
                <span className="text-white text-xl font-bold">{audit.overallGrade}</span>
              </div>
            </div>
            <div className="p-4">
              <div className="grid grid-cols-3 gap-3 mb-4">
                <div className="text-center">
                  <p className="text-navy-900 font-bold text-lg">{audit.overallScore}</p>
                  <p className="text-navy-400 text-xs">Puntuación</p>
                </div>
                <div className="text-center">
                  <p className="text-navy-900 font-bold text-lg">{audit.totalIssues}</p>
                  <p className="text-navy-400 text-xs">Problemas</p>
                </div>
                <div className="text-center">
                  <p className="text-navy-900 font-bold text-lg">{audit.viewCount}</p>
                  <p className="text-navy-400 text-xs">Visitas</p>
                </div>
              </div>
              <div className="text-xs text-navy-400 mb-4">{audit.auditDate}</div>
              <div className="flex gap-2">
                <a href={`/audit/${audit.slug}`} target="_blank" className="flex-1 bg-teal-600 hover:bg-teal-500 text-white text-center text-sm font-medium py-2 rounded-lg transition-colors">
                  Ver Reporte
                </a>
                <button onClick={() => copyUrl(audit.slug)} className="bg-warm-100 hover:bg-warm-200 text-navy-700 text-sm font-medium px-3 py-2 rounded-lg transition-colors">
                  Copiar URL
                </button>
              </div>
            </div>
          </div>
        ))}

        {audits.length === 0 && (
          <div className="col-span-full bg-white rounded-xl border-2 border-dashed border-warm-300 flex items-center justify-center py-16">
            <div className="text-center">
              <p className="text-3xl mb-3">📋</p>
              <p className="text-navy-600 font-medium mb-2">No hay auditorías aún</p>
              <p className="text-navy-400 text-sm">Introduce una URL arriba para generar tu primera auditoría</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

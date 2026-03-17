"use client";

const DEMO_AUDITS = [
  {
    id: "1",
    businessName: "Clínica Estética Bella",
    slug: "clinica-estetica-bella",
    siteUrl: "clinicaesteticabella.com",
    overallScore: 50,
    overallGrade: "D",
    totalIssues: 58,
    auditDate: "17 Mar 2026",
    viewCount: 3,
    ctaClicks: 1,
  },
];

const gradeColors: Record<string, string> = {
  A: "bg-green-500",
  B: "bg-teal-500",
  C: "bg-yellow-500",
  D: "bg-orange-500",
  F: "bg-red-500",
};

export default function AuditsPage() {
  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="font-[family-name:var(--font-poppins)] text-2xl font-bold text-navy-900">
            Auditorías
          </h1>
          <p className="text-navy-500 text-sm mt-1">
            Reportes de auditoría generados para cada lead
          </p>
        </div>
      </div>

      {/* Audits grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {DEMO_AUDITS.map((audit) => (
          <div
            key={audit.id}
            className="bg-white rounded-xl border border-warm-200 shadow-sm overflow-hidden hover:shadow-md transition-shadow"
          >
            {/* Header with grade */}
            <div className="bg-navy-900 p-4 flex items-center justify-between">
              <div>
                <p className="text-white font-semibold text-sm">{audit.businessName}</p>
                <p className="text-navy-400 text-xs">{audit.siteUrl}</p>
              </div>
              <div className={`${gradeColors[audit.overallGrade]} w-12 h-12 rounded-lg flex items-center justify-center`}>
                <span className="text-white text-xl font-bold">{audit.overallGrade}</span>
              </div>
            </div>

            {/* Stats */}
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

              <div className="flex items-center justify-between text-xs text-navy-400 mb-4">
                <span>{audit.auditDate}</span>
                <span>{audit.ctaClicks} clicks CTA</span>
              </div>

              <div className="flex gap-2">
                <a
                  href={`/audit/${audit.slug}`}
                  target="_blank"
                  className="flex-1 bg-teal-600 hover:bg-teal-500 text-white text-center text-sm font-medium py-2 rounded-lg transition-colors"
                >
                  Ver Reporte
                </a>
                <button className="bg-warm-100 hover:bg-warm-200 text-navy-700 text-sm font-medium px-3 py-2 rounded-lg transition-colors">
                  Copiar URL
                </button>
              </div>
            </div>
          </div>
        ))}

        {/* Empty state card */}
        <div className="bg-white rounded-xl border-2 border-dashed border-warm-300 flex items-center justify-center min-h-[240px]">
          <div className="text-center">
            <p className="text-navy-400 text-sm mb-2">Analiza un lead para generar una auditoría</p>
            <a
              href="/admin/leads"
              className="text-teal-600 hover:text-teal-500 text-sm font-medium"
            >
              Ir a Leads →
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}

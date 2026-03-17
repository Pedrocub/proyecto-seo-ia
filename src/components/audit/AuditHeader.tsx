"use client";

import { getGradeBg } from "@/types/audit";

interface AuditHeaderProps {
  businessName: string;
  contactName?: string;
  siteUrl: string;
  auditDate: string;
  totalIssues: number;
  overallGrade: string;
}

export default function AuditHeader({
  businessName,
  contactName,
  siteUrl,
  auditDate,
  totalIssues,
  overallGrade,
}: AuditHeaderProps) {
  return (
    <header className="relative overflow-hidden bg-gradient-to-br from-navy-950 via-navy-900 to-[#0c2d2d]">
      {/* Decorative blurs */}
      <div className="absolute top-0 left-0 w-96 h-96 bg-teal-600/5 rounded-full blur-3xl" />
      <div className="absolute bottom-0 right-0 w-80 h-80 bg-teal-400/5 rounded-full blur-3xl" />

      <div className="relative max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-12 sm:py-16">
        {/* Title */}
        <div className="text-center mb-8 animate-fade-in-up">
          <p className="text-teal-400 font-medium tracking-wider uppercase text-sm mb-2">
            Diagnóstico Digital
          </p>
          <h1 className="font-[family-name:var(--font-poppins)] text-3xl sm:text-4xl lg:text-5xl font-bold text-white mb-3">
            Auditoría de Visibilidad AI
          </h1>
          {contactName && (
            <p className="text-navy-300 text-lg">{contactName}</p>
          )}
          <p className="text-white font-semibold text-xl mt-1">
            {businessName}
          </p>
        </div>

        {/* Info bars + Grade */}
        <div className="flex flex-col lg:flex-row items-center justify-center gap-6 animate-fade-in-up" style={{ animationDelay: "0.2s" }}>
          {/* Info cards */}
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="bg-white/10 backdrop-blur-sm rounded-xl px-5 py-3 flex items-center gap-3">
              <span className="text-teal-400">🌐</span>
              <div>
                <p className="text-navy-300 text-xs uppercase tracking-wide">Sitio</p>
                <p className="text-white text-sm font-medium truncate max-w-[250px]">{siteUrl}</p>
              </div>
            </div>
            <div className="bg-white/10 backdrop-blur-sm rounded-xl px-5 py-3 flex items-center gap-3">
              <span className="text-teal-400">📅</span>
              <div>
                <p className="text-navy-300 text-xs uppercase tracking-wide">Fecha</p>
                <p className="text-white text-sm font-medium">{auditDate}</p>
              </div>
            </div>
            <div className="bg-white/10 backdrop-blur-sm rounded-xl px-5 py-3 flex items-center gap-3">
              <span className="text-teal-400">⚠️</span>
              <div>
                <p className="text-navy-300 text-xs uppercase tracking-wide">Problemas</p>
                <p className="text-white text-sm font-medium">{totalIssues} encontrados</p>
              </div>
            </div>
          </div>

          {/* Grade badge */}
          <div className={`${getGradeBg(overallGrade)} w-28 h-28 sm:w-32 sm:h-32 rounded-2xl flex flex-col items-center justify-center shadow-2xl`}>
            <span className="text-white text-5xl sm:text-6xl font-bold font-[family-name:var(--font-poppins)]">
              {overallGrade}
            </span>
            <span className="text-white/80 text-xs uppercase tracking-wider mt-1">
              Nota General
            </span>
          </div>
        </div>
      </div>
    </header>
  );
}

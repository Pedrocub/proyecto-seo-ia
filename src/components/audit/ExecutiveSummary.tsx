"use client";

interface ExecutiveSummaryProps {
  summary: string;
  criticalCount: number;
  majorCount: number;
  minorCount: number;
  oppsCount: number;
}

export default function ExecutiveSummary({
  summary,
  criticalCount,
  majorCount,
  minorCount,
  oppsCount,
}: ExecutiveSummaryProps) {
  return (
    <section className="animate-fade-in-up" style={{ animationDelay: "0.3s" }}>
      <div className="bg-white rounded-2xl border border-warm-200 shadow-sm p-6 sm:p-8">
        <h2 className="font-[family-name:var(--font-poppins)] text-2xl font-bold text-navy-900 mb-4">
          Resumen Ejecutivo
        </h2>
        <p className="text-navy-600 leading-relaxed mb-6">{summary}</p>

        {/* Severity badges */}
        <div className="flex flex-wrap gap-3">
          <SeverityBadge count={criticalCount} label="Críticos" color="bg-red-500" />
          <SeverityBadge count={majorCount} label="Mayores" color="bg-orange-500" />
          <SeverityBadge count={minorCount} label="Menores" color="bg-yellow-500" />
          <SeverityBadge count={oppsCount} label="Oportunidades" color="bg-blue-500" />
        </div>
      </div>
    </section>
  );
}

function SeverityBadge({ count, label, color }: { count: number; label: string; color: string }) {
  return (
    <div className="flex items-center gap-2 bg-warm-50 rounded-full px-4 py-2">
      <span className={`${color} text-white text-sm font-bold w-7 h-7 rounded-full flex items-center justify-center`}>
        {count}
      </span>
      <span className="text-navy-700 text-sm font-medium">{label}</span>
    </div>
  );
}

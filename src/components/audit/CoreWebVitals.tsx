"use client";

import { CoreWebVitals as VitalsType } from "@/types/audit";

interface CoreWebVitalsProps {
  vitals: VitalsType;
  auditDate: string;
}

export default function CoreWebVitals({ vitals, auditDate }: CoreWebVitalsProps) {
  const lcpStatus = vitals.lcp !== null ? (vitals.lcp <= 2.5 ? "pass" : vitals.lcp <= 4 ? "warn" : "fail") : "na";
  const clsStatus = vitals.cls !== null ? (vitals.cls <= 0.1 ? "pass" : vitals.cls <= 0.25 ? "warn" : "fail") : "na";
  const inpStatus = vitals.inp !== null ? (vitals.inp <= 200 ? "pass" : vitals.inp <= 500 ? "warn" : "fail") : "na";

  const passCount = [lcpStatus, clsStatus, inpStatus].filter((s) => s === "pass").length;
  const totalCount = [lcpStatus, clsStatus, inpStatus].filter((s) => s !== "na").length;

  return (
    <section>
      <h2 className="font-[family-name:var(--font-poppins)] text-2xl font-bold text-navy-900 mb-2">
        Análisis Google Lighthouse
      </h2>
      <p className="text-navy-500 text-sm mb-6">Core Web Vitals</p>

      {/* Alert box */}
      {totalCount > 0 && (
        <div className={`rounded-xl p-4 mb-6 ${passCount === totalCount ? "bg-green-50 border border-green-200" : "bg-amber-50 border border-amber-200"}`}>
          <p className={`text-sm ${passCount === totalCount ? "text-green-800" : "text-amber-800"}`}>
            {passCount === totalCount
              ? `Los ${totalCount} Core Web Vitals pasan los umbrales de Google.`
              : `${passCount} de ${totalCount} Core Web Vitals pasan.${lcpStatus === "fail" && vitals.lcp ? ` El tiempo de carga principal (LCP) de ${vitals.lcp}s excede el umbral de 2.5s de Google.` : ""}`
            }
          </p>
        </div>
      )}

      {/* Vitals cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
        {vitals.lcp !== null && (
          <VitalCard
            name="LCP"
            fullName="Largest Contentful Paint"
            value={`${vitals.lcp}s`}
            target="< 2.5s"
            status={lcpStatus}
            percentage={Math.min((2.5 / vitals.lcp) * 100, 100)}
          />
        )}
        {vitals.cls !== null && (
          <VitalCard
            name="CLS"
            fullName="Cumulative Layout Shift"
            value={vitals.cls.toFixed(2)}
            target="< 0.1"
            status={clsStatus}
            percentage={Math.min(((0.1 - vitals.cls) / 0.1) * 100 + 50, 100)}
          />
        )}
        {vitals.inp !== null && (
          <VitalCard
            name="INP"
            fullName="Interaction to Next Paint"
            value={`${vitals.inp}ms`}
            target="< 200ms"
            status={inpStatus}
            percentage={Math.min(((200 - vitals.inp) / 200) * 100 + 50, 100)}
          />
        )}
      </div>

      <p className="text-navy-400 text-xs text-center">
        Medido por Google PageSpeed Insights · Datos recopilados {auditDate}
      </p>
    </section>
  );
}

function VitalCard({
  name,
  fullName,
  value,
  target,
  status,
  percentage,
}: {
  name: string;
  fullName: string;
  value: string;
  target: string;
  status: string;
  percentage: number;
}) {
  const barColor = status === "pass" ? "bg-green-500" : status === "warn" ? "bg-yellow-500" : "bg-red-500";
  const textColor = status === "pass" ? "text-green-600" : status === "warn" ? "text-yellow-600" : "text-red-600";

  return (
    <div className="bg-white rounded-2xl border border-warm-200 shadow-sm p-5">
      <div className="flex items-center justify-between mb-1">
        <h3 className="text-navy-900 font-bold text-lg">{name}</h3>
        <span className={`text-xs font-medium ${textColor}`}>
          {status === "pass" ? "✓ Pasa" : status === "warn" ? "⚠ Alerta" : "✗ Falla"}
        </span>
      </div>
      <p className="text-navy-400 text-xs mb-3">{fullName}</p>
      <p className={`text-2xl font-bold ${textColor} mb-2`}>{value}</p>
      <div className="w-full bg-warm-100 rounded-full h-2 mb-2">
        <div
          className={`${barColor} h-2 rounded-full transition-all duration-1000`}
          style={{ width: `${Math.max(percentage, 5)}%` }}
        />
      </div>
      <p className="text-navy-400 text-xs">Objetivo: {target}</p>
    </div>
  );
}

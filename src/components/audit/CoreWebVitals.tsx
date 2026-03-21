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
  const fcpStatus = vitals.fcp !== null ? (vitals.fcp <= 1.8 ? "pass" : vitals.fcp <= 3 ? "warn" : "fail") : "na";
  const tbtStatus = vitals.tbt !== null ? (vitals.tbt <= 200 ? "pass" : vitals.tbt <= 600 ? "warn" : "fail") : "na";
  const siStatus = vitals.si !== null ? (vitals.si <= 3.4 ? "pass" : vitals.si <= 5.8 ? "warn" : "fail") : "na";

  // Core Web Vitals (official 3)
  const coreStatuses = [lcpStatus, clsStatus, inpStatus];
  const corePassCount = coreStatuses.filter((s) => s === "pass").length;
  const coreTotalCount = coreStatuses.filter((s) => s !== "na").length;

  // All 6 metrics
  const allStatuses = [lcpStatus, clsStatus, inpStatus, fcpStatus, tbtStatus, siStatus];
  const allPassCount = allStatuses.filter((s) => s === "pass").length;
  const allTotalCount = allStatuses.filter((s) => s !== "na").length;

  if (allTotalCount === 0) return null;

  return (
    <section>
      <h2 className="font-[family-name:var(--font-poppins)] text-2xl font-bold text-navy-900 mb-2">
        Análisis Google Lighthouse
      </h2>
      <p className="text-navy-500 text-sm mb-6">Core Web Vitals y métricas de rendimiento</p>

      {/* Alert box */}
      <div className={`rounded-xl p-4 mb-6 ${corePassCount === coreTotalCount && coreTotalCount > 0 ? "bg-green-50 border border-green-200" : "bg-amber-50 border border-amber-200"}`}>
        <p className={`text-sm font-medium ${corePassCount === coreTotalCount && coreTotalCount > 0 ? "text-green-800" : "text-amber-800"}`}>
          {coreTotalCount === 0
            ? "No se pudieron obtener los Core Web Vitals para este sitio."
            : corePassCount === coreTotalCount
              ? `Los ${coreTotalCount} Core Web Vitals pasan los umbrales de Google. ${allPassCount}/${allTotalCount} métricas totales aprobadas.`
              : `${corePassCount} de ${coreTotalCount} Core Web Vitals pasan los umbrales de Google.${lcpStatus === "fail" && vitals.lcp ? ` El LCP de ${vitals.lcp}s excede el umbral de 2.5s.` : ""}${inpStatus === "fail" && vitals.inp ? ` El INP de ${vitals.inp}ms excede los 200ms recomendados.` : ""}`
          }
        </p>
      </div>

      {/* Core Web Vitals (the official 3) */}
      <h3 className="text-navy-700 text-sm font-semibold uppercase tracking-wide mb-3">Core Web Vitals</h3>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
        {vitals.lcp !== null && (
          <VitalCard
            name="LCP"
            fullName="Largest Contentful Paint"
            value={`${vitals.lcp}s`}
            target="< 2.5s"
            status={lcpStatus}
            percentage={vitals.lcp <= 2.5 ? 100 : Math.max(5, 100 - ((vitals.lcp - 2.5) / 2.5) * 50)}
          />
        )}
        {vitals.cls !== null && (
          <VitalCard
            name="CLS"
            fullName="Cumulative Layout Shift"
            value={vitals.cls.toFixed(2)}
            target="< 0.1"
            status={clsStatus}
            percentage={vitals.cls <= 0.1 ? 100 : Math.max(5, 100 - (vitals.cls / 0.25) * 50)}
          />
        )}
        {vitals.inp !== null && (
          <VitalCard
            name="INP"
            fullName="Interaction to Next Paint"
            value={`${vitals.inp}ms`}
            target="< 200ms"
            status={inpStatus}
            percentage={vitals.inp <= 200 ? 100 : Math.max(5, 100 - ((vitals.inp - 200) / 300) * 50)}
          />
        )}
      </div>

      {/* Additional metrics */}
      {(vitals.fcp !== null || vitals.tbt !== null || vitals.si !== null) && (
        <>
          <h3 className="text-navy-700 text-sm font-semibold uppercase tracking-wide mb-3">Métricas adicionales</h3>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
            {vitals.fcp !== null && (
              <VitalCard
                name="FCP"
                fullName="First Contentful Paint"
                value={`${vitals.fcp}s`}
                target="< 1.8s"
                status={fcpStatus}
                percentage={vitals.fcp <= 1.8 ? 100 : Math.max(5, 100 - ((vitals.fcp - 1.8) / 1.8) * 50)}
              />
            )}
            {vitals.tbt !== null && (
              <VitalCard
                name="TBT"
                fullName="Total Blocking Time"
                value={`${vitals.tbt}ms`}
                target="< 200ms"
                status={tbtStatus}
                percentage={vitals.tbt <= 200 ? 100 : Math.max(5, 100 - ((vitals.tbt - 200) / 400) * 50)}
              />
            )}
            {vitals.si !== null && (
              <VitalCard
                name="SI"
                fullName="Speed Index"
                value={`${vitals.si}s`}
                target="< 3.4s"
                status={siStatus}
                percentage={vitals.si <= 3.4 ? 100 : Math.max(5, 100 - ((vitals.si - 3.4) / 3.4) * 50)}
              />
            )}
          </div>
        </>
      )}

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

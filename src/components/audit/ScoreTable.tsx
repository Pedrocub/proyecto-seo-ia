"use client";

import { CategoryScore, getScoreStatus } from "@/types/audit";

interface ScoreTableProps {
  categories: CategoryScore[];
  overallScore: number;
  totalIssues: number;
}

export default function ScoreTable({ categories, overallScore, totalIssues }: ScoreTableProps) {
  return (
    <section>
      <h2 className="font-[family-name:var(--font-poppins)] text-2xl font-bold text-navy-900 mb-6">
        Resumen de Puntuaciones
      </h2>

      {/* Desktop table */}
      <div className="hidden md:block bg-white rounded-2xl border border-warm-200 shadow-sm overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="bg-warm-50 border-b border-warm-200">
              <th className="text-left px-6 py-4 text-navy-600 text-sm font-semibold">Categoría</th>
              <th className="text-center px-6 py-4 text-navy-600 text-sm font-semibold">Puntuación</th>
              <th className="text-center px-6 py-4 text-navy-600 text-sm font-semibold">Estado</th>
              <th className="text-center px-6 py-4 text-navy-600 text-sm font-semibold">Problemas</th>
            </tr>
          </thead>
          <tbody>
            {categories.map((cat) => {
              const status = getScoreStatus(cat.score);
              return (
                <tr key={cat.key} className="border-b border-warm-100 hover:bg-warm-50/50 transition-colors">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2">
                      <span>{cat.icon}</span>
                      <span className="text-navy-800 font-medium text-sm">{cat.label}</span>
                    </div>
                  </td>
                  <td className="text-center px-6 py-4">
                    <span className="text-navy-900 font-bold">{cat.score}</span>
                    <span className="text-navy-400">/100</span>
                  </td>
                  <td className="text-center px-6 py-4">
                    <span className={`${status.color} text-sm font-medium`}>{status.label}</span>
                  </td>
                  <td className="text-center px-6 py-4">
                    <span className="text-navy-600 font-medium">{cat.issueCount}</span>
                  </td>
                </tr>
              );
            })}
          </tbody>
          <tfoot>
            <tr className="bg-navy-900">
              <td className="px-6 py-4 text-white font-semibold">Promedio General</td>
              <td className="text-center px-6 py-4 text-teal-400 font-bold text-lg">{overallScore}/100</td>
              <td className="text-center px-6 py-4">
                <span className={`text-sm font-medium ${getScoreStatus(overallScore).color === "text-red-600" ? "text-red-400" : getScoreStatus(overallScore).color === "text-orange-600" ? "text-orange-400" : "text-teal-400"}`}>
                  {getScoreStatus(overallScore).label}
                </span>
              </td>
              <td className="text-center px-6 py-4 text-teal-400 font-bold">{totalIssues}</td>
            </tr>
          </tfoot>
        </table>
      </div>

      {/* Mobile cards */}
      <div className="md:hidden space-y-3">
        {categories.map((cat) => {
          const status = getScoreStatus(cat.score);
          return (
            <div key={cat.key} className="bg-white rounded-xl border border-warm-200 p-4">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <span>{cat.icon}</span>
                  <span className="text-navy-800 font-medium text-sm">{cat.label}</span>
                </div>
                <span className="text-navy-900 font-bold">{cat.score}/100</span>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className={status.color}>{status.label}</span>
                <span className="text-navy-400">{cat.issueCount} problemas</span>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}

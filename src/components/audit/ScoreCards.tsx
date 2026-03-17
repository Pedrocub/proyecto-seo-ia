"use client";

import { CategoryScore, getScoreStatus } from "@/types/audit";

interface ScoreCardsProps {
  categories: CategoryScore[];
  overallScore: number;
  totalIssues: number;
}

export default function ScoreCards({ categories, overallScore, totalIssues }: ScoreCardsProps) {
  return (
    <section>
      <h2 className="font-[family-name:var(--font-poppins)] text-2xl font-bold text-navy-900 mb-6">
        Puntuaciones por Categoría
      </h2>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {categories.map((cat, i) => (
          <ScoreCard key={cat.key} category={cat} index={i} />
        ))}
      </div>

      {/* Overall card */}
      <div className="mt-4 bg-navy-900 rounded-2xl p-6 flex items-center justify-between">
        <div>
          <p className="text-navy-300 text-sm">Promedio General</p>
          <p className="text-white text-3xl font-bold font-[family-name:var(--font-poppins)]">
            {overallScore}/100
          </p>
        </div>
        <div className="text-right">
          <p className="text-navy-300 text-sm">Problemas totales</p>
          <p className="text-teal-400 text-3xl font-bold">{totalIssues}</p>
        </div>
      </div>
    </section>
  );
}

function ScoreCard({ category, index }: { category: CategoryScore; index: number }) {
  const status = getScoreStatus(category.score);
  const barColor =
    category.score >= 80 ? "bg-green-500" :
    category.score >= 60 ? "bg-yellow-500" :
    category.score >= 40 ? "bg-orange-500" : "bg-red-500";

  return (
    <div
      className={`opacity-0 animate-card-entrance stagger-${index + 1} bg-white rounded-2xl border border-warm-200 shadow-sm p-5`}
    >
      <div className="flex items-center gap-2 mb-3">
        <span className="text-lg">{category.icon}</span>
        <h3 className="text-navy-800 text-sm font-semibold leading-tight">{category.label}</h3>
      </div>
      <div className="flex items-end justify-between mb-2">
        <span className="text-3xl font-bold font-[family-name:var(--font-poppins)] text-navy-900">
          {category.score}
        </span>
        <span className="text-navy-400 text-sm">/100</span>
      </div>
      {/* Progress bar */}
      <div className="w-full bg-warm-100 rounded-full h-2 mb-2">
        <div
          className={`${barColor} h-2 rounded-full transition-all duration-1000`}
          style={{ width: `${category.score}%` }}
        />
      </div>
      <div className="flex items-center justify-between">
        <span className={`text-xs font-medium ${status.color}`}>{status.label}</span>
        <span className="text-xs text-navy-400">{category.issueCount} problemas</span>
      </div>
    </div>
  );
}

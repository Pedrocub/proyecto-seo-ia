"use client";

import { useState } from "react";
import {
  AuditIssue,
  Severity,
  SEVERITY_CONFIG,
  CATEGORY_LABELS,
  CategoryKey,
} from "@/types/audit";

interface IssuesListProps {
  issues: AuditIssue[];
  criticalCount: number;
  majorCount: number;
  minorCount: number;
  oppsCount: number;
}

export default function IssuesList({
  issues,
  criticalCount,
  majorCount,
  minorCount,
  oppsCount,
}: IssuesListProps) {
  const severities: { key: Severity; count: number }[] = [
    { key: "critical", count: criticalCount },
    { key: "major", count: majorCount },
    { key: "minor", count: minorCount },
    { key: "opportunity", count: oppsCount },
  ];

  return (
    <section>
      <h2 className="font-[family-name:var(--font-poppins)] text-2xl font-bold text-navy-900 mb-6">
        Análisis Detallado por Severidad
      </h2>

      <div className="space-y-8">
        {severities
          .filter((s) => s.count > 0)
          .map((severity) => (
            <SeveritySection
              key={severity.key}
              severity={severity.key}
              count={severity.count}
              issues={issues.filter((i) => i.severity === severity.key)}
            />
          ))}
      </div>
    </section>
  );
}

function SeveritySection({
  severity,
  count,
  issues,
}: {
  severity: Severity;
  count: number;
  issues: AuditIssue[];
}) {
  const config = SEVERITY_CONFIG[severity];

  // Group by category
  const grouped = issues.reduce<Record<string, AuditIssue[]>>((acc, issue) => {
    if (!acc[issue.category]) acc[issue.category] = [];
    acc[issue.category].push(issue);
    return acc;
  }, {});

  return (
    <div>
      <div className="flex items-center gap-3 mb-4">
        <span
          className={`${config.bg} ${config.color} text-sm font-bold px-3 py-1 rounded-full border ${config.border}`}
        >
          {count} {config.label}{count !== 1 ? "s" : ""}
        </span>
      </div>

      <div className="space-y-3">
        {Object.entries(grouped).map(([category, catIssues]) => (
          <CategoryGroup
            key={category}
            category={category as CategoryKey}
            issues={catIssues}
            severity={severity}
          />
        ))}
      </div>
    </div>
  );
}

function CategoryGroup({
  category,
  issues,
  severity,
}: {
  category: CategoryKey;
  issues: AuditIssue[];
  severity: Severity;
}) {
  const config = SEVERITY_CONFIG[severity];

  return (
    <div className="space-y-2">
      <h4 className="text-navy-600 text-sm font-semibold uppercase tracking-wide px-1">
        {CATEGORY_LABELS[category]}
      </h4>
      {issues.map((issue) => (
        <IssueCard key={issue.id} issue={issue} config={config} />
      ))}
    </div>
  );
}

function IssueCard({
  issue,
  config,
}: {
  issue: AuditIssue;
  config: { bg: string; color: string; border: string };
}) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div
      className={`${config.bg} border ${config.border} rounded-xl overflow-hidden transition-all`}
    >
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full text-left px-5 py-4 flex items-start gap-3 hover:opacity-90 transition-opacity"
      >
        <span className={`${config.color} mt-0.5 text-sm`}>
          {expanded ? "▼" : "▶"}
        </span>
        <div className="flex-1 min-w-0">
          <p className="text-navy-900 font-medium text-sm">{issue.title}</p>
          {!expanded && (
            <p className="text-navy-500 text-xs mt-1 line-clamp-1">
              {issue.description}
            </p>
          )}
        </div>
      </button>

      {expanded && (
        <div className="px-5 pb-4 border-t border-warm-200/50">
          <p className="text-navy-700 text-sm mt-3 leading-relaxed">
            {issue.description}
          </p>
          <div className="mt-3 bg-white/60 rounded-lg p-3">
            <p className="text-navy-400 text-xs uppercase tracking-wide font-semibold mb-1">
              ¿Por qué importa?
            </p>
            <p className="text-navy-600 text-sm italic leading-relaxed">
              {issue.whyItMatters}
            </p>
          </div>
        </div>
      )}
    </div>
  );
}

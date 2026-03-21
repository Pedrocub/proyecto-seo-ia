export type Severity = "critical" | "major" | "minor" | "opportunity";

export type CategoryKey =
  | "mobile"
  | "seo"
  | "llm"
  | "accessibility"
  | "performance"
  | "content"
  | "trust"
  | "technical";

export interface AuditIssue {
  id: number;
  title: string;
  category: CategoryKey;
  severity: Severity;
  description: string;
  whyItMatters: string;
}

export interface CoreWebVitals {
  lcp: number | null;
  cls: number | null;
  inp: number | null;
  fcp: number | null;
  tbt: number | null;
  si: number | null;
}

export interface CategoryScore {
  key: CategoryKey;
  label: string;
  score: number;
  issueCount: number;
  status: string;
  icon: string;
}

export interface AuditReport {
  id: string;
  slug: string;
  token: string;
  businessName: string;
  contactName?: string;
  siteUrl: string;
  auditDate: string;
  overallScore: number;
  overallGrade: string;
  totalIssues: number;
  criticalCount: number;
  majorCount: number;
  minorCount: number;
  oppsCount: number;
  categories: CategoryScore[];
  issues: AuditIssue[];
  vitals: CoreWebVitals;
  summary: string;
}

export const CATEGORY_LABELS: Record<CategoryKey, string> = {
  mobile: "Mobile y Responsividad",
  seo: "SEO y Visibilidad en Búsquedas",
  llm: "LLM y Preparación para IA",
  accessibility: "Accesibilidad (WCAG 2.1 AA)",
  performance: "Rendimiento",
  content: "Contenido y Arquitectura",
  trust: "Confianza y Credibilidad",
  technical: "Implementación Técnica",
};

export const CATEGORY_ICONS: Record<CategoryKey, string> = {
  mobile: "📱",
  seo: "🔍",
  llm: "🤖",
  accessibility: "♿",
  performance: "⚡",
  content: "📄",
  trust: "🛡️",
  technical: "⚙️",
};

export const SEVERITY_CONFIG: Record<
  Severity,
  { label: string; color: string; bg: string; border: string }
> = {
  critical: {
    label: "Crítico",
    color: "text-red-600",
    bg: "bg-red-50",
    border: "border-red-200",
  },
  major: {
    label: "Mayor",
    color: "text-orange-600",
    bg: "bg-orange-50",
    border: "border-orange-200",
  },
  minor: {
    label: "Menor",
    color: "text-yellow-600",
    bg: "bg-yellow-50",
    border: "border-yellow-200",
  },
  opportunity: {
    label: "Oportunidad",
    color: "text-blue-600",
    bg: "bg-blue-50",
    border: "border-blue-200",
  },
};

export function getGradeColor(grade: string): string {
  switch (grade) {
    case "A": return "text-green-500";
    case "B": return "text-teal-500";
    case "C": return "text-yellow-500";
    case "D": return "text-orange-500";
    case "F": return "text-red-500";
    default: return "text-red-500";
  }
}

export function getGradeBg(grade: string): string {
  switch (grade) {
    case "A": return "bg-green-500";
    case "B": return "bg-teal-500";
    case "C": return "bg-yellow-500";
    case "D": return "bg-orange-500";
    case "F": return "bg-red-500";
    default: return "bg-red-500";
  }
}

export function getScoreStatus(score: number): { label: string; color: string } {
  if (score >= 80) return { label: "Bueno", color: "text-green-600" };
  if (score >= 60) return { label: "Puede mejorar", color: "text-yellow-600" };
  if (score >= 40) return { label: "Necesita atención", color: "text-orange-600" };
  return { label: "Crítico", color: "text-red-600" };
}

export function scoreToGrade(score: number): string {
  if (score >= 90) return "A";
  if (score >= 75) return "B";
  if (score >= 60) return "C";
  if (score >= 40) return "D";
  return "F";
}

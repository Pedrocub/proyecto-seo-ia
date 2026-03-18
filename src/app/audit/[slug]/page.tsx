import { notFound } from "next/navigation";
import AuditHeader from "@/components/audit/AuditHeader";
import ExecutiveSummary from "@/components/audit/ExecutiveSummary";
import ScoreCards from "@/components/audit/ScoreCards";
import ScoreTable from "@/components/audit/ScoreTable";
import CoreWebVitals from "@/components/audit/CoreWebVitals";
import IssuesList from "@/components/audit/IssuesList";
import AuditCTA from "@/components/audit/AuditCTA";
import { getAuditBySlug, incrementAuditView } from "@/lib/storage";
import { DEMO_AUDIT } from "@/lib/demo-audit";
import { AuditIssue, CategoryScore, CoreWebVitals as VitalsType } from "@/types/audit";

interface PageProps {
  params: Promise<{ slug: string }>;
}

export const dynamic = "force-dynamic";

export default async function AuditPage({ params }: PageProps) {
  const { slug } = await params;

  // Try to load from storage first
  const storedAudit = getAuditBySlug(slug);

  // Fallback to demo for the demo slug
  if (!storedAudit && slug !== "demo") {
    notFound();
  }

  // If found in storage, increment view
  if (storedAudit) {
    incrementAuditView(slug);
  }

  // Use stored audit or demo
  const audit = storedAudit || DEMO_AUDIT;

  return (
    <div className="min-h-screen bg-warm-50">
      <AuditHeader
        businessName={audit.businessName}
        contactName={audit.contactName}
        siteUrl={audit.siteUrl}
        auditDate={audit.auditDate}
        totalIssues={audit.totalIssues}
        overallGrade={audit.overallGrade}
      />

      {/* Info banner */}
      <div className="bg-warm-100 border-b border-warm-200">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-3">
          <p className="text-navy-500 text-sm flex items-center gap-2">
            <span>🔒</span>
            Este reporte fue generado utilizando herramientas de análisis potenciadas por IA y datos en tiempo real de Google PageSpeed Insights.
          </p>
        </div>
      </div>

      {/* Main content */}
      <main className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-10">
        <ExecutiveSummary
          summary={audit.summary}
          criticalCount={audit.criticalCount}
          majorCount={audit.majorCount}
          minorCount={audit.minorCount}
          oppsCount={audit.oppsCount}
        />

        <ScoreCards
          categories={audit.categories as CategoryScore[]}
          overallScore={audit.overallScore}
          totalIssues={audit.totalIssues}
        />

        <ScoreTable
          categories={audit.categories as CategoryScore[]}
          overallScore={audit.overallScore}
          totalIssues={audit.totalIssues}
        />

        <CoreWebVitals vitals={audit.vitals as VitalsType} auditDate={audit.auditDate} />

        <IssuesList
          issues={audit.issues as AuditIssue[]}
          criticalCount={audit.criticalCount}
          majorCount={audit.majorCount}
          minorCount={audit.minorCount}
          oppsCount={audit.oppsCount}
        />

        <AuditCTA
          businessName={audit.businessName}
          overallGrade={audit.overallGrade}
          totalIssues={audit.totalIssues}
          auditDate={audit.auditDate}
        />
      </main>
    </div>
  );
}

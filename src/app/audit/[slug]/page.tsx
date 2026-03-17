import AuditHeader from "@/components/audit/AuditHeader";
import ExecutiveSummary from "@/components/audit/ExecutiveSummary";
import ScoreCards from "@/components/audit/ScoreCards";
import ScoreTable from "@/components/audit/ScoreTable";
import CoreWebVitals from "@/components/audit/CoreWebVitals";
import IssuesList from "@/components/audit/IssuesList";
import AuditCTA from "@/components/audit/AuditCTA";
import { DEMO_AUDIT } from "@/lib/demo-audit";

interface PageProps {
  params: Promise<{ slug: string }>;
}

export default async function AuditPage({ params }: PageProps) {
  const { slug } = await params;

  // TODO: fetch from database by slug
  // For now, use demo data
  const audit = DEMO_AUDIT;

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
          categories={audit.categories}
          overallScore={audit.overallScore}
          totalIssues={audit.totalIssues}
        />

        <ScoreTable
          categories={audit.categories}
          overallScore={audit.overallScore}
          totalIssues={audit.totalIssues}
        />

        <CoreWebVitals vitals={audit.vitals} auditDate={audit.auditDate} />

        <IssuesList
          issues={audit.issues}
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

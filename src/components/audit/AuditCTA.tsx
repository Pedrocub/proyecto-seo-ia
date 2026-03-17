"use client";

interface AuditCTAProps {
  businessName: string;
  overallGrade: string;
  totalIssues: number;
  auditDate: string;
}

export default function AuditCTA({ businessName, overallGrade, totalIssues, auditDate }: AuditCTAProps) {
  return (
    <>
      {/* Main CTA section */}
      <section className="bg-gradient-to-br from-navy-950 via-navy-900 to-[#0c2d2d] rounded-2xl p-8 sm:p-12 text-center">
        <h2 className="font-[family-name:var(--font-poppins)] text-2xl sm:text-3xl font-bold text-white mb-4">
          ¿Listo para mejorar tu visibilidad digital?
        </h2>
        <p className="text-navy-300 max-w-2xl mx-auto mb-8 leading-relaxed">
          Tu sitio web tiene <span className="text-teal-400 font-semibold">{totalIssues} problemas</span> que
          están afectando tu visibilidad en buscadores e inteligencia artificial.
          Podemos ayudarte a resolverlos y posicionarte como líder en tu sector.
        </p>
        <a
          href="https://app.reclaim.ai/m/liderify/consulta"
          target="_blank"
          rel="noopener noreferrer"
          className="inline-block bg-teal-600 hover:bg-teal-500 text-white font-semibold px-8 py-4 rounded-xl transition-all hover:shadow-lg hover:shadow-teal-600/20 text-lg"
        >
          Agenda una Consulta Gratuita
        </a>
      </section>

      {/* Footer */}
      <footer className="text-center py-8">
        <p className="text-navy-400 text-sm">
          Reporte generado por <span className="font-semibold text-navy-600">Liderify</span> | {auditDate}
        </p>
        <div className="flex items-center justify-center gap-4 mt-4">
          {["Instagram", "TikTok", "Facebook", "LinkedIn"].map((social) => (
            <a
              key={social}
              href="#"
              className="text-navy-400 hover:text-teal-600 text-sm transition-colors"
            >
              {social}
            </a>
          ))}
        </div>
      </footer>
    </>
  );
}

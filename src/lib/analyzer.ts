import { AuditIssue, CategoryKey, Severity, scoreToGrade } from "@/types/audit";

interface AnalysisInput {
  url: string;
  html: string;
  headers: Record<string, string>;
  lighthouseData?: LighthouseData;
}

interface LighthouseData {
  lcp?: number;
  cls?: number;
  inp?: number;
  performanceScore?: number;
  seoScore?: number;
  accessibilityScore?: number;
  bestPracticesScore?: number;
}

export interface AnalysisResult {
  overallScore: number;
  overallGrade: string;
  totalIssues: number;
  criticalCount: number;
  majorCount: number;
  minorCount: number;
  oppsCount: number;
  categories: {
    key: CategoryKey;
    label: string;
    score: number;
    issueCount: number;
    icon: string;
  }[];
  issues: AuditIssue[];
  vitals: { lcp: number | null; cls: number | null; inp: number | null };
  summary: string;
}

// ---- CHECK FUNCTIONS ----

function checkMobile(html: string): AuditIssue[] {
  const issues: AuditIssue[] = [];
  let id = 1000;

  if (!html.includes('viewport') || !html.includes('width=device-width')) {
    issues.push({
      id: id++, category: "mobile", severity: "critical",
      title: "Sin meta viewport configurado",
      description: "No se encontró la etiqueta meta viewport con width=device-width.",
      whyItMatters: "Sin viewport configurado, el sitio no se adapta a móviles. Google penaliza sitios no mobile-friendly.",
    });
  }

  const longTitles = html.match(/<title[^>]*>([^<]{80,})<\/title>/gi);
  if (longTitles) {
    issues.push({
      id: id++, category: "mobile", severity: "minor",
      title: "Título demasiado largo para móvil",
      description: "El título excede 80 caracteres y se truncará en resultados móviles.",
      whyItMatters: "Los títulos truncados en móvil se ven menos profesionales y reducen el CTR.",
    });
  }

  if (!html.includes('click-to-call') && !html.match(/href="tel:/i)) {
    issues.push({
      id: id++, category: "mobile", severity: "opportunity",
      title: "Sin botón click-to-call",
      description: "No se detectó enlace telefónico tap-to-call para usuarios móviles.",
      whyItMatters: "Los pacientes que buscan en móvil quieren llamar inmediatamente. Sin click-to-call, deben copiar el número manualmente.",
    });
  }

  if (!html.match(/position:\s*sticky|position:\s*fixed/i) || !html.match(/cta|reserv|cit|contact/i)) {
    issues.push({
      id: id++, category: "mobile", severity: "opportunity",
      title: "Sin CTA sticky en móvil",
      description: "No se detectó un botón de llamada a la acción fijo o sticky en la vista móvil.",
      whyItMatters: "Un CTA sticky permite que los usuarios contacten en cualquier momento sin tener que hacer scroll.",
    });
  }

  return issues;
}

function checkSEO(html: string, url: string): AuditIssue[] {
  const issues: AuditIssue[] = [];
  let id = 2000;

  // Title tag
  const titleMatch = html.match(/<title[^>]*>([^<]*)<\/title>/i);
  if (!titleMatch) {
    issues.push({
      id: id++, category: "seo", severity: "critical",
      title: "Sin etiqueta title",
      description: "No se encontró etiqueta <title> en la página.",
      whyItMatters: "El title es el factor on-page más importante para SEO. Sin él, Google genera un título automático que rara vez es óptimo.",
    });
  } else if (titleMatch[1].length > 65) {
    issues.push({
      id: id++, category: "seo", severity: "critical",
      title: "Título de página demasiado largo",
      description: `El título tiene ${titleMatch[1].length} caracteres, excediendo el límite recomendado de 60 caracteres.`,
      whyItMatters: "Google trunca los títulos más allá de ~60 caracteres. El nombre del negocio y diferenciadores clave se cortan.",
    });
  }

  // Meta description
  if (!html.match(/meta\s+name=["']description["']/i)) {
    issues.push({
      id: id++, category: "seo", severity: "major",
      title: "Sin meta description",
      description: "No se encontró la meta description en la página.",
      whyItMatters: "La meta description aparece en los resultados de búsqueda. Sin ella, Google genera un snippet aleatorio.",
    });
  }

  // H1 tags
  const h1Matches = html.match(/<h1[^>]*>/gi);
  if (!h1Matches) {
    issues.push({
      id: id++, category: "seo", severity: "major",
      title: "Sin encabezado H1",
      description: "No se encontró etiqueta H1 en la página.",
      whyItMatters: "El H1 indica a los buscadores el tema principal de la página.",
    });
  } else if (h1Matches.length > 1) {
    issues.push({
      id: id++, category: "seo", severity: "minor",
      title: "Múltiples etiquetas H1",
      description: `Se encontraron ${h1Matches.length} etiquetas H1 en la página.`,
      whyItMatters: "Múltiples H1 diluyen la señal de relevancia temática para los buscadores.",
    });
  }

  // Open Graph
  if (!html.match(/og:title/i)) {
    issues.push({
      id: id++, category: "seo", severity: "major",
      title: "Sin Open Graph title",
      description: "No se encontró og:title para compartir en redes sociales.",
      whyItMatters: "Sin og:title, las redes sociales muestran títulos genéricos al compartir tu página.",
    });
  }

  if (!html.match(/og:image/i)) {
    issues.push({
      id: id++, category: "seo", severity: "major",
      title: "Sin Open Graph image",
      description: "No se encontró og:image para vista previa en redes sociales.",
      whyItMatters: "Sin imagen OG, las publicaciones compartidas se ven sin imagen, reduciendo engagement.",
    });
  }

  // Canonical
  if (!html.match(/rel=["']canonical["']/i)) {
    issues.push({
      id: id++, category: "seo", severity: "major",
      title: "Sin URL canónica",
      description: "No se encontró enlace rel=canonical.",
      whyItMatters: "Sin canonical, los buscadores pueden indexar versiones duplicadas de la misma página.",
    });
  }

  // Alt texts
  const imgTags = html.match(/<img[^>]*>/gi) || [];
  const imgsWithoutAlt = imgTags.filter(img => !img.match(/alt=["'][^"']+["']/i));
  if (imgsWithoutAlt.length > 0) {
    issues.push({
      id: id++, category: "seo", severity: "minor",
      title: `${imgsWithoutAlt.length} imágenes sin texto alt descriptivo`,
      description: `Se encontraron ${imgsWithoutAlt.length} imágenes sin atributo alt o con alt vacío.`,
      whyItMatters: "Las imágenes sin alt descriptivo pierden oportunidades de posicionamiento en Google Images.",
    });
  }

  return issues;
}

function checkLLM(html: string): AuditIssue[] {
  const issues: AuditIssue[] = [];
  let id = 3000;

  // Schema markup checks
  const hasSchema = html.includes("application/ld+json");
  if (!hasSchema) {
    issues.push({
      id: id++, category: "llm", severity: "critical",
      title: "Sin datos estructurados (JSON-LD)",
      description: "No se encontró ningún markup JSON-LD en la página.",
      whyItMatters: "Los sistemas de IA como ChatGPT y Gemini dependen de datos estructurados para entender y citar tu negocio.",
    });
  }

  if (!html.match(/LocalBusiness|MedicalBusiness|Physician/i)) {
    issues.push({
      id: id++, category: "llm", severity: "critical",
      title: "Sin schema de negocio médico",
      description: "No se encontró schema Physician, MedicalBusiness o LocalBusiness.",
      whyItMatters: "Los asistentes de IA no pueden verificar credenciales ni recomendar tu práctica sin datos estructurados de negocio.",
    });
  }

  if (!html.match(/FAQPage/i)) {
    issues.push({
      id: id++, category: "llm", severity: "major",
      title: "Sin schema FAQPage",
      description: "No se detectó schema FAQPage a pesar de posible contenido de preguntas frecuentes.",
      whyItMatters: "Los asistentes de IA no citarán tus respuestas FAQ sin datos FAQ estructurados.",
    });
  }

  if (!html.match(/Review|AggregateRating/i)) {
    issues.push({
      id: id++, category: "llm", severity: "major",
      title: "Sin schema de Reviews/Rating",
      description: "No se encontró schema Review o AggregateRating.",
      whyItMatters: "Los asistentes de IA usan ratings estructurados para evaluar reputación. Sin ellos, tus testimonios son invisibles.",
    });
  }

  if (!html.match(/MedicalProcedure/i)) {
    issues.push({
      id: id++, category: "llm", severity: "opportunity",
      title: "Sin schema MedicalProcedure",
      description: "No se encontró schema MedicalProcedure en las páginas de servicios.",
      whyItMatters: "El schema MedicalProcedure permite a la IA entender y citar tus servicios específicos.",
    });
  }

  return issues;
}

function checkAccessibility(html: string): AuditIssue[] {
  const issues: AuditIssue[] = [];
  let id = 4000;

  // Images without alt
  const imgTags = html.match(/<img[^>]*>/gi) || [];
  const noAlt = imgTags.filter(img => !img.match(/alt=/i));
  if (noAlt.length > 2) {
    issues.push({
      id: id++, category: "accessibility", severity: "major",
      title: `${noAlt.length} imágenes sin atributo alt`,
      description: `Se encontraron ${noAlt.length} imágenes sin ningún atributo alt.`,
      whyItMatters: "Los usuarios de lectores de pantalla no pueden entender las imágenes. Viola WCAG 2.1 AA criterio 1.1.1.",
    });
  }

  // Heading hierarchy
  const headings = html.match(/<h[1-6][^>]*>/gi) || [];
  if (headings.length > 0) {
    const levels = headings.map(h => parseInt(h[2]));
    for (let i = 1; i < levels.length; i++) {
      if (levels[i] - levels[i - 1] > 1) {
        issues.push({
          id: id++, category: "accessibility", severity: "minor",
          title: "Jerarquía de encabezados inconsistente",
          description: `Se salta de H${levels[i - 1]} a H${levels[i]} sin niveles intermedios.`,
          whyItMatters: "Los usuarios de lectores de pantalla dependen de la jerarquía para navegar el contenido.",
        });
        break;
      }
    }
  }

  // Language attribute
  if (!html.match(/<html[^>]*lang=/i)) {
    issues.push({
      id: id++, category: "accessibility", severity: "major",
      title: "Sin atributo lang en HTML",
      description: "La etiqueta <html> no tiene atributo lang definido.",
      whyItMatters: "Los lectores de pantalla necesitan el atributo lang para pronunciar el contenido correctamente.",
    });
  }

  // Skip link
  if (!html.match(/skip|saltar/i)) {
    issues.push({
      id: id++, category: "accessibility", severity: "minor",
      title: "Sin enlace skip-to-content",
      description: "No se detectó enlace para saltar al contenido principal.",
      whyItMatters: "Los usuarios de teclado deben tab por toda la navegación antes de llegar al contenido.",
    });
  }

  // ARIA landmarks
  if (!html.match(/role=["'](main|navigation|banner|contentinfo)["']/i) && !html.match(/<main|<nav|<header|<footer/i)) {
    issues.push({
      id: id++, category: "accessibility", severity: "minor",
      title: "Sin landmarks ARIA o HTML5",
      description: "No se detectaron landmarks semánticos (main, nav, header, footer).",
      whyItMatters: "Los landmarks permiten a usuarios de lectores de pantalla saltar entre secciones principales.",
    });
  }

  return issues;
}

function checkPerformance(html: string, headers: Record<string, string>, lighthouse?: LighthouseData): AuditIssue[] {
  const issues: AuditIssue[] = [];
  let id = 5000;

  // External scripts count
  const scripts = html.match(/<script[^>]*src=/gi) || [];
  if (scripts.length > 10) {
    issues.push({
      id: id++, category: "performance", severity: "major",
      title: `${scripts.length} scripts externos detectados`,
      description: `Se cargan ${scripts.length} scripts de terceros, lo que impacta el rendimiento.`,
      whyItMatters: "Cada script compite por recursos del navegador. Más de 10 scripts afectan significativamente los Core Web Vitals.",
    });
  }

  // Inline scripts size
  const inlineScripts = html.match(/<script[^>]*>[\s\S]*?<\/script>/gi) || [];
  const totalInlineSize = inlineScripts.reduce((sum, s) => sum + s.length, 0);
  if (totalInlineSize > 50000) {
    issues.push({
      id: id++, category: "performance", severity: "major",
      title: "Scripts inline excesivamente grandes",
      description: `Los scripts inline suman ${Math.round(totalInlineSize / 1024)}KB, retrasando el renderizado.`,
      whyItMatters: "Los scripts inline grandes bloquean el primer renderizado. Los visitantes ven una página en blanco.",
    });
  }

  // Font loading
  const fontLinks = html.match(/fonts\.googleapis|font-face/gi) || [];
  if (fontLinks.length > 3) {
    issues.push({
      id: id++, category: "performance", severity: "minor",
      title: "Carga excesiva de fuentes",
      description: `Se detectaron ${fontLinks.length} cargas de fuentes web.`,
      whyItMatters: "Cada fuente es una solicitud que bloquea el renderizado de texto.",
    });
  }

  // LCP check from Lighthouse
  if (lighthouse?.lcp && lighthouse.lcp > 2.5) {
    issues.push({
      id: id++, category: "performance", severity: lighthouse.lcp > 4 ? "critical" : "major",
      title: `LCP de ${lighthouse.lcp.toFixed(1)}s excede el umbral de Google`,
      description: `El Largest Contentful Paint es ${lighthouse.lcp.toFixed(1)}s. Google recomienda menos de 2.5s.`,
      whyItMatters: "Un LCP alto significa que los usuarios ven una página en blanco o sin contenido durante mucho tiempo, causando abandonos.",
    });
  }

  return issues;
}

function checkContent(html: string): AuditIssue[] {
  const issues: AuditIssue[] = [];
  let id = 6000;

  // Contact info
  if (!html.match(/horario|schedule|hours|opening/i)) {
    issues.push({
      id: id++, category: "content", severity: "major",
      title: "Sin horarios de atención visibles",
      description: "No se detectaron horarios de atención en el sitio.",
      whyItMatters: "Los pacientes potenciales no saben cuándo contactar y pueden asumir que el negocio está cerrado.",
    });
  }

  if (!html.match(/mailto:|@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/i)) {
    issues.push({
      id: id++, category: "content", severity: "major",
      title: "Sin email visible",
      description: "No se encontró dirección de email visible en el sitio.",
      whyItMatters: "Los clientes que prefieren email no tienen forma de contactar excepto un formulario genérico.",
    });
  }

  // Services/procedures page
  if (!html.match(/servicios|procedimientos|tratamientos|services|procedures/i)) {
    issues.push({
      id: id++, category: "content", severity: "opportunity",
      title: "Sin página de servicios centralizada",
      description: "No se detectó una página dedicada a servicios o procedimientos.",
      whyItMatters: "Los pacientes que buscan todos los servicios disponibles no tienen una referencia clara.",
    });
  }

  // FAQ content
  if (!html.match(/preguntas frecuentes|faq/i)) {
    issues.push({
      id: id++, category: "content", severity: "opportunity",
      title: "Sin sección de preguntas frecuentes",
      description: "No se detectó una sección de FAQ en el sitio.",
      whyItMatters: "Las FAQ responden dudas comunes y generan contenido rico para que la IA cite tu negocio.",
    });
  }

  return issues;
}

function checkTrust(html: string): AuditIssue[] {
  const issues: AuditIssue[] = [];
  let id = 7000;

  // SSL / HTTPS
  // Already checked via headers

  // Privacy policy
  if (!html.match(/privacidad|privacy|protección de datos/i)) {
    issues.push({
      id: id++, category: "trust", severity: "opportunity",
      title: "Sin aviso de privacidad visible",
      description: "No se detectó enlace a política de privacidad.",
      whyItMatters: "Los pacientes que envían información de salud esperan garantías de privacidad.",
    });
  }

  // Reviews/testimonials
  if (!html.match(/testimonios|reseñas|opiniones|reviews|testimonials/i)) {
    issues.push({
      id: id++, category: "trust", severity: "major",
      title: "Sin testimonios o reseñas visibles",
      description: "No se detectaron testimonios o reseñas de pacientes en el sitio.",
      whyItMatters: "La prueba social es crítica para decisiones médicas. Sin testimonios, los pacientes confían menos.",
    });
  }

  // Certifications
  if (!html.match(/certificad|acreditad|colegiado|certif/i)) {
    issues.push({
      id: id++, category: "trust", severity: "minor",
      title: "Sin certificaciones profesionales visibles",
      description: "No se detectaron badges o menciones de certificaciones profesionales.",
      whyItMatters: "Los logos de certificación se procesan visualmente en milisegundos y aumentan la confianza.",
    });
  }

  // Social proof
  if (!html.match(/instagram|facebook|tiktok|linkedin/i)) {
    issues.push({
      id: id++, category: "trust", severity: "minor",
      title: "Sin enlaces a redes sociales",
      description: "No se detectaron enlaces a perfiles de redes sociales.",
      whyItMatters: "Las redes sociales activas refuerzan la credibilidad y permiten verificar la actividad del negocio.",
    });
  }

  return issues;
}

function checkTechnical(html: string, headers: Record<string, string>): AuditIssue[] {
  const issues: AuditIssue[] = [];
  let id = 8000;

  // Security headers
  const securityHeaders = ["content-security-policy", "x-frame-options", "x-content-type-options"];
  const missingHeaders = securityHeaders.filter(h => !headers[h]);
  if (missingHeaders.length > 0) {
    issues.push({
      id: id++, category: "technical", severity: "major",
      title: `${missingHeaders.length} headers de seguridad faltantes`,
      description: `No se detectaron: ${missingHeaders.join(", ")}`,
      whyItMatters: "Los headers faltantes dejan el sitio vulnerable a ataques XSS y clickjacking.",
    });
  }

  // HTTPS
  if (!headers["strict-transport-security"]) {
    issues.push({
      id: id++, category: "technical", severity: "minor",
      title: "Sin header HSTS",
      description: "No se detectó Strict-Transport-Security header.",
      whyItMatters: "Sin HSTS, los usuarios pueden acceder accidentalmente a una versión HTTP insegura.",
    });
  }

  // sitemap
  if (!html.match(/sitemap/i)) {
    issues.push({
      id: id++, category: "technical", severity: "minor",
      title: "Sin referencia a sitemap",
      description: "No se detectó referencia a sitemap.xml en el HTML.",
      whyItMatters: "Un sitemap ayuda a los buscadores a descubrir todas tus páginas.",
    });
  }

  // Analytics overlap
  const analytics = [];
  if (html.match(/google-analytics|gtag|googletagmanager/i)) analytics.push("Google Analytics");
  if (html.match(/facebook.*pixel|fbq/i)) analytics.push("Facebook Pixel");
  if (html.match(/clarity/i)) analytics.push("Microsoft Clarity");
  if (html.match(/hotjar/i)) analytics.push("Hotjar");
  if (analytics.length > 2) {
    issues.push({
      id: id++, category: "technical", severity: "minor",
      title: `${analytics.length} servicios de analytics superpuestos`,
      description: `Se detectaron: ${analytics.join(", ")}`,
      whyItMatters: "Múltiples analytics disparan eventos duplicados e impactan el rendimiento.",
    });
  }

  // robots.txt reference
  if (!html.match(/robots/i)) {
    issues.push({
      id: id++, category: "technical", severity: "minor",
      title: "Sin referencia a robots.txt",
      description: "No se detectó configuración de robots.txt.",
      whyItMatters: "Sin robots.txt, los crawlers pueden indexar páginas no deseadas.",
    });
  }

  return issues;
}

// ---- MAIN ANALYZER ----

const CATEGORY_META: Record<CategoryKey, { label: string; icon: string }> = {
  mobile: { label: "Mobile y Responsividad", icon: "📱" },
  seo: { label: "SEO y Visibilidad en Búsquedas", icon: "🔍" },
  llm: { label: "LLM y Preparación para IA", icon: "🤖" },
  accessibility: { label: "Accesibilidad (WCAG 2.1 AA)", icon: "♿" },
  performance: { label: "Rendimiento", icon: "⚡" },
  content: { label: "Contenido y Arquitectura", icon: "📄" },
  trust: { label: "Confianza y Credibilidad", icon: "🛡️" },
  technical: { label: "Implementación Técnica", icon: "⚙️" },
};

export function analyzeWebsite(input: AnalysisInput): AnalysisResult {
  const { html, url, headers, lighthouseData } = input;

  // Run all checks
  const allIssues: AuditIssue[] = [
    ...checkMobile(html),
    ...checkSEO(html, url),
    ...checkLLM(html),
    ...checkAccessibility(html),
    ...checkPerformance(html, headers, lighthouseData),
    ...checkContent(html),
    ...checkTrust(html),
    ...checkTechnical(html, headers),
  ];

  // Count by severity
  const criticalCount = allIssues.filter(i => i.severity === "critical").length;
  const majorCount = allIssues.filter(i => i.severity === "major").length;
  const minorCount = allIssues.filter(i => i.severity === "minor").length;
  const oppsCount = allIssues.filter(i => i.severity === "opportunity").length;

  // Calculate category scores
  const categoryKeys: CategoryKey[] = ["mobile", "seo", "llm", "accessibility", "performance", "content", "trust", "technical"];

  const categories = categoryKeys.map(key => {
    const catIssues = allIssues.filter(i => i.category === key);
    const criticals = catIssues.filter(i => i.severity === "critical").length;
    const majors = catIssues.filter(i => i.severity === "major").length;
    const minors = catIssues.filter(i => i.severity === "minor").length;
    const opps = catIssues.filter(i => i.severity === "opportunity").length;

    // Score calculation: start at 100, deduct per issue type
    let score = 100 - (criticals * 25) - (majors * 10) - (minors * 4) - (opps * 2);

    // Use lighthouse data if available
    if (key === "performance" && lighthouseData?.performanceScore) {
      score = Math.round((score + lighthouseData.performanceScore * 100) / 2);
    }
    if (key === "seo" && lighthouseData?.seoScore) {
      score = Math.round((score + lighthouseData.seoScore * 100) / 2);
    }
    if (key === "accessibility" && lighthouseData?.accessibilityScore) {
      score = Math.round((score + lighthouseData.accessibilityScore * 100) / 2);
    }

    score = Math.max(0, Math.min(100, score));

    return {
      key,
      label: CATEGORY_META[key].label,
      score,
      issueCount: catIssues.length,
      icon: CATEGORY_META[key].icon,
    };
  });

  const overallScore = Math.round(categories.reduce((sum, c) => sum + c.score, 0) / categories.length);
  const overallGrade = scoreToGrade(overallScore);

  // Generate summary
  const worstCategories = categories
    .sort((a, b) => a.score - b.score)
    .slice(0, 3)
    .map(c => `${c.label} (${c.score}/100)`)
    .join(", ");

  const summary = `Se han identificado ${allIssues.length} problemas en 8 categorías. Las áreas más críticas incluyen ${worstCategories}. ${criticalCount > 0 ? `Hay ${criticalCount} problemas críticos que requieren atención inmediata.` : ""} El sitio necesita optimización para competir efectivamente en el panorama digital actual y ser descubierto por asistentes de IA.`;

  return {
    overallScore,
    overallGrade,
    totalIssues: allIssues.length,
    criticalCount,
    majorCount,
    minorCount,
    oppsCount,
    categories: categories.sort((a, b) => {
      const order: CategoryKey[] = ["mobile", "seo", "llm", "accessibility", "performance", "content", "trust", "technical"];
      return order.indexOf(a.key) - order.indexOf(b.key);
    }),
    issues: allIssues,
    vitals: {
      lcp: lighthouseData?.lcp ?? null,
      cls: lighthouseData?.cls ?? null,
      inp: lighthouseData?.inp ?? null,
    },
    summary,
  };
}

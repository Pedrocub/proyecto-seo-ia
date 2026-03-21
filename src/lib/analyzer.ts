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
    issues.push({ id: id++, category: "mobile", severity: "critical", title: "Sin meta viewport configurado", description: "No se encontró la etiqueta meta viewport con width=device-width.", whyItMatters: "Sin viewport configurado, el sitio no se adapta a móviles. Google penaliza sitios no mobile-friendly en rankings." });
  }

  const titleMatch = html.match(/<title[^>]*>([^<]*)<\/title>/i);
  if (titleMatch && titleMatch[1].length > 60) {
    issues.push({ id: id++, category: "mobile", severity: "minor", title: "Título demasiado largo para móvil", description: `El título tiene ${titleMatch[1].length} caracteres y se truncará en resultados móviles.`, whyItMatters: "Los títulos truncados en móvil se ven menos profesionales y reducen el CTR." });
  }

  if (!html.match(/href=["']tel:/i)) {
    issues.push({ id: id++, category: "mobile", severity: "major", title: "Sin botón click-to-call", description: "No se detectó enlace telefónico tap-to-call para usuarios móviles.", whyItMatters: "El 60% de las búsquedas de salud son en móvil. Sin click-to-call, los pacientes deben copiar el número manualmente." });
  }

  if (!html.match(/position:\s*(sticky|fixed)/i)) {
    issues.push({ id: id++, category: "mobile", severity: "major", title: "Sin CTA sticky o menú fijo en móvil", description: "No se detectó ningún elemento con position sticky o fixed.", whyItMatters: "Un CTA sticky permite contactar sin hacer scroll. Los competidores con CTA fijo convierten hasta 3x más." });
  }

  // Check for responsive images
  if (!html.match(/srcset=/i) && !html.match(/picture>/i)) {
    issues.push({ id: id++, category: "mobile", severity: "major", title: "Sin imágenes responsivas (srcset)", description: "No se detectaron imágenes con srcset o elementos <picture> para diferentes tamaños de pantalla.", whyItMatters: "Sin imágenes responsivas, los móviles descargan imágenes de escritorio completas, desperdiciando datos y ralentizando la carga." });
  }

  // Touch target sizes
  const smallLinks = html.match(/<a[^>]*style="[^"]*font-size:\s*(\d+)px/gi) || [];
  if (smallLinks.length > 0) {
    issues.push({ id: id++, category: "mobile", severity: "minor", title: "Posibles targets táctiles pequeños", description: "Se detectaron enlaces con estilos de fuente inline que podrían ser demasiado pequeños para táctil.", whyItMatters: "Google requiere targets táctiles de mínimo 48x48px. Los elementos pequeños causan clics accidentales." });
  }

  // Check for mobile-unfriendly tables
  if (html.match(/<table/i) && !html.match(/overflow-x|table-responsive|scroll/i)) {
    issues.push({ id: id++, category: "mobile", severity: "minor", title: "Tablas sin scroll horizontal en móvil", description: "Se detectaron tablas HTML sin contenedor de scroll para móvil.", whyItMatters: "Las tablas anchas rompen el layout en pantallas pequeñas, obligando al usuario a hacer zoom." });
  }

  // Popup/modal check
  if (html.match(/popup|modal|overlay/i) && !html.match(/media.*max-width|responsive.*popup/i)) {
    issues.push({ id: id++, category: "mobile", severity: "minor", title: "Popups potencialmente intrusivos en móvil", description: "Se detectaron popups/modales que podrían no estar optimizados para pantallas pequeñas.", whyItMatters: "Google penaliza intersticiales intrusivos en móvil. Los popups que cubren el contenido dañan la experiencia." });
  }

  return issues;
}

function checkSEO(html: string, url: string): AuditIssue[] {
  const issues: AuditIssue[] = [];
  let id = 2000;

  // Title tag
  const titleMatch = html.match(/<title[^>]*>([^<]*)<\/title>/i);
  if (!titleMatch || !titleMatch[1].trim()) {
    issues.push({ id: id++, category: "seo", severity: "critical", title: "Sin etiqueta title o title vacío", description: "No se encontró etiqueta <title> válida en la página.", whyItMatters: "El title es el factor on-page más importante para SEO. Sin él, Google genera un título automático que rara vez es óptimo." });
  } else if (titleMatch[1].length > 65) {
    issues.push({ id: id++, category: "seo", severity: "critical", title: "Título de página demasiado largo", description: `El título tiene ${titleMatch[1].length} caracteres, excediendo el límite recomendado de 60 caracteres.`, whyItMatters: "Google trunca los títulos más allá de ~60 caracteres. El nombre del negocio y diferenciadores clave se cortan, reduciendo CTR." });
  } else if (titleMatch[1].length < 20) {
    issues.push({ id: id++, category: "seo", severity: "major", title: "Título de página demasiado corto", description: `El título tiene solo ${titleMatch[1].length} caracteres. Debería tener entre 30-60.`, whyItMatters: "Los títulos muy cortos desaprovechan espacio valioso en los resultados de búsqueda para incluir palabras clave." });
  }

  // Meta description
  const metaDesc = html.match(/meta\s+name=["']description["']\s+content=["']([^"']*)["']/i);
  if (!metaDesc) {
    issues.push({ id: id++, category: "seo", severity: "major", title: "Sin meta description", description: "No se encontró la meta description en la página.", whyItMatters: "La meta description aparece en los resultados de búsqueda. Sin ella, Google genera un snippet aleatorio." });
  } else if (metaDesc[1].length > 160) {
    issues.push({ id: id++, category: "seo", severity: "minor", title: "Meta description demasiado larga", description: `La meta description tiene ${metaDesc[1].length} caracteres. Se recomienda máximo 155.`, whyItMatters: "Google trunca descriptions largas, perdiendo el mensaje clave." });
  } else if (metaDesc[1].length < 70) {
    issues.push({ id: id++, category: "seo", severity: "minor", title: "Meta description demasiado corta", description: `La meta description tiene solo ${metaDesc[1].length} caracteres. Se recomiendan 120-155.`, whyItMatters: "Las descriptions cortas desaprovechan espacio para convencer al usuario de hacer clic." });
  }

  // H1 tags
  const h1Matches = html.match(/<h1[^>]*>/gi);
  if (!h1Matches) {
    issues.push({ id: id++, category: "seo", severity: "critical", title: "Sin encabezado H1", description: "No se encontró etiqueta H1 en la página.", whyItMatters: "El H1 indica a los buscadores el tema principal. Sin H1, Google pierde la señal más fuerte de relevancia temática." });
  } else if (h1Matches.length > 1) {
    issues.push({ id: id++, category: "seo", severity: "major", title: `${h1Matches.length} etiquetas H1 en la misma página`, description: `Se encontraron ${h1Matches.length} etiquetas H1, diluyendo la señal de tema principal.`, whyItMatters: "Múltiples H1 confunden a Google sobre el tema principal de la página, debilitando el ranking para todas las keywords." });
  }

  // Open Graph
  if (!html.match(/og:title/i)) {
    issues.push({ id: id++, category: "seo", severity: "major", title: "Sin Open Graph title", description: "No se encontró og:title para compartir en redes sociales.", whyItMatters: "Sin og:title, las redes sociales muestran títulos genéricos como 'Home' o la URL, reduciendo clics." });
  }
  if (!html.match(/og:description/i)) {
    issues.push({ id: id++, category: "seo", severity: "minor", title: "Sin Open Graph description", description: "No se encontró og:description.", whyItMatters: "Sin descripción OG, las publicaciones compartidas muestran texto aleatorio de la página." });
  }
  if (!html.match(/og:image/i)) {
    issues.push({ id: id++, category: "seo", severity: "major", title: "Sin Open Graph image", description: "No se encontró og:image para vista previa en redes sociales.", whyItMatters: "Las publicaciones sin imagen obtienen 80% menos engagement que las que tienen imagen de vista previa." });
  }

  // Canonical
  if (!html.match(/rel=["']canonical["']/i)) {
    issues.push({ id: id++, category: "seo", severity: "major", title: "Sin URL canónica", description: "No se encontró enlace rel=canonical.", whyItMatters: "Sin canonical, Google puede indexar versiones duplicadas (www/no-www, http/https, con/sin trailing slash)." });
  }

  // Alt texts
  const imgTags = html.match(/<img[^>]*>/gi) || [];
  const imgsWithoutAlt = imgTags.filter(img => !img.match(/alt=["'][^"']+["']/i));
  if (imgsWithoutAlt.length > 3) {
    issues.push({ id: id++, category: "seo", severity: "major", title: `${imgsWithoutAlt.length} imágenes sin texto alt descriptivo`, description: `De ${imgTags.length} imágenes, ${imgsWithoutAlt.length} no tienen atributo alt o tienen alt vacío.`, whyItMatters: "Las imágenes sin alt pierden posicionamiento en Google Images y violan accesibilidad WCAG." });
  } else if (imgsWithoutAlt.length > 0) {
    issues.push({ id: id++, category: "seo", severity: "minor", title: `${imgsWithoutAlt.length} imágenes sin texto alt`, description: `Se encontraron ${imgsWithoutAlt.length} imágenes sin atributo alt descriptivo.`, whyItMatters: "Cada imagen sin alt es una oportunidad perdida de posicionamiento en Google Images." });
  }

  // Hreflang for multilingual
  if (html.match(/translate|idioma|language/i) && !html.match(/hreflang/i)) {
    issues.push({ id: id++, category: "seo", severity: "minor", title: "Sin etiquetas hreflang para contenido multilingüe", description: "El sitio parece tener contenido en múltiples idiomas pero sin hreflang.", whyItMatters: "Sin hreflang, Google puede mostrar la versión incorrecta del idioma a los usuarios." });
  }

  // Internal linking
  const internalLinks = (html.match(/<a[^>]*href=["']\/[^"']*["']/gi) || []).length;
  if (internalLinks < 5) {
    issues.push({ id: id++, category: "seo", severity: "major", title: "Enlazado interno insuficiente", description: `Solo se detectaron ${internalLinks} enlaces internos en la página.`, whyItMatters: "El enlazado interno distribuye autoridad SEO entre páginas. Menos de 5 enlaces indica una estructura pobre." });
  }

  // Twitter Card
  if (!html.match(/twitter:card/i)) {
    issues.push({ id: id++, category: "seo", severity: "minor", title: "Sin Twitter Card meta tags", description: "No se detectaron meta tags de Twitter Card.", whyItMatters: "Las Twitter Cards mejoran la apariencia de enlaces compartidos en X/Twitter." });
  }

  return issues;
}

function checkLLM(html: string): AuditIssue[] {
  const issues: AuditIssue[] = [];
  let id = 3000;

  const hasSchema = html.includes("application/ld+json");
  if (!hasSchema) {
    issues.push({ id: id++, category: "llm", severity: "critical", title: "Sin datos estructurados (JSON-LD)", description: "No se encontró ningún markup JSON-LD en la página.", whyItMatters: "Los sistemas de IA como ChatGPT y Gemini dependen de datos estructurados para entender y citar tu negocio. Sin JSON-LD, eres invisible para la IA." });
  }

  if (!html.match(/LocalBusiness|MedicalBusiness|Physician|HealthAndBeautyBusiness/i)) {
    issues.push({ id: id++, category: "llm", severity: "critical", title: "Sin schema de negocio médico/estético", description: "No se encontró schema Physician, MedicalBusiness, HealthAndBeautyBusiness o LocalBusiness.", whyItMatters: "Los asistentes de IA no pueden verificar credenciales ni ubicación. Cuando un paciente pregunta '¿Cuál es la mejor clínica estética?', tu competencia con schema será citada primero." });
  }

  if (!html.match(/FAQPage/i)) {
    issues.push({ id: id++, category: "llm", severity: "critical", title: "Sin schema FAQPage", description: "No se detectó schema FAQPage. Las preguntas frecuentes sin marcado estructurado son invisibles para IA.", whyItMatters: "Cuando un paciente pregunta a ChatGPT sobre un tratamiento, solo cita respuestas de sitios con schema FAQ. Sin él, tus respuestas no existen para la IA." });
  }

  if (!html.match(/Review|AggregateRating/i)) {
    issues.push({ id: id++, category: "llm", severity: "major", title: "Sin schema de Reviews/Rating", description: "No se encontró schema Review o AggregateRating para validar reputación.", whyItMatters: "Los asistentes de IA usan ratings estructurados para evaluar y comparar clínicas. Sin ellos, tu reputación online es invisible." });
  }

  if (!html.match(/MedicalProcedure|Service|Offer/i)) {
    issues.push({ id: id++, category: "llm", severity: "major", title: "Sin schema de servicios/procedimientos", description: "No se encontró schema MedicalProcedure, Service o Offer.", whyItMatters: "La IA no puede listar tus servicios específicos cuando un paciente pregunta '¿Dónde puedo hacerme bótox en Madrid?'" });
  }

  // llms.txt
  issues.push({ id: id++, category: "llm", severity: "major", title: "Sin archivo llms.txt", description: "No se detectó archivo llms.txt (protocolo emergente para indicar a crawlers de IA el propósito del sitio).", whyItMatters: "Los early adopters de llms.txt ganan ventajas de descubribilidad frente a los crawlers de IA." });

  // Author attribution
  if (html.match(/blog|artículo|article/i) && !html.match(/author|autor/i)) {
    issues.push({ id: id++, category: "llm", severity: "major", title: "Contenido sin atribución de autor", description: "Se detectó contenido de blog/artículos sin atribución visible de autor profesional.", whyItMatters: "Las directrices E-E-A-T de Google y los sistemas de IA priorizan contenido médico con autoría verificable." });
  }

  // Structured address
  if (!html.match(/PostalAddress|streetAddress|addressLocality/i)) {
    issues.push({ id: id++, category: "llm", severity: "major", title: "Sin dirección estructurada en schema", description: "La dirección del negocio no está en formato de datos estructurados.", whyItMatters: "Sin dirección estructurada, la IA no puede verificar tu ubicación ni recomendar tu clínica para búsquedas locales." });
  }

  // Opening hours in schema
  if (!html.match(/openingHours|OpeningHoursSpecification/i)) {
    issues.push({ id: id++, category: "llm", severity: "minor", title: "Sin horarios en datos estructurados", description: "Los horarios de apertura no están incluidos en el schema.", whyItMatters: "Los asistentes de IA no pueden informar si estás abierto cuando un paciente pregunta." });
  }

  // Pricing info structured
  if (!html.match(/priceRange|price|offers/i)) {
    issues.push({ id: id++, category: "llm", severity: "opportunity", title: "Sin información de precios estructurada", description: "No se detectó información de precios o rango de precios en datos estructurados.", whyItMatters: "La IA no puede responder preguntas sobre costes de tratamientos sin datos de precios." });
  }

  return issues;
}

function checkAccessibility(html: string, lighthouse?: LighthouseData): AuditIssue[] {
  const issues: AuditIssue[] = [];
  let id = 4000;

  // Images without alt
  const imgTags = html.match(/<img[^>]*>/gi) || [];
  const noAlt = imgTags.filter(img => !img.match(/alt=/i));
  if (noAlt.length > 2) {
    issues.push({ id: id++, category: "accessibility", severity: "critical", title: `${noAlt.length} imágenes sin atributo alt`, description: `Se encontraron ${noAlt.length} de ${imgTags.length} imágenes sin ningún atributo alt. Viola WCAG 2.1 AA criterio 1.1.1.`, whyItMatters: "Los usuarios de lectores de pantalla no pueden entender las imágenes. Es una violación directa de accesibilidad que Google penaliza." });
  } else if (noAlt.length > 0) {
    issues.push({ id: id++, category: "accessibility", severity: "major", title: `${noAlt.length} imágenes sin atributo alt`, description: `Se encontraron ${noAlt.length} imágenes sin atributo alt.`, whyItMatters: "Cada imagen sin alt excluye a usuarios con discapacidad visual." });
  }

  // Generic alt texts
  const genericAlts = imgTags.filter(img => img.match(/alt=["'](image|img|foto|photo|picture|banner|logo|icon|null|undefined|\d+)["']/i));
  if (genericAlts.length > 0) {
    issues.push({ id: id++, category: "accessibility", severity: "major", title: `${genericAlts.length} imágenes con alt text genérico`, description: "Se encontraron imágenes con textos alt como 'image', 'foto', 'banner' que no son descriptivos.", whyItMatters: "Los alt texts genéricos son casi tan malos como no tener alt. Los lectores de pantalla repiten 'image' sin contexto." });
  }

  // Heading hierarchy
  const headings = html.match(/<h[1-6][^>]*>/gi) || [];
  if (headings.length > 0) {
    const levels = headings.map(h => parseInt(h.charAt(h.indexOf('h') + 1) || h[2]));
    for (let i = 1; i < levels.length; i++) {
      if (levels[i] - levels[i - 1] > 1) {
        issues.push({ id: id++, category: "accessibility", severity: "major", title: "Jerarquía de encabezados rota", description: `Se salta de H${levels[i - 1]} a H${levels[i]} sin niveles intermedios.`, whyItMatters: "Los usuarios de lectores de pantalla dependen de la jerarquía para navegar. Los saltos hacen el contenido confuso." });
        break;
      }
    }
  }

  // Language attribute
  if (!html.match(/<html[^>]*lang=/i)) {
    issues.push({ id: id++, category: "accessibility", severity: "critical", title: "Sin atributo lang en HTML", description: "La etiqueta <html> no tiene atributo lang definido.", whyItMatters: "Los lectores de pantalla necesitan lang para pronunciar correctamente. Sin él, todo el contenido puede leerse con acento incorrecto." });
  }

  // Skip link
  if (!html.match(/skip|saltar/i)) {
    issues.push({ id: id++, category: "accessibility", severity: "major", title: "Sin enlace skip-to-content", description: "No se detectó enlace para saltar al contenido principal.", whyItMatters: "Los usuarios de teclado deben tabular por toda la navegación repetidamente sin este enlace." });
  }

  // ARIA landmarks
  if (!html.match(/role=["'](main|navigation|banner|contentinfo)["']/i) && !html.match(/<main[\s>]/i)) {
    issues.push({ id: id++, category: "accessibility", severity: "major", title: "Sin landmarks semánticos", description: "No se detectaron landmarks HTML5 (main, nav, header, footer) o roles ARIA.", whyItMatters: "Los landmarks permiten a usuarios de lectores de pantalla saltar entre secciones sin tabular todo." });
  }

  // Form labels
  const inputs = html.match(/<input[^>]*>/gi) || [];
  const inputsWithoutLabel = inputs.filter(inp =>
    !inp.match(/type=["'](hidden|submit|button|reset)["']/i) &&
    !inp.match(/aria-label/i) &&
    !inp.match(/id=/i)
  );
  if (inputsWithoutLabel.length > 0) {
    issues.push({ id: id++, category: "accessibility", severity: "major", title: `${inputsWithoutLabel.length} campos de formulario sin label`, description: "Se detectaron campos de formulario sin labels asociados o aria-label.", whyItMatters: "Los usuarios de lectores de pantalla no saben qué información introducir en campos sin label." });
  }

  // Contrast - check for light colors on light backgrounds
  if (html.match(/color:\s*#[cdef][cdef][cdef]/i) || html.match(/color:\s*#[89ab][89ab][89ab]/i)) {
    issues.push({ id: id++, category: "accessibility", severity: "minor", title: "Posible bajo contraste de texto", description: "Se detectaron colores de texto claros que podrían no cumplir la ratio de contraste 4.5:1.", whyItMatters: "El texto con bajo contraste es difícil de leer para personas con visión reducida. Viola WCAG 2.1 AA criterio 1.4.3." });
  }

  // Use Lighthouse accessibility score
  if (lighthouse?.accessibilityScore && lighthouse.accessibilityScore < 0.9) {
    issues.push({ id: id++, category: "accessibility", severity: "major", title: `Puntuación de accesibilidad Lighthouse: ${Math.round(lighthouse.accessibilityScore * 100)}/100`, description: `Google Lighthouse detectó problemas de accesibilidad significativos con una puntuación de ${Math.round(lighthouse.accessibilityScore * 100)}/100.`, whyItMatters: "Una puntuación por debajo de 90 indica múltiples problemas de accesibilidad que afectan a usuarios con discapacidad." });
  }

  return issues;
}

function checkPerformance(html: string, headers: Record<string, string>, lighthouse?: LighthouseData): AuditIssue[] {
  const issues: AuditIssue[] = [];
  let id = 5000;

  // External scripts count
  const scripts = html.match(/<script[^>]*src=/gi) || [];
  if (scripts.length > 15) {
    issues.push({ id: id++, category: "performance", severity: "critical", title: `${scripts.length} scripts externos — carga excesiva`, description: `Se cargan ${scripts.length} scripts de terceros, impactando gravemente el rendimiento.`, whyItMatters: "Cada script compite por recursos. Más de 15 scripts prácticamente garantizan Core Web Vitals fallidos." });
  } else if (scripts.length > 8) {
    issues.push({ id: id++, category: "performance", severity: "major", title: `${scripts.length} scripts externos detectados`, description: `Se cargan ${scripts.length} scripts de terceros.`, whyItMatters: "Más de 8 scripts de terceros degradan significativamente la interactividad y el tiempo de carga." });
  }

  // Inline scripts size
  const inlineScripts = html.match(/<script[^>]*>[\s\S]*?<\/script>/gi) || [];
  const totalInlineSize = inlineScripts.reduce((sum, s) => sum + s.length, 0);
  if (totalInlineSize > 100000) {
    issues.push({ id: id++, category: "performance", severity: "critical", title: "Scripts inline masivos", description: `Los scripts inline suman ${Math.round(totalInlineSize / 1024)}KB, bloqueando el renderizado.`, whyItMatters: "Scripts inline de más de 100KB bloquean el primer renderizado. Los visitantes ven página en blanco." });
  } else if (totalInlineSize > 30000) {
    issues.push({ id: id++, category: "performance", severity: "major", title: "Scripts inline grandes", description: `Los scripts inline suman ${Math.round(totalInlineSize / 1024)}KB.`, whyItMatters: "Los scripts inline grandes retrasan el primer renderizado significativamente." });
  }

  // HTML size
  if (html.length > 500000) {
    issues.push({ id: id++, category: "performance", severity: "major", title: "HTML excesivamente grande", description: `El HTML de la página pesa ${Math.round(html.length / 1024)}KB.`, whyItMatters: "Un HTML muy grande ralentiza el parsing del navegador y consume memoria." });
  }

  // Font loading
  const fontLinks = html.match(/fonts\.googleapis|font-face|woff2?/gi) || [];
  if (fontLinks.length > 4) {
    issues.push({ id: id++, category: "performance", severity: "major", title: `Carga excesiva de fuentes (${fontLinks.length} detectadas)`, description: `Se detectaron ${fontLinks.length} cargas de fuentes web.`, whyItMatters: "Cada fuente es una solicitud adicional que bloquea el renderizado de texto. El usuario ve texto invisible (FOIT)." });
  } else if (fontLinks.length > 2) {
    issues.push({ id: id++, category: "performance", severity: "minor", title: `${fontLinks.length} fuentes web cargadas`, description: `Se cargan ${fontLinks.length} fuentes diferentes.`, whyItMatters: "Cada fuente adicional añade latencia al primer renderizado de texto." });
  }

  // Unoptimized images
  const jpgPngs = (html.match(/\.(jpg|jpeg|png|bmp)/gi) || []).length;
  const webpAvifs = (html.match(/\.(webp|avif)/gi) || []).length;
  if (jpgPngs > 5 && webpAvifs === 0) {
    issues.push({ id: id++, category: "performance", severity: "major", title: "Imágenes en formato no optimizado", description: `Se detectaron ${jpgPngs} imágenes en JPG/PNG sin alternativas WebP o AVIF.`, whyItMatters: "WebP reduce el tamaño de imagen un 30% vs JPG. En una web con muchas imágenes, esto significa segundos de diferencia." });
  }

  // Lazy loading
  if (imgTags(html) > 5 && !html.match(/loading=["']lazy["']/i) && !html.match(/lazyload|lazy-load/i)) {
    issues.push({ id: id++, category: "performance", severity: "major", title: "Sin lazy loading de imágenes", description: "No se detectó lazy loading en las imágenes. Todas se cargan al inicio.", whyItMatters: "Sin lazy loading, todas las imágenes se descargan al entrar, ralentizando la carga inicial de la página." });
  }

  // LCP from Lighthouse
  if (lighthouse?.lcp) {
    if (lighthouse.lcp > 4) {
      issues.push({ id: id++, category: "performance", severity: "critical", title: `LCP de ${lighthouse.lcp}s — muy lento`, description: `El Largest Contentful Paint es ${lighthouse.lcp}s. Google requiere menos de 2.5s para "bueno" y menos de 4s para "necesita mejora".`, whyItMatters: "Un LCP mayor a 4s se considera pobre. Los usuarios abandonan y Google penaliza el ranking." });
    } else if (lighthouse.lcp > 2.5) {
      issues.push({ id: id++, category: "performance", severity: "major", title: `LCP de ${lighthouse.lcp}s excede el umbral de Google`, description: `El Largest Contentful Paint es ${lighthouse.lcp}s. Google recomienda menos de 2.5s.`, whyItMatters: "Un LCP entre 2.5-4s necesita mejora según Google. Afecta tanto la experiencia como el ranking." });
    }
  }

  // CLS from Lighthouse
  if (lighthouse?.cls && lighthouse.cls > 0.1) {
    issues.push({ id: id++, category: "performance", severity: lighthouse.cls > 0.25 ? "critical" : "major", title: `CLS de ${lighthouse.cls.toFixed(2)} — layout inestable`, description: `El Cumulative Layout Shift es ${lighthouse.cls.toFixed(2)}. Google requiere menos de 0.1 para "bueno".`, whyItMatters: "Los elementos que se mueven mientras la página carga causan clics accidentales. Google penaliza CLS alto." });
  }

  // INP from Lighthouse
  if (lighthouse?.inp && lighthouse.inp > 200) {
    issues.push({ id: id++, category: "performance", severity: lighthouse.inp > 500 ? "critical" : "major", title: `INP de ${lighthouse.inp}ms — interactividad lenta`, description: `El Interaction to Next Paint es ${lighthouse.inp}ms. Google requiere menos de 200ms.`, whyItMatters: "Los usuarios sienten que el sitio es lento al hacer clic. Google penaliza INP alto en rankings." });
  }

  // Lighthouse performance score
  if (lighthouse?.performanceScore) {
    if (lighthouse.performanceScore < 0.5) {
      issues.push({ id: id++, category: "performance", severity: "critical", title: `Lighthouse Performance: ${Math.round(lighthouse.performanceScore * 100)}/100`, description: `Google Lighthouse califica el rendimiento con ${Math.round(lighthouse.performanceScore * 100)}/100 — nivel pobre.`, whyItMatters: "Una puntuación Lighthouse inferior a 50 indica problemas graves de rendimiento que afectan directamente al SEO." });
    } else if (lighthouse.performanceScore < 0.75) {
      issues.push({ id: id++, category: "performance", severity: "major", title: `Lighthouse Performance: ${Math.round(lighthouse.performanceScore * 100)}/100`, description: `Google Lighthouse califica el rendimiento con ${Math.round(lighthouse.performanceScore * 100)}/100 — necesita mejora.`, whyItMatters: "Una puntuación entre 50-74 indica que el rendimiento está impactando la experiencia de usuario y el ranking." });
    }
  }

  // Compression
  if (!headers["content-encoding"]?.match(/gzip|br|deflate/i)) {
    issues.push({ id: id++, category: "performance", severity: "major", title: "Sin compresión de respuesta (gzip/brotli)", description: "El servidor no envía respuestas comprimidas.", whyItMatters: "Sin compresión, los usuarios descargan 3-5x más datos de lo necesario, especialmente impactante en móviles." });
  }

  return issues;
}

function imgTags(html: string): number {
  return (html.match(/<img[^>]*>/gi) || []).length;
}

function checkContent(html: string): AuditIssue[] {
  const issues: AuditIssue[] = [];
  let id = 6000;

  // Contact info
  if (!html.match(/horario|schedule|hours|opening|lunes|monday/i)) {
    issues.push({ id: id++, category: "content", severity: "major", title: "Sin horarios de atención visibles", description: "No se detectaron horarios de atención en el sitio.", whyItMatters: "Los pacientes potenciales no saben cuándo pueden contactar. 'Clínica Bella — ¿estará abierta?' se pierde." });
  }

  if (!html.match(/mailto:|email|correo/i)) {
    issues.push({ id: id++, category: "content", severity: "major", title: "Sin email de contacto visible", description: "No se encontró dirección de email o enlace mailto visible.", whyItMatters: "Los pacientes que prefieren email no tienen alternativa al formulario genérico." });
  }

  if (!html.match(/href=["']tel:/i) && !html.match(/\+34|\(\d{3}\)|\d{3}[\s.-]\d{3}/)) {
    issues.push({ id: id++, category: "content", severity: "major", title: "Sin teléfono visible", description: "No se detectó número de teléfono visible en la página.", whyItMatters: "El teléfono es el método de contacto preferido para citas médicas. Sin él, los pacientes se van a la competencia." });
  }

  // Address
  if (!html.match(/dirección|address|calle|avda|avenida|plaza/i)) {
    issues.push({ id: id++, category: "content", severity: "major", title: "Sin dirección física visible", description: "No se detectó una dirección física del negocio en la página.", whyItMatters: "Los pacientes necesitan saber dónde está la clínica. Sin dirección, pierdes búsquedas locales 'clínica cerca de mí'." });
  }

  // Services page
  if (!html.match(/servicios|procedimientos|tratamientos|services|procedures/i)) {
    issues.push({ id: id++, category: "content", severity: "major", title: "Sin listado claro de servicios/tratamientos", description: "No se detectó una sección dedicada a servicios o tratamientos.", whyItMatters: "Los pacientes buscan tratamientos específicos. Sin una lista clara, no saben si ofreces lo que necesitan." });
  }

  // FAQ content
  if (!html.match(/preguntas frecuentes|faq|preguntas.*respuestas/i)) {
    issues.push({ id: id++, category: "content", severity: "major", title: "Sin sección de preguntas frecuentes", description: "No se detectó una sección de FAQ en el sitio.", whyItMatters: "Las FAQ resuelven dudas, generan confianza y son el contenido más citado por la IA cuando los pacientes preguntan." });
  }

  // About / Team
  if (!html.match(/equipo|team|sobre nosotros|about|quiénes somos|nuestro equipo/i)) {
    issues.push({ id: id++, category: "content", severity: "major", title: "Sin página de equipo/sobre nosotros", description: "No se detectó información sobre el equipo médico o la historia del negocio.", whyItMatters: "Los pacientes quieren saber quién les va a tratar. Sin esta info, la confianza se reduce drásticamente." });
  }

  // Blog/content
  if (!html.match(/blog|artículo|article|noticias|news/i)) {
    issues.push({ id: id++, category: "content", severity: "opportunity", title: "Sin blog o contenido educativo", description: "No se detectó sección de blog o artículos educativos.", whyItMatters: "El contenido educativo posiciona como autoridad, atrae tráfico orgánico y alimenta a la IA con información citable." });
  }

  // Pricing
  if (!html.match(/precio|tarifa|coste|cost|price|€|desde\s*\d/i)) {
    issues.push({ id: id++, category: "content", severity: "opportunity", title: "Sin información de precios o tarifas", description: "No se detectó información de precios o rangos de costes.", whyItMatters: "Los pacientes investigan precios antes de contactar. Sin transparencia de costes, contactan a competidores que sí los muestran." });
  }

  // Calls to action
  const ctas = (html.match(/reserv|cit|appointment|book|contact|consult/gi) || []).length;
  if (ctas < 2) {
    issues.push({ id: id++, category: "content", severity: "major", title: "Pocos calls-to-action visibles", description: "Se detectaron menos de 2 llamadas a la acción (reservar, consultar, contactar).", whyItMatters: "Sin CTAs claros y frecuentes, los visitantes no saben cómo dar el siguiente paso para convertirse en pacientes." });
  }

  return issues;
}

function checkTrust(html: string): AuditIssue[] {
  const issues: AuditIssue[] = [];
  let id = 7000;

  // Privacy policy
  if (!html.match(/privacidad|privacy|protección de datos|política de privacidad/i)) {
    issues.push({ id: id++, category: "trust", severity: "major", title: "Sin política de privacidad visible", description: "No se detectó enlace a política de privacidad o protección de datos.", whyItMatters: "Los pacientes que envían información de salud esperan garantías de privacidad. Además, es obligatorio por RGPD." });
  }

  // Legal notice
  if (!html.match(/aviso legal|legal notice|términos|condiciones|terms/i)) {
    issues.push({ id: id++, category: "trust", severity: "major", title: "Sin aviso legal", description: "No se detectó enlace a aviso legal o términos y condiciones.", whyItMatters: "El aviso legal es obligatorio en España. Su ausencia genera desconfianza y riesgo legal." });
  }

  // Cookie policy
  if (!html.match(/cookie|galletapolítica de cookies/i)) {
    issues.push({ id: id++, category: "trust", severity: "major", title: "Sin política de cookies", description: "No se detectó aviso de cookies o política de cookies.", whyItMatters: "La política de cookies es obligatoria por la ley europea. Su ausencia implica incumplimiento del RGPD." });
  }

  // Reviews/testimonials
  if (!html.match(/testimonios|reseñas|opiniones|reviews|testimonials/i)) {
    issues.push({ id: id++, category: "trust", severity: "critical", title: "Sin testimonios o reseñas de pacientes", description: "No se detectaron testimonios o reseñas de pacientes en el sitio.", whyItMatters: "El 84% de las personas confían tanto en reseñas online como en recomendaciones personales. Sin testimonios, la confianza cae en picado." });
  }

  // Certifications
  if (!html.match(/certificad|acreditad|colegiado|certif|titulación|cualificación/i)) {
    issues.push({ id: id++, category: "trust", severity: "major", title: "Sin certificaciones profesionales visibles", description: "No se detectaron menciones de certificaciones, acreditaciones o colegiación.", whyItMatters: "Para servicios médicos, las certificaciones son críticas. Los pacientes necesitan saber que el profesional está cualificado." });
  }

  // Social proof / social media
  if (!html.match(/instagram|facebook|tiktok|linkedin|youtube/i)) {
    issues.push({ id: id++, category: "trust", severity: "minor", title: "Sin enlaces a redes sociales", description: "No se detectaron enlaces a perfiles de redes sociales activos.", whyItMatters: "Las redes sociales activas verifican que el negocio es real y activo." });
  }

  // Google Maps / location embed
  if (!html.match(/maps\.google|google\.com\/maps|maps-embed|gmaps/i)) {
    issues.push({ id: id++, category: "trust", severity: "minor", title: "Sin mapa de ubicación embebido", description: "No se detectó un mapa de Google Maps embebido.", whyItMatters: "Un mapa embebido facilita encontrar la clínica y añade credibilidad visual de ubicación real." });
  }

  // Before/after gallery
  if (!html.match(/antes.*después|before.*after|galería|gallery|resultados/i)) {
    issues.push({ id: id++, category: "trust", severity: "opportunity", title: "Sin galería de resultados antes/después", description: "No se detectó galería de resultados o fotos de antes y después.", whyItMatters: "Las fotos de resultados son la prueba más convincente en medicina estética. Sin ellas, los pacientes no ven evidencia de tu trabajo." });
  }

  // Professional photo
  if (!html.match(/doctor|dra?\.|médico|profesional.*equipo/i)) {
    issues.push({ id: id++, category: "trust", severity: "major", title: "Sin presentación del profesional médico", description: "No se detectó presentación clara del profesional o equipo médico.", whyItMatters: "Los pacientes quieren ver y conocer a quien les va a tratar. Sin cara profesional, la confianza es mínima." });
  }

  return issues;
}

function checkTechnical(html: string, headers: Record<string, string>): AuditIssue[] {
  const issues: AuditIssue[] = [];
  let id = 8000;

  // Security headers
  const securityHeaders = ["content-security-policy", "x-frame-options", "x-content-type-options"];
  const missingHeaders = securityHeaders.filter(h => !headers[h]);
  if (missingHeaders.length === 3) {
    issues.push({ id: id++, category: "technical", severity: "critical", title: "Sin ningún header de seguridad", description: "No se detectaron headers de seguridad: CSP, X-Frame-Options, X-Content-Type-Options.", whyItMatters: "El sitio es vulnerable a ataques XSS, clickjacking e inyección de contenido. Para un negocio que recopila datos de salud, es inaceptable." });
  } else if (missingHeaders.length > 0) {
    issues.push({ id: id++, category: "technical", severity: "major", title: `${missingHeaders.length} headers de seguridad faltantes`, description: `No se detectaron: ${missingHeaders.join(", ")}`, whyItMatters: "Los headers faltantes dejan el sitio vulnerable a ataques comunes." });
  }

  // HSTS
  if (!headers["strict-transport-security"]) {
    issues.push({ id: id++, category: "technical", severity: "major", title: "Sin header HSTS", description: "No se detectó Strict-Transport-Security header.", whyItMatters: "Sin HSTS, los usuarios pueden acceder por HTTP inseguro y los datos pueden ser interceptados." });
  }

  // sitemap
  issues.push({ id: id++, category: "technical", severity: "minor", title: "Verificar sitemap.xml", description: "No se puede verificar la existencia de sitemap.xml solo analizando el HTML.", whyItMatters: "Un sitemap ayuda a Google a descubrir todas las páginas del sitio." });

  // robots.txt
  issues.push({ id: id++, category: "technical", severity: "minor", title: "Verificar robots.txt", description: "No se puede verificar la configuración de robots.txt solo analizando el HTML.", whyItMatters: "Un robots.txt mal configurado puede bloquear el rastreo de páginas importantes." });

  // Analytics
  const analytics = [];
  if (html.match(/google-analytics|gtag|googletagmanager/i)) analytics.push("Google Analytics/GTM");
  if (html.match(/facebook.*pixel|fbq/i)) analytics.push("Facebook Pixel");
  if (html.match(/clarity/i)) analytics.push("Microsoft Clarity");
  if (html.match(/hotjar/i)) analytics.push("Hotjar");
  if (analytics.length > 2) {
    issues.push({ id: id++, category: "technical", severity: "minor", title: `${analytics.length} servicios de analytics superpuestos`, description: `Se detectaron: ${analytics.join(", ")}`, whyItMatters: "Múltiples analytics disparan eventos duplicados, inflan datos y degradan rendimiento." });
  }
  if (analytics.length === 0) {
    issues.push({ id: id++, category: "technical", severity: "major", title: "Sin analytics detectados", description: "No se detectó Google Analytics, GTM u otro sistema de analítica web.", whyItMatters: "Sin analytics, no puedes medir tráfico, conversiones ni el ROI de tu presencia online." });
  }

  // WordPress specific
  if (html.match(/wp-content|wordpress/i)) {
    // Check WP version exposure
    if (html.match(/wp-includes|wp-emoji/i)) {
      issues.push({ id: id++, category: "technical", severity: "minor", title: "Versión de WordPress expuesta", description: "Se detectan archivos internos de WordPress que revelan la plataforma y posiblemente la versión.", whyItMatters: "Exponer la versión de WordPress facilita ataques dirigidos a vulnerabilidades conocidas." });
    }
    // Plugin bloat
    const pluginMatches = html.match(/wp-content\/plugins\/([^/"]+)/gi) || [];
    const uniquePlugins = new Set(pluginMatches.map(p => p.split('/plugins/')[1]));
    if (uniquePlugins.size > 10) {
      issues.push({ id: id++, category: "technical", severity: "major", title: `${uniquePlugins.size} plugins de WordPress detectados`, description: `Se detectaron ${uniquePlugins.size} plugins activos de WordPress.`, whyItMatters: "Muchos plugins aumentan la superficie de ataque, degradan rendimiento y complican el mantenimiento." });
    }
  }

  // HTTPS redirect check
  if (html.match(/http:\/\/[^"'\s]*\.(css|js)/i)) {
    issues.push({ id: id++, category: "technical", severity: "major", title: "Recursos cargados por HTTP inseguro", description: "Se detectaron archivos CSS o JS cargados por HTTP en lugar de HTTPS.", whyItMatters: "Los recursos HTTP en una página HTTPS causan 'mixed content' warnings y pueden ser interceptados." });
  }

  // 404 page
  if (!html.match(/404|not found|página no encontrada/i)) {
    issues.push({ id: id++, category: "technical", severity: "minor", title: "Verificar página 404 personalizada", description: "No se puede verificar la existencia de una página 404 personalizada solo analizando el HTML principal.", whyItMatters: "Una página 404 genérica pierde la oportunidad de redirigir usuarios a contenido útil." });
  }

  return issues;
}

// ---- SCORING ----

function calculateCategoryScore(
  catIssues: AuditIssue[],
  key: CategoryKey,
  lighthouse?: LighthouseData
): number {
  const criticals = catIssues.filter(i => i.severity === "critical").length;
  const majors = catIssues.filter(i => i.severity === "major").length;
  const minors = catIssues.filter(i => i.severity === "minor").length;
  const opps = catIssues.filter(i => i.severity === "opportunity").length;

  // Base score deductions — more aggressive
  let score = 100 - (criticals * 20) - (majors * 8) - (minors * 3) - (opps * 1);

  // Category-specific Lighthouse integration (weighted 40% Lighthouse, 60% our checks)
  if (key === "performance" && lighthouse?.performanceScore != null) {
    const lhScore = lighthouse.performanceScore * 100;
    score = Math.round(lhScore * 0.4 + score * 0.6);
  }
  if (key === "seo" && lighthouse?.seoScore != null) {
    const lhScore = lighthouse.seoScore * 100;
    score = Math.round(lhScore * 0.3 + score * 0.7);
  }
  if (key === "accessibility" && lighthouse?.accessibilityScore != null) {
    const lhScore = lighthouse.accessibilityScore * 100;
    score = Math.round(lhScore * 0.4 + score * 0.6);
  }

  // Cap: if any criticals exist, max score is 55
  if (criticals > 0) score = Math.min(score, 55);
  // If multiple majors, cap at 70
  if (majors >= 3) score = Math.min(score, 70);

  return Math.max(0, Math.min(100, score));
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
    ...checkAccessibility(html, lighthouseData),
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
    const score = calculateCategoryScore(catIssues, key, lighthouseData);

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
  const worstCategories = [...categories]
    .sort((a, b) => a.score - b.score)
    .slice(0, 3)
    .map(c => `${c.label} (${c.score}/100)`)
    .join(", ");

  const summary = `Se han identificado ${allIssues.length} problemas en 8 categorías que afectan la visibilidad digital. Las áreas más críticas incluyen ${worstCategories}. ${criticalCount > 0 ? `Hay ${criticalCount} problemas críticos que requieren atención inmediata. ` : ""}${allIssues.filter(i => i.category === "llm").length > 5 ? "El sitio tiene deficiencias significativas en preparación para IA, lo que significa que asistentes como ChatGPT y Gemini no pueden descubrirlo ni recomendarlo. " : ""}El sitio necesita optimización para competir efectivamente en el panorama digital actual.`;

  return {
    overallScore,
    overallGrade,
    totalIssues: allIssues.length,
    criticalCount,
    majorCount,
    minorCount,
    oppsCount,
    categories,
    issues: allIssues,
    vitals: {
      lcp: lighthouseData?.lcp ?? null,
      cls: lighthouseData?.cls ?? null,
      inp: lighthouseData?.inp ?? null,
    },
    summary,
  };
}

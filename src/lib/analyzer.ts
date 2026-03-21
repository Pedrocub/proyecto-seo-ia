import { AuditIssue, CategoryKey, Severity, scoreToGrade } from "@/types/audit";

// ---- INTERFACES ----

interface LighthouseData {
  lcp?: number;
  cls?: number;
  inp?: number;
  fcp?: number;
  tbt?: number;
  si?: number;
  performanceScore?: number;
  seoScore?: number;
  accessibilityScore?: number;
  bestPracticesScore?: number;
}

export interface AnalysisInput {
  url: string;
  html: string;
  headers: Record<string, string>;
  lighthouseData?: LighthouseData;
  robotsTxt?: string | null;
  sitemapXml?: string | null;
  llmsTxt?: string | null;
  subpages?: { url: string; html: string }[];
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
  vitals: { lcp: number | null; cls: number | null; inp: number | null; fcp: number | null; tbt: number | null; si: number | null };
  summary: string;
}

// ---- HELPERS ----

/** Strip HTML tags and return plain text */
function stripTags(html: string): string {
  return html.replace(/<script[^>]*>[\s\S]*?<\/script>/gi, "")
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, "")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/** Count words in plain text */
function wordCount(text: string): number {
  return text.split(/\s+/).filter(w => w.length > 1).length;
}

/** Extract all JSON-LD blocks from HTML and parse them */
function extractJsonLd(html: string): Record<string, unknown>[] {
  const blocks: Record<string, unknown>[] = [];
  const regex = /<script[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi;
  let match;
  while ((match = regex.exec(html)) !== null) {
    try {
      const parsed = JSON.parse(match[1]);
      if (Array.isArray(parsed)) {
        for (const item of parsed) {
          if (item && typeof item === "object") blocks.push(item as Record<string, unknown>);
        }
      } else if (parsed && typeof parsed === "object") {
        // Handle @graph
        if (Array.isArray((parsed as Record<string, unknown>)["@graph"])) {
          for (const item of (parsed as Record<string, unknown>)["@graph"] as unknown[]) {
            if (item && typeof item === "object") blocks.push(item as Record<string, unknown>);
          }
        }
        blocks.push(parsed as Record<string, unknown>);
      }
    } catch {
      // malformed JSON-LD, skip
    }
  }
  return blocks;
}

/** Check if a JSON-LD block has a specific @type */
function findSchemaByType(blocks: Record<string, unknown>[], typePattern: RegExp): Record<string, unknown> | undefined {
  return blocks.find(b => {
    const t = b["@type"];
    if (typeof t === "string") return typePattern.test(t);
    if (Array.isArray(t)) return t.some(v => typeof v === "string" && typePattern.test(v));
    return false;
  });
}

/** Count how many fields from a list are present in a schema block */
function countSchemaFields(block: Record<string, unknown>, fields: string[]): { present: string[]; missing: string[] } {
  const present: string[] = [];
  const missing: string[] = [];
  for (const f of fields) {
    if (block[f] != null && block[f] !== "" && block[f] !== false) {
      present.push(f);
    } else {
      missing.push(f);
    }
  }
  return { present, missing };
}

/** Combine HTML from main page and subpages */
function getAllHtml(html: string, subpages?: { url: string; html: string }[]): string {
  let combined = html;
  if (subpages) {
    for (const sp of subpages) {
      combined += "\n" + sp.html;
    }
  }
  return combined;
}

/** Extract internal links from HTML */
function extractInternalLinks(html: string, baseUrl: string): string[] {
  const links: string[] = [];
  const parsed = new URL(baseUrl);
  const regex = /<a[^>]*href=["']([^"'#]+)["'][^>]*>/gi;
  let m;
  while ((m = regex.exec(html)) !== null) {
    const href = m[1];
    try {
      const resolved = new URL(href, baseUrl);
      if (resolved.hostname === parsed.hostname && resolved.pathname !== "/" && resolved.pathname !== parsed.pathname) {
        if (!links.includes(resolved.href)) links.push(resolved.href);
      }
    } catch {
      // invalid URL, skip
    }
  }
  return links;
}

// ---- CHECK FUNCTIONS ----

function checkMobile(html: string, allHtml: string): AuditIssue[] {
  const issues: AuditIssue[] = [];
  let id = 1000;

  // Viewport meta
  if (!html.match(/<meta[^>]*name=["']viewport["'][^>]*width=device-width/i) &&
      !html.match(/<meta[^>]*width=device-width[^>]*name=["']viewport["']/i) &&
      !html.match(/viewport.*width=device-width/i)) {
    issues.push({ id: id++, category: "mobile", severity: "critical", title: "Sin meta viewport configurado", description: "No se encontro la etiqueta meta viewport con width=device-width.", whyItMatters: "Sin viewport configurado, el sitio no se adapta a moviles. Google penaliza sitios no mobile-friendly en rankings." });
  }

  // Title length for mobile
  const titleMatch = html.match(/<title[^>]*>([^<]*)<\/title>/i);
  if (titleMatch && titleMatch[1].length > 60) {
    issues.push({ id: id++, category: "mobile", severity: "minor", title: "Titulo demasiado largo para movil", description: `El titulo tiene ${titleMatch[1].length} caracteres y se truncara en resultados moviles.`, whyItMatters: "Los titulos truncados en movil se ven menos profesionales y reducen el CTR." });
  }

  // Click-to-call
  const hasTelLink = !!allHtml.match(/href=["']tel:/i);
  if (!hasTelLink) {
    issues.push({ id: id++, category: "mobile", severity: "major", title: "Sin boton click-to-call", description: "No se detecto enlace telefonico tap-to-call para usuarios moviles.", whyItMatters: "El 60% de las busquedas de salud son en movil. Sin click-to-call, los pacientes deben copiar el numero manualmente." });
  }

  // Sticky/fixed CTA
  const hasStickyFixed = !!html.match(/position:\s*(sticky|fixed)/i);
  if (!hasStickyFixed && !hasTelLink) {
    // Both missing = critical
    issues.push({ id: id++, category: "mobile", severity: "critical", title: "Sin CTA sticky ni enlace telefonico en movil", description: "No se detecto ningun elemento con position sticky/fixed ni enlace tel: para contacto rapido en movil.", whyItMatters: "Sin CTA fijo ni telefono tactil, el usuario movil no tiene forma rapida de contactar. Los competidores con CTA fijo convierten hasta 3x mas." });
  } else if (!hasStickyFixed) {
    issues.push({ id: id++, category: "mobile", severity: "major", title: "Sin CTA sticky o menu fijo en movil", description: "No se detecto ningun elemento con position sticky o fixed.", whyItMatters: "Un CTA sticky permite contactar sin hacer scroll. Los competidores con CTA fijo convierten hasta 3x mas." });
  }

  // Responsive images
  if (!html.match(/srcset=/i) && !html.match(/<picture[\s>]/i)) {
    issues.push({ id: id++, category: "mobile", severity: "major", title: "Sin imagenes responsivas (srcset)", description: "No se detectaron imagenes con srcset o elementos <picture> para diferentes tamanos de pantalla.", whyItMatters: "Sin imagenes responsivas, los moviles descargan imagenes de escritorio completas, desperdiciando datos y ralentizando la carga." });
  }

  // Check for responsive CSS media queries
  const hasMediaQueries = !!html.match(/@media[^{]*max-width/i) || !!html.match(/media=["'][^"']*max-width/i);
  // Also check linked stylesheets hint (can't fully verify external CSS but check inline styles)
  if (!hasMediaQueries && !html.match(/bootstrap|tailwind|foundation/i)) {
    issues.push({ id: id++, category: "mobile", severity: "major", title: "Sin media queries responsivas detectadas", description: "No se detectaron media queries con max-width en estilos inline ni frameworks CSS responsivos.", whyItMatters: "Sin media queries, el diseno no se adapta a diferentes tamanos de pantalla, causando mala experiencia en movil." });
  }

  // Small font sizes in inline styles
  const smallFontMatches = html.match(/font-size:\s*(\d+)(px|pt)/gi) || [];
  const smallFonts = smallFontMatches.filter(m => {
    const sizeMatch = m.match(/(\d+)/);
    if (sizeMatch) {
      const size = parseInt(sizeMatch[1]);
      return size < 14 && size > 0;
    }
    return false;
  });
  if (smallFonts.length > 3) {
    issues.push({ id: id++, category: "mobile", severity: "major", title: `${smallFonts.length} instancias de fuentes menores a 14px`, description: "Se detectaron multiples estilos inline con font-size menor a 14px, dificil de leer en movil.", whyItMatters: "Google recomienda un tamano minimo de 16px para texto. Las fuentes pequenas obligan al usuario a hacer zoom." });
  } else if (smallFonts.length > 0) {
    issues.push({ id: id++, category: "mobile", severity: "minor", title: `${smallFonts.length} instancias de fuentes menores a 14px`, description: "Se detectaron estilos inline con font-size menor a 14px.", whyItMatters: "Las fuentes pequenas son dificiles de leer en pantallas moviles." });
  }

  // Horizontal scroll indicators
  if (html.match(/width:\s*\d{4,}px/i) || html.match(/overflow-x:\s*hidden/i) || html.match(/width:\s*[12]\d{2}vw/i)) {
    issues.push({ id: id++, category: "mobile", severity: "minor", title: "Posible scroll horizontal en movil", description: "Se detectaron estilos que podrian causar overflow horizontal en pantallas pequenas.", whyItMatters: "El scroll horizontal es una de las peores experiencias en movil y Google lo penaliza." });
  }

  // Mobile-unfriendly tables
  if (html.match(/<table/i) && !html.match(/overflow-x|table-responsive|scroll/i)) {
    issues.push({ id: id++, category: "mobile", severity: "minor", title: "Tablas sin scroll horizontal en movil", description: "Se detectaron tablas HTML sin contenedor de scroll para movil.", whyItMatters: "Las tablas anchas rompen el layout en pantallas pequenas, obligando al usuario a hacer zoom." });
  }

  // Popup/modal check
  if (html.match(/popup|modal|overlay/i) && !html.match(/media.*max-width|responsive.*popup/i)) {
    issues.push({ id: id++, category: "mobile", severity: "minor", title: "Popups potencialmente intrusivos en movil", description: "Se detectaron popups/modales que podrian no estar optimizados para pantallas pequenas.", whyItMatters: "Google penaliza intersticiales intrusivos en movil. Los popups que cubren el contenido danan la experiencia." });
  }

  return issues;
}

function checkSEO(html: string, url: string, allHtml: string, robotsTxt?: string | null, sitemapXml?: string | null): AuditIssue[] {
  const issues: AuditIssue[] = [];
  let id = 2000;

  // Title tag
  const titleMatch = html.match(/<title[^>]*>([^<]*)<\/title>/i);
  if (!titleMatch || !titleMatch[1].trim()) {
    issues.push({ id: id++, category: "seo", severity: "critical", title: "Sin etiqueta title o title vacio", description: "No se encontro etiqueta <title> valida en la pagina.", whyItMatters: "El title es el factor on-page mas importante para SEO. Sin el, Google genera un titulo automatico que rara vez es optimo." });
  } else if (titleMatch[1].length > 65) {
    issues.push({ id: id++, category: "seo", severity: "critical", title: "Titulo de pagina demasiado largo", description: `El titulo tiene ${titleMatch[1].length} caracteres, excediendo el limite recomendado de 60 caracteres.`, whyItMatters: "Google trunca los titulos mas alla de ~60 caracteres. El nombre del negocio y diferenciadores clave se cortan, reduciendo CTR." });
  } else if (titleMatch[1].length < 20) {
    issues.push({ id: id++, category: "seo", severity: "major", title: "Titulo de pagina demasiado corto", description: `El titulo tiene solo ${titleMatch[1].length} caracteres. Deberia tener entre 30-60.`, whyItMatters: "Los titulos muy cortos desaprovechan espacio valioso en los resultados de busqueda para incluir palabras clave." });
  }

  // Meta description
  const metaDesc = html.match(/meta\s+name=["']description["']\s+content=["']([^"']*)["']/i) ||
                   html.match(/meta\s+content=["']([^"']*)["']\s+name=["']description["']/i);
  if (!metaDesc) {
    issues.push({ id: id++, category: "seo", severity: "major", title: "Sin meta description", description: "No se encontro la meta description en la pagina.", whyItMatters: "La meta description aparece en los resultados de busqueda. Sin ella, Google genera un snippet aleatorio." });
  } else {
    if (metaDesc[1].length > 160) {
      issues.push({ id: id++, category: "seo", severity: "minor", title: "Meta description demasiado larga", description: `La meta description tiene ${metaDesc[1].length} caracteres. Se recomienda maximo 155.`, whyItMatters: "Google trunca descriptions largas, perdiendo el mensaje clave." });
    } else if (metaDesc[1].length < 70) {
      issues.push({ id: id++, category: "seo", severity: "minor", title: "Meta description demasiado corta", description: `La meta description tiene solo ${metaDesc[1].length} caracteres. Se recomiendan 120-155.`, whyItMatters: "Las descriptions cortas desaprovechan espacio para convencer al usuario de hacer clic." });
    }

    // Check if meta description contains city/location from URL
    try {
      const hostname = new URL(url).hostname;
      const parts = hostname.replace(/^www\./, "").split(".");
      // Check for city in URL path or hostname
      const pathParts = new URL(url).pathname.toLowerCase().split(/[-/]/).filter(Boolean);
      const locationTerms = [...parts, ...pathParts].filter(t => t.length > 3 && !["www", "com", "http", "https", "html", "index"].includes(t));
      // This is a soft check - only flag if description is very generic
      if (metaDesc[1].length > 0 && !metaDesc[1].match(/cl[ií]nica|centro|doctor|est[eé]tic|madrid|barcelona|sevilla|valencia|m[aá]laga|bilbao|zaragoza/i)) {
        // Generic description without location or industry terms
        issues.push({ id: id++, category: "seo", severity: "minor", title: "Meta description sin terminos clave de ubicacion", description: "La meta description no incluye terminos de ubicacion o del sector que ayuden al posicionamiento local.", whyItMatters: "Incluir la ciudad y el tipo de servicio en la description mejora el CTR para busquedas locales." });
      }
    } catch {
      // URL parsing failed
    }
  }

  // H1 tags
  const h1Matches = html.match(/<h1[^>]*>/gi);
  if (!h1Matches) {
    issues.push({ id: id++, category: "seo", severity: "critical", title: "Sin encabezado H1", description: "No se encontro etiqueta H1 en la pagina.", whyItMatters: "El H1 indica a los buscadores el tema principal. Sin H1, Google pierde la senal mas fuerte de relevancia tematica." });
  } else if (h1Matches.length > 1) {
    // For medical sites, multiple H1s is critical
    const isMedical = !!html.match(/cl[ií]nica|m[eé]dic|est[eé]tic|cirug[ií]a|dermatolog|doctor|tratamiento/i);
    issues.push({ id: id++, category: "seo", severity: isMedical ? "critical" : "major", title: `${h1Matches.length} etiquetas H1 en la misma pagina`, description: `Se encontraron ${h1Matches.length} etiquetas H1, diluyendo la senal de tema principal.`, whyItMatters: "Multiples H1 confunden a Google sobre el tema principal de la pagina, debilitando el ranking para todas las keywords." });
  }

  // Open Graph
  if (!html.match(/og:title/i)) {
    issues.push({ id: id++, category: "seo", severity: "major", title: "Sin Open Graph title", description: "No se encontro og:title para compartir en redes sociales.", whyItMatters: "Sin og:title, las redes sociales muestran titulos genericos como 'Home' o la URL, reduciendo clics." });
  }
  if (!html.match(/og:description/i)) {
    issues.push({ id: id++, category: "seo", severity: "minor", title: "Sin Open Graph description", description: "No se encontro og:description.", whyItMatters: "Sin descripcion OG, las publicaciones compartidas muestran texto aleatorio de la pagina." });
  }
  if (!html.match(/og:image/i)) {
    issues.push({ id: id++, category: "seo", severity: "major", title: "Sin Open Graph image", description: "No se encontro og:image para vista previa en redes sociales.", whyItMatters: "Las publicaciones sin imagen obtienen 80% menos engagement que las que tienen imagen de vista previa." });
  }

  // Canonical
  const canonicalMatch = html.match(/<link[^>]*rel=["']canonical["'][^>]*href=["']([^"']*)["']/i) ||
                         html.match(/<link[^>]*href=["']([^"']*)["'][^>]*rel=["']canonical["']/i);
  if (!canonicalMatch) {
    issues.push({ id: id++, category: "seo", severity: "major", title: "Sin URL canonica", description: "No se encontro enlace rel=canonical.", whyItMatters: "Sin canonical, Google puede indexar versiones duplicadas (www/no-www, http/https, con/sin trailing slash)." });
  } else {
    // Verify canonical matches actual URL
    try {
      const canonicalUrl = new URL(canonicalMatch[1], url).href;
      const actualUrl = url.replace(/\/$/, "");
      const canonicalClean = canonicalUrl.replace(/\/$/, "");
      if (canonicalClean !== actualUrl && canonicalClean !== actualUrl.replace("www.", "") && canonicalClean !== actualUrl.replace("://", "://www.")) {
        issues.push({ id: id++, category: "seo", severity: "major", title: "URL canonica no coincide con la URL actual", description: `La canonical apunta a ${canonicalMatch[1]} pero la URL actual es ${url}.`, whyItMatters: "Una canonical incorrecta puede hacer que Google ignore esta pagina en favor de otra, perdiendo posicionamiento." });
      }
    } catch {
      // URL parsing failed
    }
  }

  // Alt texts - stricter
  const imgTags = html.match(/<img[^>]*>/gi) || [];
  const imgsWithoutAlt = imgTags.filter(img => !img.match(/alt=["'][^"']+["']/i));
  const altRatio = imgTags.length > 0 ? imgsWithoutAlt.length / imgTags.length : 0;
  if (altRatio > 0.5 && imgTags.length > 2) {
    issues.push({ id: id++, category: "seo", severity: "critical", title: `${imgsWithoutAlt.length} de ${imgTags.length} imagenes sin texto alt (${Math.round(altRatio * 100)}%)`, description: `Mas de la mitad de las imagenes no tienen atributo alt descriptivo. Esto es un fallo critico de SEO y accesibilidad.`, whyItMatters: "Las imagenes sin alt pierden posicionamiento en Google Images y violan accesibilidad WCAG." });
  } else if (imgsWithoutAlt.length > 3) {
    issues.push({ id: id++, category: "seo", severity: "major", title: `${imgsWithoutAlt.length} imagenes sin texto alt descriptivo`, description: `De ${imgTags.length} imagenes, ${imgsWithoutAlt.length} no tienen atributo alt o tienen alt vacio.`, whyItMatters: "Las imagenes sin alt pierden posicionamiento en Google Images y violan accesibilidad WCAG." });
  } else if (imgsWithoutAlt.length > 0) {
    issues.push({ id: id++, category: "seo", severity: "minor", title: `${imgsWithoutAlt.length} imagenes sin texto alt`, description: `Se encontraron ${imgsWithoutAlt.length} imagenes sin atributo alt descriptivo.`, whyItMatters: "Cada imagen sin alt es una oportunidad perdida de posicionamiento en Google Images." });
  }

  // Hreflang for multilingual
  if (html.match(/translate|idioma|language/i) && !html.match(/hreflang/i)) {
    issues.push({ id: id++, category: "seo", severity: "minor", title: "Sin etiquetas hreflang para contenido multilingue", description: "El sitio parece tener contenido en multiples idiomas pero sin hreflang.", whyItMatters: "Sin hreflang, Google puede mostrar la version incorrecta del idioma a los usuarios." });
  }

  // Internal linking
  const internalLinkMatches = html.match(/<a[^>]*href=["']\/[^"']*["']/gi) || [];
  // Also count full internal URLs
  try {
    const host = new URL(url).hostname;
    const fullInternalLinks = (html.match(new RegExp(`<a[^>]*href=["']https?://${host.replace(".", "\\.")}[^"']*["']`, "gi")) || []).length;
    const totalInternal = internalLinkMatches.length + fullInternalLinks;
    if (totalInternal < 5) {
      issues.push({ id: id++, category: "seo", severity: "major", title: "Enlazado interno insuficiente", description: `Solo se detectaron ${totalInternal} enlaces internos en la pagina.`, whyItMatters: "El enlazado interno distribuye autoridad SEO entre paginas. Menos de 5 enlaces indica una estructura pobre." });
    }

    // Internal vs external link ratio
    const allLinks = html.match(/<a[^>]*href=["'](https?:\/\/[^"']+)["']/gi) || [];
    const externalLinks = allLinks.filter(l => {
      const hrefMatch = l.match(/href=["'](https?:\/\/[^"']+)["']/i);
      if (!hrefMatch) return false;
      try {
        return new URL(hrefMatch[1]).hostname !== host;
      } catch { return false; }
    });
    if (externalLinks.length > totalInternal && totalInternal < 10) {
      issues.push({ id: id++, category: "seo", severity: "minor", title: "Mas enlaces externos que internos", description: `Se detectaron ${externalLinks.length} enlaces externos vs ${totalInternal} internos.`, whyItMatters: "Un ratio de enlaces externos mayor que internos puede diluir la autoridad SEO del sitio." });
    }
  } catch {
    if (internalLinkMatches.length < 5) {
      issues.push({ id: id++, category: "seo", severity: "major", title: "Enlazado interno insuficiente", description: `Solo se detectaron ${internalLinkMatches.length} enlaces internos en la pagina.`, whyItMatters: "El enlazado interno distribuye autoridad SEO entre paginas." });
    }
  }

  // Sitemap reference
  const hasSitemapInHtml = !!html.match(/sitemap/i);
  const hasSitemapInRobots = !!robotsTxt?.match(/sitemap/i);
  const hasSitemap = !!sitemapXml;
  if (!hasSitemap && !hasSitemapInRobots && !hasSitemapInHtml) {
    issues.push({ id: id++, category: "seo", severity: "major", title: "Sin referencia a sitemap", description: "No se encontro referencia a sitemap.xml ni en la pagina ni en robots.txt.", whyItMatters: "Sin sitemap, Google puede no descubrir todas las paginas del sitio, especialmente las mas profundas." });
  }

  // Structured breadcrumbs
  const jsonLd = extractJsonLd(html);
  const hasBreadcrumbSchema = !!findSchemaByType(jsonLd, /BreadcrumbList/i);
  const hasBreadcrumbHtml = !!html.match(/breadcrumb|migas|miga.*pan/i) || !!html.match(/aria-label=["']breadcrumb/i);
  if (!hasBreadcrumbSchema && !hasBreadcrumbHtml) {
    issues.push({ id: id++, category: "seo", severity: "minor", title: "Sin breadcrumbs estructurados", description: "No se detectaron breadcrumbs en HTML ni schema BreadcrumbList.", whyItMatters: "Los breadcrumbs mejoran la navegacion y aparecen en los resultados de Google como rich snippets." });
  }

  // Twitter Card
  if (!html.match(/twitter:card/i)) {
    issues.push({ id: id++, category: "seo", severity: "minor", title: "Sin Twitter Card meta tags", description: "No se detectaron meta tags de Twitter Card.", whyItMatters: "Las Twitter Cards mejoran la apariencia de enlaces compartidos en X/Twitter." });
  }

  return issues;
}

function checkLLM(html: string, allHtml: string, llmsTxt?: string | null): AuditIssue[] {
  const issues: AuditIssue[] = [];
  let id = 3000;

  const jsonLdBlocks = extractJsonLd(html);
  const allJsonLdBlocks = extractJsonLd(allHtml);
  const combinedBlocks = [...jsonLdBlocks, ...allJsonLdBlocks.filter(b => !jsonLdBlocks.includes(b))];

  // No JSON-LD at all
  if (jsonLdBlocks.length === 0) {
    issues.push({ id: id++, category: "llm", severity: "critical", title: "Sin datos estructurados (JSON-LD)", description: "No se encontro ningun markup JSON-LD en la pagina principal.", whyItMatters: "Los sistemas de IA como ChatGPT y Gemini dependen de datos estructurados para entender y citar tu negocio. Sin JSON-LD, eres invisible para la IA." });
  }

  // LocalBusiness / MedicalBusiness schema and completeness
  const businessSchema = findSchemaByType(combinedBlocks, /LocalBusiness|MedicalBusiness|Physician|HealthAndBeautyBusiness|Dentist|MedicalClinic/i);
  if (!businessSchema) {
    issues.push({ id: id++, category: "llm", severity: "critical", title: "Sin schema de negocio medico/estetico", description: "No se encontro schema Physician, MedicalBusiness, HealthAndBeautyBusiness o LocalBusiness.", whyItMatters: "Los asistentes de IA no pueden verificar credenciales ni ubicacion. Cuando un paciente pregunta 'Cual es la mejor clinica estetica?', tu competencia con schema sera citada primero." });
  } else {
    // Check completeness of business schema
    const requiredFields = ["name", "address", "telephone", "openingHours", "geo", "image", "priceRange"];
    const { missing } = countSchemaFields(businessSchema, requiredFields);
    if (missing.length >= 5) {
      issues.push({ id: id++, category: "llm", severity: "critical", title: `Schema de negocio muy incompleto (faltan ${missing.length}/7 campos)`, description: `El schema LocalBusiness/MedicalBusiness no incluye: ${missing.join(", ")}.`, whyItMatters: "Un schema incompleto no proporciona suficiente informacion para que la IA recomiende tu negocio con confianza." });
    } else if (missing.length >= 3) {
      issues.push({ id: id++, category: "llm", severity: "major", title: `Schema de negocio incompleto (faltan ${missing.length}/7 campos)`, description: `El schema no incluye: ${missing.join(", ")}.`, whyItMatters: "Los campos faltantes limitan la capacidad de la IA para responder preguntas sobre tu negocio." });
    } else if (missing.length > 0) {
      issues.push({ id: id++, category: "llm", severity: "minor", title: `Schema de negocio casi completo (faltan ${missing.length} campos)`, description: `Faltan: ${missing.join(", ")}.`, whyItMatters: "Completar todos los campos del schema maximiza la visibilidad en asistentes de IA." });
    }

    // Check for PostalAddress sub-object
    if (!businessSchema.address || (typeof businessSchema.address === "object" && !(businessSchema.address as Record<string, unknown>).streetAddress)) {
      issues.push({ id: id++, category: "llm", severity: "major", title: "Sin direccion completa en schema", description: "El schema de negocio no incluye una direccion PostalAddress completa con streetAddress.", whyItMatters: "Sin direccion estructurada, la IA no puede verificar tu ubicacion ni recomendar tu clinica para busquedas locales." });
    }

    // Check for geo coordinates
    if (!businessSchema.geo) {
      issues.push({ id: id++, category: "llm", severity: "minor", title: "Sin coordenadas geo en schema", description: "El schema no incluye coordenadas geograficas (geo).", whyItMatters: "Las coordenadas permiten a la IA calcular distancias y recomendar por proximidad." });
    }
  }

  // FAQPage schema with minimum questions
  const faqSchema = findSchemaByType(combinedBlocks, /FAQPage/i);
  if (!faqSchema) {
    issues.push({ id: id++, category: "llm", severity: "critical", title: "Sin schema FAQPage", description: "No se detecto schema FAQPage. Las preguntas frecuentes sin marcado estructurado son invisibles para IA.", whyItMatters: "Cuando un paciente pregunta a ChatGPT sobre un tratamiento, solo cita respuestas de sitios con schema FAQ. Sin el, tus respuestas no existen para la IA." });
  } else {
    // Check number of questions
    const mainEntity = faqSchema.mainEntity;
    const questionCount = Array.isArray(mainEntity) ? mainEntity.length : 0;
    if (questionCount < 3) {
      issues.push({ id: id++, category: "llm", severity: "major", title: `FAQPage con solo ${questionCount} preguntas`, description: `El schema FAQPage tiene ${questionCount} preguntas. Se recomiendan al menos 3 para que la IA tenga suficiente contenido.`, whyItMatters: "Pocas preguntas limitan las oportunidades de que la IA cite tu contenido en respuestas." });
    }
  }

  // Review/AggregateRating schema with data
  const reviewSchema = findSchemaByType(combinedBlocks, /Review|AggregateRating/i);
  const aggregateRating = combinedBlocks.find(b => {
    const t = b["@type"];
    return (typeof t === "string" && /AggregateRating/i.test(t)) ||
           (b.aggregateRating != null);
  });
  if (!reviewSchema && !aggregateRating) {
    issues.push({ id: id++, category: "llm", severity: "major", title: "Sin schema de Reviews/Rating", description: "No se encontro schema Review o AggregateRating para validar reputacion.", whyItMatters: "Los asistentes de IA usan ratings estructurados para evaluar y comparar clinicas. Sin ellos, tu reputacion online es invisible." });
  } else if (aggregateRating) {
    // Check that aggregateRating has actual data
    const rating = (aggregateRating.aggregateRating as Record<string, unknown>) || aggregateRating;
    if (!rating.ratingValue && !rating.reviewCount) {
      issues.push({ id: id++, category: "llm", severity: "minor", title: "Schema AggregateRating sin datos completos", description: "El schema de rating existe pero no incluye ratingValue o reviewCount.", whyItMatters: "Un schema de rating sin datos no aporta informacion util a la IA." });
    }
  }

  // MedicalProcedure/Service schema
  const serviceSchema = findSchemaByType(combinedBlocks, /MedicalProcedure|Service|Offer|Product/i);
  if (!serviceSchema) {
    issues.push({ id: id++, category: "llm", severity: "major", title: "Sin schema de servicios/procedimientos", description: "No se encontro schema MedicalProcedure, Service o Offer.", whyItMatters: "La IA no puede listar tus servicios especificos cuando un paciente pregunta 'Donde puedo hacerme botox en Madrid?'" });
  }

  // llms.txt - actually verify
  if (!llmsTxt) {
    issues.push({ id: id++, category: "llm", severity: "major", title: "Sin archivo llms.txt", description: "No se encontro archivo llms.txt (protocolo emergente para indicar a crawlers de IA el proposito del sitio).", whyItMatters: "Los early adopters de llms.txt ganan ventajas de descubribilidad frente a los crawlers de IA." });
  } else if (llmsTxt.trim().length < 50) {
    issues.push({ id: id++, category: "llm", severity: "minor", title: "Archivo llms.txt demasiado corto", description: `El archivo llms.txt tiene solo ${llmsTxt.trim().length} caracteres. Deberia describir el negocio, servicios y ubicacion.`, whyItMatters: "Un llms.txt incompleto no proporciona suficiente contexto para que los crawlers de IA entiendan tu negocio." });
  }

  // Author attribution on content
  if (allHtml.match(/blog|art[ií]culo|article/i) && !allHtml.match(/author|autor/i)) {
    issues.push({ id: id++, category: "llm", severity: "major", title: "Contenido sin atribucion de autor", description: "Se detecto contenido de blog/articulos sin atribucion visible de autor profesional.", whyItMatters: "Las directrices E-E-A-T de Google y los sistemas de IA priorizan contenido medico con autoria verificable." });
  }

  // Article schema with author
  if (allHtml.match(/blog|art[ií]culo|article/i)) {
    const articleSchema = findSchemaByType(combinedBlocks, /Article|BlogPosting|NewsArticle|MedicalWebPage/i);
    if (!articleSchema) {
      issues.push({ id: id++, category: "llm", severity: "major", title: "Sin schema Article en contenido de blog", description: "Se detecto contenido tipo blog/articulo pero sin schema Article o BlogPosting.", whyItMatters: "Los articulos sin schema Article no son correctamente indexados como contenido de autor por la IA." });
    } else if (!articleSchema.author) {
      issues.push({ id: id++, category: "llm", severity: "minor", title: "Schema Article sin author", description: "El schema Article existe pero no incluye informacion de author.", whyItMatters: "Sin author en el schema, la IA no puede verificar la experiencia del creador del contenido." });
    }
  }

  // BreadcrumbList schema
  if (!findSchemaByType(combinedBlocks, /BreadcrumbList/i)) {
    issues.push({ id: id++, category: "llm", severity: "minor", title: "Sin schema BreadcrumbList", description: "No se detecto schema BreadcrumbList para navegacion estructurada.", whyItMatters: "BreadcrumbList ayuda a la IA a entender la jerarquia del sitio y mejora los rich snippets en Google." });
  }

  // WebSite schema with SearchAction
  const websiteSchema = findSchemaByType(combinedBlocks, /WebSite/i);
  if (!websiteSchema) {
    issues.push({ id: id++, category: "llm", severity: "minor", title: "Sin schema WebSite", description: "No se detecto schema WebSite con potentialAction SearchAction.", whyItMatters: "El schema WebSite con SearchAction habilita el sitelinks searchbox en Google." });
  } else if (!websiteSchema.potentialAction) {
    issues.push({ id: id++, category: "llm", severity: "opportunity", title: "Schema WebSite sin SearchAction", description: "El schema WebSite existe pero no incluye SearchAction para sitelinks searchbox.", whyItMatters: "SearchAction habilita el buscador directo en los resultados de Google." });
  }

  // Medical-specific schemas
  const isMedical = !!allHtml.match(/cl[ií]nica|m[eé]dic|est[eé]tic|cirug[ií]a|dermatolog|doctor|tratamiento|procedimiento/i);
  if (isMedical) {
    const hasMedicalProcedure = !!findSchemaByType(combinedBlocks, /MedicalProcedure/i);
    const hasPhysician = !!findSchemaByType(combinedBlocks, /Physician/i);
    if (!hasMedicalProcedure && !hasPhysician) {
      issues.push({ id: id++, category: "llm", severity: "major", title: "Sin schemas medicos especificos (Physician/MedicalProcedure)", description: "Para un sitio medico, faltan schemas especificos como Physician o MedicalProcedure.", whyItMatters: "Los schemas medicos especificos dan mucha mas informacion a la IA que un LocalBusiness generico." });
    }
  }

  // Opening hours in schema
  if (!businessSchema || !businessSchema?.openingHours) {
    const hasOpeningHoursAnywhere = combinedBlocks.some(b => b.openingHours || b.openingHoursSpecification);
    if (!hasOpeningHoursAnywhere) {
      issues.push({ id: id++, category: "llm", severity: "minor", title: "Sin horarios en datos estructurados", description: "Los horarios de apertura no estan incluidos en el schema.", whyItMatters: "Los asistentes de IA no pueden informar si estas abierto cuando un paciente pregunta." });
    }
  }

  // Pricing structured
  if (!html.match(/priceRange|"price"|"offers"/i)) {
    issues.push({ id: id++, category: "llm", severity: "opportunity", title: "Sin informacion de precios estructurada", description: "No se detecto informacion de precios o rango de precios en datos estructurados.", whyItMatters: "La IA no puede responder preguntas sobre costes de tratamientos sin datos de precios." });
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
    issues.push({ id: id++, category: "accessibility", severity: "critical", title: `${noAlt.length} imagenes sin atributo alt`, description: `Se encontraron ${noAlt.length} de ${imgTags.length} imagenes sin ningun atributo alt. Viola WCAG 2.1 AA criterio 1.1.1.`, whyItMatters: "Los usuarios de lectores de pantalla no pueden entender las imagenes. Es una violacion directa de accesibilidad que Google penaliza." });
  } else if (noAlt.length > 0) {
    issues.push({ id: id++, category: "accessibility", severity: "major", title: `${noAlt.length} imagenes sin atributo alt`, description: `Se encontraron ${noAlt.length} imagenes sin atributo alt.`, whyItMatters: "Cada imagen sin alt excluye a usuarios con discapacidad visual." });
  }

  // Generic alt texts
  const genericAlts = imgTags.filter(img => img.match(/alt=["'](image|img|foto|photo|picture|banner|logo|icon|null|undefined|\d+)["']/i));
  if (genericAlts.length > 0) {
    issues.push({ id: id++, category: "accessibility", severity: "major", title: `${genericAlts.length} imagenes con alt text generico`, description: "Se encontraron imagenes con textos alt como 'image', 'foto', 'banner' que no son descriptivos.", whyItMatters: "Los alt texts genericos son casi tan malos como no tener alt. Los lectores de pantalla repiten 'image' sin contexto." });
  }

  // Heading hierarchy
  const headings = html.match(/<h[1-6][^>]*>/gi) || [];
  if (headings.length > 0) {
    const levels = headings.map(h => {
      const m = h.match(/<h([1-6])/i);
      return m ? parseInt(m[1]) : 1;
    });
    for (let i = 1; i < levels.length; i++) {
      if (levels[i] - levels[i - 1] > 1) {
        issues.push({ id: id++, category: "accessibility", severity: "major", title: "Jerarquia de encabezados rota", description: `Se salta de H${levels[i - 1]} a H${levels[i]} sin niveles intermedios.`, whyItMatters: "Los usuarios de lectores de pantalla dependen de la jerarquia para navegar. Los saltos hacen el contenido confuso." });
        break;
      }
    }
  }

  // Language attribute
  if (!html.match(/<html[^>]*lang=/i)) {
    issues.push({ id: id++, category: "accessibility", severity: "critical", title: "Sin atributo lang en HTML", description: "La etiqueta <html> no tiene atributo lang definido.", whyItMatters: "Los lectores de pantalla necesitan lang para pronunciar correctamente. Sin el, todo el contenido puede leerse con acento incorrecto." });
  }

  // Skip link
  if (!html.match(/skip|saltar/i)) {
    issues.push({ id: id++, category: "accessibility", severity: "major", title: "Sin enlace skip-to-content", description: "No se detecto enlace para saltar al contenido principal.", whyItMatters: "Los usuarios de teclado deben tabular por toda la navegacion repetidamente sin este enlace." });
  }

  // ARIA landmarks
  if (!html.match(/role=["'](main|navigation|banner|contentinfo)["']/i) && !html.match(/<main[\s>]/i)) {
    issues.push({ id: id++, category: "accessibility", severity: "major", title: "Sin landmarks semanticos", description: "No se detectaron landmarks HTML5 (main, nav, header, footer) o roles ARIA.", whyItMatters: "Los landmarks permiten a usuarios de lectores de pantalla saltar entre secciones sin tabular todo." });
  }

  // Form labels
  const inputs = html.match(/<input[^>]*>/gi) || [];
  const inputsWithoutLabel = inputs.filter(inp =>
    !inp.match(/type=["'](hidden|submit|button|reset)["']/i) &&
    !inp.match(/aria-label/i) &&
    !inp.match(/id=/i)
  );
  if (inputsWithoutLabel.length > 0) {
    issues.push({ id: id++, category: "accessibility", severity: "major", title: `${inputsWithoutLabel.length} campos de formulario sin label`, description: "Se detectaron campos de formulario sin labels asociados o aria-label.", whyItMatters: "Los usuarios de lectores de pantalla no saben que informacion introducir en campos sin label." });
  }

  // Color contrast - inline styles
  if (html.match(/color:\s*#[cdef][cdef][cdef]/i) || html.match(/color:\s*#[89ab][89ab][89ab]/i)) {
    issues.push({ id: id++, category: "accessibility", severity: "minor", title: "Posible bajo contraste de texto", description: "Se detectaron colores de texto claros que podrian no cumplir la ratio de contraste 4.5:1.", whyItMatters: "El texto con bajo contraste es dificil de leer para personas con vision reducida. Viola WCAG 2.1 AA criterio 1.4.3." });
  }

  // Focus styles removed
  if (html.match(/outline:\s*none/i) || html.match(/outline:\s*0[^.]/i)) {
    if (!html.match(/outline:\s*none[\s\S]{0,100}(box-shadow|border|ring)/i)) {
      issues.push({ id: id++, category: "accessibility", severity: "major", title: "Estilos de foco eliminados (outline: none)", description: "Se detecto outline: none sin alternativa visual para foco de teclado.", whyItMatters: "Sin indicador de foco, los usuarios de teclado no saben que elemento esta seleccionado. Viola WCAG 2.4.7." });
    }
  }

  // Button elements vs div clicks
  const divClicks = (html.match(/<div[^>]*onclick/gi) || []).length;
  const spanClicks = (html.match(/<span[^>]*onclick/gi) || []).length;
  if (divClicks + spanClicks > 0) {
    issues.push({ id: id++, category: "accessibility", severity: "major", title: `${divClicks + spanClicks} elementos no-button con onclick`, description: "Se detectaron divs o spans con onclick en lugar de elementos button o a.", whyItMatters: "Los elementos no-semanticos con onclick no son accesibles por teclado ni anunciados como interactivos por lectores de pantalla." });
  }

  // Lighthouse accessibility score integration
  if (lighthouse?.accessibilityScore != null) {
    if (lighthouse.accessibilityScore < 0.7) {
      issues.push({ id: id++, category: "accessibility", severity: "critical", title: `Puntuacion de accesibilidad Lighthouse: ${Math.round(lighthouse.accessibilityScore * 100)}/100`, description: `Google Lighthouse detecto problemas graves de accesibilidad con una puntuacion de ${Math.round(lighthouse.accessibilityScore * 100)}/100.`, whyItMatters: "Una puntuacion por debajo de 70 indica multiples problemas graves de accesibilidad." });
    } else if (lighthouse.accessibilityScore < 0.9) {
      issues.push({ id: id++, category: "accessibility", severity: "major", title: `Puntuacion de accesibilidad Lighthouse: ${Math.round(lighthouse.accessibilityScore * 100)}/100`, description: `Google Lighthouse detecto problemas de accesibilidad significativos con una puntuacion de ${Math.round(lighthouse.accessibilityScore * 100)}/100.`, whyItMatters: "Una puntuacion por debajo de 90 indica multiples problemas de accesibilidad que afectan a usuarios con discapacidad." });
    }
  }

  return issues;
}

function checkPerformance(html: string, headers: Record<string, string>, lighthouse?: LighthouseData): AuditIssue[] {
  const issues: AuditIssue[] = [];
  let id = 5000;

  // External scripts count
  const scripts = html.match(/<script[^>]*src=/gi) || [];
  if (scripts.length > 15) {
    issues.push({ id: id++, category: "performance", severity: "critical", title: `${scripts.length} scripts externos — carga excesiva`, description: `Se cargan ${scripts.length} scripts de terceros, impactando gravemente el rendimiento.`, whyItMatters: "Cada script compite por recursos. Mas de 15 scripts practicamente garantizan Core Web Vitals fallidos." });
  } else if (scripts.length > 8) {
    issues.push({ id: id++, category: "performance", severity: "major", title: `${scripts.length} scripts externos detectados`, description: `Se cargan ${scripts.length} scripts de terceros.`, whyItMatters: "Mas de 8 scripts de terceros degradan significativamente la interactividad y el tiempo de carga." });
  }

  // Inline scripts size
  const inlineScripts = html.match(/<script[^>]*>[\s\S]*?<\/script>/gi) || [];
  const totalInlineSize = inlineScripts.reduce((sum, s) => sum + s.length, 0);
  if (totalInlineSize > 100000) {
    issues.push({ id: id++, category: "performance", severity: "critical", title: "Scripts inline masivos", description: `Los scripts inline suman ${Math.round(totalInlineSize / 1024)}KB, bloqueando el renderizado.`, whyItMatters: "Scripts inline de mas de 100KB bloquean el primer renderizado. Los visitantes ven pagina en blanco." });
  } else if (totalInlineSize > 30000) {
    issues.push({ id: id++, category: "performance", severity: "major", title: "Scripts inline grandes", description: `Los scripts inline suman ${Math.round(totalInlineSize / 1024)}KB.`, whyItMatters: "Los scripts inline grandes retrasan el primer renderizado significativamente." });
  }

  // HTML size
  if (html.length > 500000) {
    issues.push({ id: id++, category: "performance", severity: "major", title: "HTML excesivamente grande", description: `El HTML de la pagina pesa ${Math.round(html.length / 1024)}KB.`, whyItMatters: "Un HTML muy grande ralentiza el parsing del navegador y consume memoria." });
  }

  // Font loading
  const fontLinks = html.match(/fonts\.googleapis|font-face|woff2?/gi) || [];
  if (fontLinks.length > 4) {
    issues.push({ id: id++, category: "performance", severity: "major", title: `Carga excesiva de fuentes (${fontLinks.length} detectadas)`, description: `Se detectaron ${fontLinks.length} cargas de fuentes web.`, whyItMatters: "Cada fuente es una solicitud adicional que bloquea el renderizado de texto. El usuario ve texto invisible (FOIT)." });
  } else if (fontLinks.length > 2) {
    issues.push({ id: id++, category: "performance", severity: "minor", title: `${fontLinks.length} fuentes web cargadas`, description: `Se cargan ${fontLinks.length} fuentes diferentes.`, whyItMatters: "Cada fuente adicional anade latencia al primer renderizado de texto." });
  }

  // Unoptimized images
  const jpgPngs = (html.match(/\.(jpg|jpeg|png|bmp)/gi) || []).length;
  const webpAvifs = (html.match(/\.(webp|avif)/gi) || []).length;
  if (jpgPngs > 5 && webpAvifs === 0) {
    issues.push({ id: id++, category: "performance", severity: "major", title: "Imagenes en formato no optimizado", description: `Se detectaron ${jpgPngs} imagenes en JPG/PNG sin alternativas WebP o AVIF.`, whyItMatters: "WebP reduce el tamano de imagen un 30% vs JPG. En una web con muchas imagenes, esto significa segundos de diferencia." });
  }

  // Lazy loading
  const imgCount = (html.match(/<img[^>]*>/gi) || []).length;
  if (imgCount > 5 && !html.match(/loading=["']lazy["']/i) && !html.match(/lazyload|lazy-load/i)) {
    issues.push({ id: id++, category: "performance", severity: "major", title: "Sin lazy loading de imagenes", description: "No se detecto lazy loading en las imagenes. Todas se cargan al inicio.", whyItMatters: "Sin lazy loading, todas las imagenes se descargan al entrar, ralentizando la carga inicial de la pagina." });
  }

  // Render-blocking CSS in head without async/preload
  const cssLinks = html.match(/<link[^>]*rel=["']stylesheet["'][^>]*>/gi) || [];
  const renderBlockingCss = cssLinks.filter(link => !link.match(/media=["']print["']/i) && !link.match(/rel=["']preload["']/i));
  if (renderBlockingCss.length > 5) {
    issues.push({ id: id++, category: "performance", severity: "major", title: `${renderBlockingCss.length} hojas de estilo bloqueando el renderizado`, description: `Se detectaron ${renderBlockingCss.length} archivos CSS cargados en el head sin estrategia de carga asincrona.`, whyItMatters: "Cada CSS en el head bloquea el renderizado hasta que se descarga y procesa. Los usuarios ven pantalla blanca." });
  } else if (renderBlockingCss.length > 3) {
    issues.push({ id: id++, category: "performance", severity: "minor", title: `${renderBlockingCss.length} hojas de estilo bloqueando el renderizado`, description: `Se detectaron ${renderBlockingCss.length} archivos CSS en el head.`, whyItMatters: "Multiples CSS bloqueantes retrasan el primer renderizado." });
  }

  // Total page weight estimate
  const estimatedWeight = html.length + (imgCount * 50000); // rough estimate
  if (estimatedWeight > 5000000) {
    issues.push({ id: id++, category: "performance", severity: "major", title: "Peso de pagina estimado excesivo", description: `La pagina tiene ~${imgCount} imagenes y HTML de ${Math.round(html.length / 1024)}KB. El peso total estimado supera los 5MB.`, whyItMatters: "Las paginas muy pesadas son lentas en conexiones moviles y consumen datos del usuario." });
  }

  // LCP from Lighthouse
  if (lighthouse?.lcp) {
    if (lighthouse.lcp > 4) {
      issues.push({ id: id++, category: "performance", severity: "critical", title: `LCP de ${lighthouse.lcp}s — muy lento`, description: `El Largest Contentful Paint es ${lighthouse.lcp}s. Google requiere menos de 2.5s para "bueno" y menos de 4s para "necesita mejora".`, whyItMatters: "Un LCP mayor a 4s se considera pobre. Los usuarios abandonan y Google penaliza el ranking." });
    } else if (lighthouse.lcp > 2.5) {
      issues.push({ id: id++, category: "performance", severity: "major", title: `LCP de ${lighthouse.lcp}s excede el umbral de Google`, description: `El Largest Contentful Paint es ${lighthouse.lcp}s. Google recomienda menos de 2.5s.`, whyItMatters: "Un LCP entre 2.5-4s necesita mejora segun Google. Afecta tanto la experiencia como el ranking." });
    }
  }

  // CLS from Lighthouse
  if (lighthouse?.cls != null && lighthouse.cls > 0.1) {
    issues.push({ id: id++, category: "performance", severity: lighthouse.cls > 0.25 ? "critical" : "major", title: `CLS de ${lighthouse.cls.toFixed(2)} — layout inestable`, description: `El Cumulative Layout Shift es ${lighthouse.cls.toFixed(2)}. Google requiere menos de 0.1 para "bueno".`, whyItMatters: "Los elementos que se mueven mientras la pagina carga causan clics accidentales. Google penaliza CLS alto." });
  }

  // INP from Lighthouse
  if (lighthouse?.inp && lighthouse.inp > 200) {
    issues.push({ id: id++, category: "performance", severity: lighthouse.inp > 500 ? "critical" : "major", title: `INP de ${lighthouse.inp}ms — interactividad lenta`, description: `El Interaction to Next Paint es ${lighthouse.inp}ms. Google requiere menos de 200ms.`, whyItMatters: "Los usuarios sienten que el sitio es lento al hacer clic. Google penaliza INP alto en rankings." });
  }

  // Lighthouse performance score
  if (lighthouse?.performanceScore != null) {
    if (lighthouse.performanceScore < 0.5) {
      issues.push({ id: id++, category: "performance", severity: "critical", title: `Lighthouse Performance: ${Math.round(lighthouse.performanceScore * 100)}/100`, description: `Google Lighthouse califica el rendimiento con ${Math.round(lighthouse.performanceScore * 100)}/100 — nivel pobre.`, whyItMatters: "Una puntuacion Lighthouse inferior a 50 indica problemas graves de rendimiento que afectan directamente al SEO." });
    } else if (lighthouse.performanceScore < 0.75) {
      issues.push({ id: id++, category: "performance", severity: "major", title: `Lighthouse Performance: ${Math.round(lighthouse.performanceScore * 100)}/100`, description: `Google Lighthouse califica el rendimiento con ${Math.round(lighthouse.performanceScore * 100)}/100 — necesita mejora.`, whyItMatters: "Una puntuacion entre 50-74 indica que el rendimiento esta impactando la experiencia de usuario y el ranking." });
    }
  }

  // Compression
  if (!headers["content-encoding"]?.match(/gzip|br|deflate/i)) {
    issues.push({ id: id++, category: "performance", severity: "major", title: "Sin compresion de respuesta (gzip/brotli)", description: "El servidor no envia respuestas comprimidas.", whyItMatters: "Sin compresion, los usuarios descargan 3-5x mas datos de lo necesario, especialmente impactante en moviles." });
  }

  return issues;
}

function checkContent(html: string, allHtml: string): AuditIssue[] {
  const issues: AuditIssue[] = [];
  let id = 6000;

  // Word count check
  const plainText = stripTags(html);
  const words = wordCount(plainText);
  if (words < 300) {
    issues.push({ id: id++, category: "content", severity: "critical", title: `Solo ${words} palabras en la pagina principal`, description: `La pagina tiene aproximadamente ${words} palabras de contenido. Las paginas medicas deben tener minimo 500 palabras.`, whyItMatters: "Google considera paginas con poco contenido como 'thin content'. Para temas medicos, se espera contenido extenso y detallado." });
  } else if (words < 500) {
    issues.push({ id: id++, category: "content", severity: "major", title: `Solo ${words} palabras en la pagina principal`, description: `La pagina tiene aproximadamente ${words} palabras. Se recomiendan al menos 500 para contenido medico.`, whyItMatters: "Las paginas con poco contenido tienen menor autoridad en temas de salud segun las directrices E-E-A-T de Google." });
  }

  // Heading structure quality
  const h2Matches = html.match(/<h2[^>]*>([\s\S]*?)<\/h2>/gi) || [];
  const genericH2s = h2Matches.filter(h => {
    const text = h.replace(/<[^>]+>/g, "").trim().toLowerCase();
    return /^(servicios|services|about|sobre|contacto|contact|home|inicio|mas|more|info)$/i.test(text);
  });
  if (genericH2s.length > 2) {
    issues.push({ id: id++, category: "content", severity: "minor", title: "Encabezados H2 genericos", description: `Se detectaron ${genericH2s.length} encabezados H2 con texto generico como 'Servicios' o 'Contacto'.`, whyItMatters: "Los encabezados descriptivos ayudan a Google a entender el contenido y mejoran el posicionamiento para long-tail keywords." });
  }

  // Contact info - phone (expanded patterns)
  const phonePatterns = /href=["']tel:/i;
  const phoneNumberPatterns = /\+34[\s.-]?\d{2,3}[\s.-]?\d{2,3}[\s.-]?\d{2,3}|\d{3}[\s.-]\d{3}[\s.-]\d{3}|\d{3}[\s.-]\d{2}[\s.-]\d{2}[\s.-]\d{2}|\(\d{3}\)\s*\d{3}[\s.-]\d{3}|9\d{2}\s?\d{3}\s?\d{3}|6\d{2}\s?\d{3}\s?\d{3}/;
  if (!allHtml.match(phonePatterns) && !allHtml.match(phoneNumberPatterns)) {
    issues.push({ id: id++, category: "content", severity: "major", title: "Sin telefono visible", description: "No se detecto numero de telefono visible en la pagina.", whyItMatters: "El telefono es el metodo de contacto preferido para citas medicas. Sin el, los pacientes se van a la competencia." });
  }

  // Hours (expanded patterns)
  const hoursPatterns = /horario|schedule|hours|opening|lunes|monday|L-V|Lun[.-]?Vie|Lu[.-]?Vi|\d{1,2}:\d{2}\s*[-a]\s*\d{1,2}:\d{2}|de\s+\d{1,2}\s+a\s+\d{1,2}/i;
  if (!allHtml.match(hoursPatterns)) {
    issues.push({ id: id++, category: "content", severity: "major", title: "Sin horarios de atencion visibles", description: "No se detectaron horarios de atencion en el sitio.", whyItMatters: "Los pacientes potenciales no saben cuando pueden contactar." });
  }

  // Email (expanded patterns)
  const emailPatterns = /mailto:|[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/;
  if (!allHtml.match(emailPatterns)) {
    issues.push({ id: id++, category: "content", severity: "major", title: "Sin email de contacto visible", description: "No se encontro direccion de email o enlace mailto visible.", whyItMatters: "Los pacientes que prefieren email no tienen alternativa al formulario generico." });
  }

  // Address
  if (!allHtml.match(/direcci[oó]n|address|calle|avda|avenida|plaza|paseo|c\//i)) {
    issues.push({ id: id++, category: "content", severity: "major", title: "Sin direccion fisica visible", description: "No se detecto una direccion fisica del negocio en la pagina.", whyItMatters: "Los pacientes necesitan saber donde esta la clinica. Sin direccion, pierdes busquedas locales 'clinica cerca de mi'." });
  }

  // Services
  if (!allHtml.match(/servicios|procedimientos|tratamientos|services|procedures/i)) {
    issues.push({ id: id++, category: "content", severity: "major", title: "Sin listado claro de servicios/tratamientos", description: "No se detecto una seccion dedicada a servicios o tratamientos.", whyItMatters: "Los pacientes buscan tratamientos especificos. Sin una lista clara, no saben si ofreces lo que necesitan." });
  }

  // Internal linking to services from homepage
  const serviceLinks = (html.match(/<a[^>]*href=["'][^"']*(servicio|tratamiento|procedimiento|service)[^"']*["']/gi) || []).length;
  if (serviceLinks < 2) {
    issues.push({ id: id++, category: "content", severity: "minor", title: "Pocos enlaces internos a servicios desde homepage", description: `Solo se detectaron ${serviceLinks} enlaces a paginas de servicios/tratamientos desde la homepage.`, whyItMatters: "La homepage debe enlazar claramente a las paginas de servicios para distribuir autoridad SEO y facilitar la navegacion." });
  }

  // FAQ content
  if (!allHtml.match(/preguntas frecuentes|faq|preguntas.*respuestas/i)) {
    issues.push({ id: id++, category: "content", severity: "major", title: "Sin seccion de preguntas frecuentes", description: "No se detecto una seccion de FAQ en el sitio.", whyItMatters: "Las FAQ resuelven dudas, generan confianza y son el contenido mas citado por la IA cuando los pacientes preguntan." });
  }

  // About / Team
  if (!allHtml.match(/equipo|team|sobre nosotros|about|qui[eé]nes somos|nuestro equipo/i)) {
    issues.push({ id: id++, category: "content", severity: "major", title: "Sin pagina de equipo/sobre nosotros", description: "No se detecto informacion sobre el equipo medico o la historia del negocio.", whyItMatters: "Los pacientes quieren saber quien les va a tratar. Sin esta info, la confianza se reduce drasticamente." });
  }

  // Blog/content
  if (!allHtml.match(/blog|art[ií]culo|article|noticias|news/i)) {
    issues.push({ id: id++, category: "content", severity: "opportunity", title: "Sin blog o contenido educativo", description: "No se detecto seccion de blog o articulos educativos.", whyItMatters: "El contenido educativo posiciona como autoridad, atrae trafico organico y alimenta a la IA con informacion citable." });
  }

  // Pricing
  if (!allHtml.match(/precio|tarifa|coste|cost|price|€|desde\s*\d/i)) {
    issues.push({ id: id++, category: "content", severity: "opportunity", title: "Sin informacion de precios o tarifas", description: "No se detecto informacion de precios o rangos de costes.", whyItMatters: "Los pacientes investigan precios antes de contactar. Sin transparencia de costes, contactan a competidores que si los muestran." });
  }

  // CTAs with strong action words
  const ctaPatterns = /reserv|cit[ae]|appointment|book|contact|consult|pide|solicita|llam[ae]|agenda|program/gi;
  const ctas = (allHtml.match(ctaPatterns) || []).length;
  if (ctas < 2) {
    issues.push({ id: id++, category: "content", severity: "major", title: "Pocos calls-to-action visibles", description: "Se detectaron menos de 2 llamadas a la accion (reservar, consultar, contactar).", whyItMatters: "Sin CTAs claros y frecuentes, los visitantes no saben como dar el siguiente paso para convertirse en pacientes." });
  }

  // Forms (contact forms)
  const hasForms = !!allHtml.match(/<form[^>]*>/i);
  if (!hasForms) {
    issues.push({ id: id++, category: "content", severity: "critical", title: "Sin formulario de contacto", description: "No se detecto ningun formulario de contacto en el sitio.", whyItMatters: "Un formulario de contacto es critico para conversion. Los pacientes que no quieren llamar necesitan una alternativa digital." });
  }

  // Video content
  if (!allHtml.match(/<video|youtube\.com|vimeo\.com|wistia|embed.*video/i)) {
    issues.push({ id: id++, category: "content", severity: "opportunity", title: "Sin contenido de video", description: "No se detecto contenido de video en el sitio.", whyItMatters: "Los sitios medicos modernos usan video para explicar procedimientos y generar confianza. Google prioriza paginas con video." });
  }

  // Patient journey (before -> consultation -> procedure -> aftercare)
  const hasBeforeInfo = !!allHtml.match(/antes de|preparaci[oó]n|previo|before/i);
  const hasConsultation = !!allHtml.match(/consulta|valoraci[oó]n|primera visita|consultation/i);
  const hasProcedure = !!allHtml.match(/procedimiento|durante|proceso|treatment process/i);
  const hasAftercare = !!allHtml.match(/post.*operatorio|recuperaci[oó]n|cuidados|despu[eé]s|aftercare|post.*treatment/i);
  const journeySteps = [hasBeforeInfo, hasConsultation, hasProcedure, hasAftercare].filter(Boolean).length;
  if (journeySteps < 2) {
    issues.push({ id: id++, category: "content", severity: "opportunity", title: "Sin recorrido del paciente documentado", description: `Solo se detectaron ${journeySteps}/4 etapas del recorrido del paciente (preparacion, consulta, procedimiento, post-cuidado).`, whyItMatters: "Documentar el recorrido completo del paciente genera confianza y reduce la ansiedad previa a los tratamientos." });
  }

  return issues;
}

function checkTrust(html: string, allHtml: string): AuditIssue[] {
  const issues: AuditIssue[] = [];
  let id = 7000;

  // Privacy policy
  if (!allHtml.match(/privacidad|privacy|protecci[oó]n de datos|pol[ií]tica de privacidad/i)) {
    issues.push({ id: id++, category: "trust", severity: "major", title: "Sin politica de privacidad visible", description: "No se detecto enlace a politica de privacidad o proteccion de datos.", whyItMatters: "Los pacientes que envian informacion de salud esperan garantias de privacidad. Ademas, es obligatorio por RGPD." });
  }

  // Legal notice
  if (!allHtml.match(/aviso legal|legal notice|t[eé]rminos|condiciones|terms/i)) {
    issues.push({ id: id++, category: "trust", severity: "major", title: "Sin aviso legal", description: "No se detecto enlace a aviso legal o terminos y condiciones.", whyItMatters: "El aviso legal es obligatorio en Espana. Su ausencia genera desconfianza y riesgo legal." });
  }

  // Cookie policy
  if (!allHtml.match(/cookie|pol[ií]tica de cookies/i)) {
    issues.push({ id: id++, category: "trust", severity: "major", title: "Sin politica de cookies", description: "No se detecto aviso de cookies o politica de cookies.", whyItMatters: "La politica de cookies es obligatoria por la ley europea. Su ausencia implica incumplimiento del RGPD." });
  }

  // Reviews/testimonials
  if (!allHtml.match(/testimonios|rese[nñ]as|opiniones|reviews|testimonials/i)) {
    issues.push({ id: id++, category: "trust", severity: "critical", title: "Sin testimonios o resenas de pacientes", description: "No se detectaron testimonios o resenas de pacientes en el sitio.", whyItMatters: "El 84% de las personas confian tanto en resenas online como en recomendaciones personales. Sin testimonios, la confianza cae en picado." });
  }

  // Certifications
  if (!allHtml.match(/certificad|acreditad|colegiado|certif|titulaci[oó]n|cualificaci[oó]n/i)) {
    issues.push({ id: id++, category: "trust", severity: "major", title: "Sin certificaciones profesionales visibles", description: "No se detectaron menciones de certificaciones, acreditaciones o colegiacion.", whyItMatters: "Para servicios medicos, las certificaciones son criticas. Los pacientes necesitan saber que el profesional esta cualificado." });
  }

  // Medical license number
  if (!allHtml.match(/n[uú]mero de colegiado|n\.?\s*colegiado|colegiado\s*n|licencia\s*m[eé]dica|registro\s*sanitario|CESS|centro\s*sanitario/i)) {
    issues.push({ id: id++, category: "trust", severity: "major", title: "Sin numero de colegiado/registro sanitario", description: "No se detecto numero de colegiado medico o registro sanitario del centro.", whyItMatters: "En Espana, es obligatorio mostrar el numero de registro sanitario. Su ausencia genera desconfianza y puede ser una infraccion." });
  }

  // Social proof / social media
  if (!allHtml.match(/instagram|facebook|tiktok|linkedin|youtube/i)) {
    issues.push({ id: id++, category: "trust", severity: "minor", title: "Sin enlaces a redes sociales", description: "No se detectaron enlaces a perfiles de redes sociales activos.", whyItMatters: "Las redes sociales activas verifican que el negocio es real y activo." });
  }

  // Google Maps / location embed
  if (!allHtml.match(/maps\.google|google\.com\/maps|maps-embed|gmaps|iframe[^>]*map/i)) {
    issues.push({ id: id++, category: "trust", severity: "minor", title: "Sin mapa de ubicacion embebido", description: "No se detecto un mapa de Google Maps embebido.", whyItMatters: "Un mapa embebido facilita encontrar la clinica y anade credibilidad visual de ubicacion real." });
  }

  // Before/after gallery
  if (!allHtml.match(/antes.*despu[eé]s|before.*after|galer[ií]a|gallery|resultados/i)) {
    issues.push({ id: id++, category: "trust", severity: "opportunity", title: "Sin galeria de resultados antes/despues", description: "No se detecto galeria de resultados o fotos de antes y despues.", whyItMatters: "Las fotos de resultados son la prueba mas convincente en medicina estetica. Sin ellas, los pacientes no ven evidencia de tu trabajo." });
  }

  // Professional presentation
  if (!allHtml.match(/doctor|dra?\.|m[eé]dico|profesional.*equipo|cirujan/i)) {
    issues.push({ id: id++, category: "trust", severity: "major", title: "Sin presentacion del profesional medico", description: "No se detecto presentacion clara del profesional o equipo medico.", whyItMatters: "Los pacientes quieren ver y conocer a quien les va a tratar. Sin cara profesional, la confianza es minima." });
  }

  // SSL check (URL should be HTTPS)
  // Already implied by fetching, but check if mixed content exists
  if (allHtml.match(/src=["']http:\/\//i) || allHtml.match(/href=["']http:\/\/[^"']*\.(css|js)/i)) {
    issues.push({ id: id++, category: "trust", severity: "major", title: "Contenido mixto HTTP/HTTPS", description: "Se detectaron recursos cargados por HTTP inseguro en una pagina HTTPS.", whyItMatters: "El contenido mixto genera advertencias de seguridad en el navegador y reduce la confianza del paciente." });
  }

  // Awards/memberships
  if (!allHtml.match(/premio|award|miembro|member|asociaci[oó]n|sociedad|society|SEME|SECPRE|AECEP/i)) {
    issues.push({ id: id++, category: "trust", severity: "opportunity", title: "Sin premios o membresías profesionales", description: "No se detectaron menciones de premios, reconocimientos o membresias en sociedades profesionales.", whyItMatters: "Las membresías en sociedades medicas y premios profesionales refuerzan la credibilidad ante pacientes y Google." });
  }

  // Insurance/financing
  if (!allHtml.match(/financiaci[oó]n|seguro|insurance|financing|plazos|cuotas|pago.*mensual/i)) {
    issues.push({ id: id++, category: "trust", severity: "opportunity", title: "Sin informacion de financiacion/seguros", description: "No se detecto informacion sobre opciones de financiacion o seguros aceptados.", whyItMatters: "La informacion de financiacion reduce la barrera de precio y aumenta las conversiones." });
  }

  // Copyright freshness
  const currentYear = new Date().getFullYear();
  const copyrightMatch = allHtml.match(/©\s*(\d{4})|copyright\s*(\d{4})/i);
  if (copyrightMatch) {
    const year = parseInt(copyrightMatch[1] || copyrightMatch[2]);
    if (year < currentYear - 1) {
      issues.push({ id: id++, category: "trust", severity: "minor", title: `Copyright desactualizado (${year})`, description: `El copyright muestra el ano ${year}. El sitio parece desactualizado.`, whyItMatters: "Un copyright antiguo da la impresion de que el sitio esta abandonado, reduciendo la confianza del paciente." });
    }
  }

  // Stock photos detection
  const imgSrcs = allHtml.match(/src=["']([^"']+)["']/gi) || [];
  const stockIndicators = imgSrcs.filter(src =>
    /shutterstock|istock|istockphoto|unsplash|pexels|depositphoto|dreamstime|stock|getty/i.test(src)
  );
  if (stockIndicators.length > 2) {
    issues.push({ id: id++, category: "trust", severity: "major", title: `${stockIndicators.length} posibles fotos de stock detectadas`, description: "Se detectaron imagenes con nombres que sugieren fotos de stock (shutterstock, istock, unsplash, etc.).", whyItMatters: "Las fotos de stock reducen la autenticidad. Los pacientes quieren ver las instalaciones y equipo real de la clinica." });
  } else if (stockIndicators.length > 0) {
    issues.push({ id: id++, category: "trust", severity: "minor", title: `${stockIndicators.length} posible foto de stock detectada`, description: "Se detectaron imagenes con nombres que sugieren fotos de stock.", whyItMatters: "Las fotos profesionales reales generan mas confianza que las imagenes de stock." });
  }

  return issues;
}

function checkTechnical(html: string, headers: Record<string, string>, robotsTxt?: string | null, sitemapXml?: string | null): AuditIssue[] {
  const issues: AuditIssue[] = [];
  let id = 8000;

  // Security headers
  const securityHeaders = ["content-security-policy", "x-frame-options", "x-content-type-options"];
  const missingHeaders = securityHeaders.filter(h => !headers[h]);
  if (missingHeaders.length === 3) {
    issues.push({ id: id++, category: "technical", severity: "critical", title: "Sin ningun header de seguridad", description: "No se detectaron headers de seguridad: CSP, X-Frame-Options, X-Content-Type-Options.", whyItMatters: "El sitio es vulnerable a ataques XSS, clickjacking e inyeccion de contenido. Para un negocio que recopila datos de salud, es inaceptable." });
  } else if (missingHeaders.length > 0) {
    issues.push({ id: id++, category: "technical", severity: "major", title: `${missingHeaders.length} headers de seguridad faltantes`, description: `No se detectaron: ${missingHeaders.join(", ")}`, whyItMatters: "Los headers faltantes dejan el sitio vulnerable a ataques comunes." });
  }

  // HSTS
  if (!headers["strict-transport-security"]) {
    issues.push({ id: id++, category: "technical", severity: "major", title: "Sin header HSTS", description: "No se detecto Strict-Transport-Security header.", whyItMatters: "Sin HSTS, los usuarios pueden acceder por HTTP inseguro y los datos pueden ser interceptados." });
  }

  // robots.txt - actually verify
  if (robotsTxt == null) {
    issues.push({ id: id++, category: "technical", severity: "major", title: "Sin archivo robots.txt", description: "No se encontro archivo robots.txt en el sitio.", whyItMatters: "Sin robots.txt, los motores de busqueda no tienen directivas de rastreo y pueden indexar contenido no deseado." });
  } else {
    // Check if robots.txt is properly configured
    if (!robotsTxt.match(/user-agent/i)) {
      issues.push({ id: id++, category: "technical", severity: "major", title: "robots.txt mal configurado", description: "El archivo robots.txt existe pero no contiene directivas User-agent validas.", whyItMatters: "Un robots.txt sin directivas User-agent no proporciona instrucciones utiles a los rastreadores." });
    }
    if (robotsTxt.match(/disallow:\s*\/\s*$/im)) {
      issues.push({ id: id++, category: "technical", severity: "critical", title: "robots.txt bloquea todo el sitio", description: "El robots.txt contiene 'Disallow: /' que bloquea el rastreo de todo el sitio.", whyItMatters: "Con esta directiva, Google no puede rastrear ni indexar ninguna pagina del sitio." });
    }
    if (!robotsTxt.match(/sitemap/i)) {
      issues.push({ id: id++, category: "technical", severity: "minor", title: "robots.txt sin referencia a sitemap", description: "El robots.txt no incluye referencia a sitemap.xml.", whyItMatters: "Incluir la URL del sitemap en robots.txt ayuda a Google a descubrirlo mas facilmente." });
    }
  }

  // sitemap.xml - actually verify
  if (sitemapXml == null) {
    issues.push({ id: id++, category: "technical", severity: "major", title: "Sin archivo sitemap.xml", description: "No se encontro archivo sitemap.xml en el sitio.", whyItMatters: "Un sitemap ayuda a Google a descubrir todas las paginas del sitio." });
  } else {
    // Check if sitemap has URLs
    const urlMatches = sitemapXml.match(/<url>/gi) || sitemapXml.match(/<loc>/gi) || [];
    if (urlMatches.length === 0) {
      issues.push({ id: id++, category: "technical", severity: "major", title: "sitemap.xml sin URLs", description: "El sitemap.xml existe pero no contiene ninguna URL.", whyItMatters: "Un sitemap vacio no ayuda a Google a descubrir paginas." });
    } else if (urlMatches.length < 5) {
      issues.push({ id: id++, category: "technical", severity: "minor", title: `sitemap.xml con solo ${urlMatches.length} URLs`, description: `El sitemap contiene solo ${urlMatches.length} URLs. La mayoria de sitios medicos deberian tener mas paginas indexadas.`, whyItMatters: "Un sitemap con pocas URLs sugiere que muchas paginas no estan incluidas para indexacion." });
    }
  }

  // Analytics
  const analytics: string[] = [];
  if (html.match(/google-analytics|gtag|googletagmanager/i)) analytics.push("Google Analytics/GTM");
  if (html.match(/facebook.*pixel|fbq/i)) analytics.push("Facebook Pixel");
  if (html.match(/clarity/i)) analytics.push("Microsoft Clarity");
  if (html.match(/hotjar/i)) analytics.push("Hotjar");
  if (analytics.length > 2) {
    issues.push({ id: id++, category: "technical", severity: "minor", title: `${analytics.length} servicios de analytics superpuestos`, description: `Se detectaron: ${analytics.join(", ")}`, whyItMatters: "Multiples analytics disparan eventos duplicados, inflan datos y degradan rendimiento." });
  }
  if (analytics.length === 0) {
    issues.push({ id: id++, category: "technical", severity: "major", title: "Sin analytics detectados", description: "No se detecto Google Analytics, GTM u otro sistema de analitica web.", whyItMatters: "Sin analytics, no puedes medir trafico, conversiones ni el ROI de tu presencia online." });
  }

  // WordPress specific
  if (html.match(/wp-content|wordpress/i)) {
    if (html.match(/wp-includes|wp-emoji/i)) {
      issues.push({ id: id++, category: "technical", severity: "minor", title: "Version de WordPress expuesta", description: "Se detectan archivos internos de WordPress que revelan la plataforma y posiblemente la version.", whyItMatters: "Exponer la version de WordPress facilita ataques dirigidos a vulnerabilidades conocidas." });
    }
    const pluginMatches = html.match(/wp-content\/plugins\/([^/"]+)/gi) || [];
    const uniquePlugins = new Set(pluginMatches.map(p => p.split("/plugins/")[1]));
    if (uniquePlugins.size > 10) {
      issues.push({ id: id++, category: "technical", severity: "major", title: `${uniquePlugins.size} plugins de WordPress detectados`, description: `Se detectaron ${uniquePlugins.size} plugins activos de WordPress.`, whyItMatters: "Muchos plugins aumentan la superficie de ataque, degradan rendimiento y complican el mantenimiento." });
    }
  }

  // HTTPS mixed content
  if (html.match(/http:\/\/[^"'\s]*\.(css|js)/i)) {
    issues.push({ id: id++, category: "technical", severity: "major", title: "Recursos cargados por HTTP inseguro", description: "Se detectaron archivos CSS o JS cargados por HTTP en lugar de HTTPS.", whyItMatters: "Los recursos HTTP en una pagina HTTPS causan 'mixed content' warnings y pueden ser interceptados." });
  }

  // CDN usage
  const cdnPatterns = /cloudflare|cdn\.|akamai|fastly|cloudfront|stackpath|bunny\.net|jsdelivr|cdnjs/i;
  if (!html.match(cdnPatterns)) {
    issues.push({ id: id++, category: "technical", severity: "minor", title: "Sin CDN detectado", description: "No se detecto el uso de una CDN (Content Delivery Network).", whyItMatters: "Una CDN acelera la carga de recursos estaticos al servirlos desde servidores cercanos al usuario." });
  }

  // Minified CSS/JS check (simple heuristic: look for .min. in filenames)
  const cssJsFiles = html.match(/\.(css|js)["'\s?]/gi) || [];
  const minifiedFiles = html.match(/\.min\.(css|js)["'\s?]/gi) || [];
  if (cssJsFiles.length > 4 && minifiedFiles.length === 0) {
    issues.push({ id: id++, category: "technical", severity: "minor", title: "CSS/JS posiblemente sin minificar", description: "Se detectaron archivos CSS/JS sin indicador de minificacion (.min.).", whyItMatters: "Los archivos sin minificar pesan mas y tardan mas en descargarse." });
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

  // More aggressive deductions
  let score = 100 - (criticals * 25) - (majors * 10) - (minors * 4) - (opps * 2);

  // Lighthouse integration with higher weights
  if (key === "performance" && lighthouse?.performanceScore != null) {
    score = Math.round(lighthouse.performanceScore * 100 * 0.6 + score * 0.4);
  }
  if (key === "seo" && lighthouse?.seoScore != null) {
    score = Math.round(lighthouse.seoScore * 100 * 0.4 + score * 0.6);
  }
  if (key === "accessibility" && lighthouse?.accessibilityScore != null) {
    score = Math.round(lighthouse.accessibilityScore * 100 * 0.5 + score * 0.5);
  }

  // Strict caps
  if (criticals > 0) score = Math.min(score, 45);
  if (criticals > 1) score = Math.min(score, 35);
  if (majors >= 3) score = Math.min(score, 60);
  if (majors >= 5) score = Math.min(score, 50);

  return Math.max(0, Math.min(100, score));
}

// ---- MAIN ANALYZER ----

const CATEGORY_META: Record<CategoryKey, { label: string; icon: string }> = {
  mobile: { label: "Mobile y Responsividad", icon: "📱" },
  seo: { label: "SEO y Visibilidad en Busquedas", icon: "🔍" },
  llm: { label: "LLM y Preparacion para IA", icon: "🤖" },
  accessibility: { label: "Accesibilidad (WCAG 2.1 AA)", icon: "♿" },
  performance: { label: "Rendimiento", icon: "⚡" },
  content: { label: "Contenido y Arquitectura", icon: "📄" },
  trust: { label: "Confianza y Credibilidad", icon: "🛡️" },
  technical: { label: "Implementacion Tecnica", icon: "⚙️" },
};

export function analyzeWebsite(input: AnalysisInput): AnalysisResult {
  const { html, url, headers, lighthouseData, robotsTxt, sitemapXml, llmsTxt, subpages } = input;

  // Combine all HTML for cross-page checks
  const allHtml = getAllHtml(html, subpages);

  // Run all checks
  const allIssues: AuditIssue[] = [
    ...checkMobile(html, allHtml),
    ...checkSEO(html, url, allHtml, robotsTxt, sitemapXml),
    ...checkLLM(html, allHtml, llmsTxt),
    ...checkAccessibility(html, lighthouseData),
    ...checkPerformance(html, headers, lighthouseData),
    ...checkContent(html, allHtml),
    ...checkTrust(html, allHtml),
    ...checkTechnical(html, headers, robotsTxt, sitemapXml),
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

  const summary = `Se han identificado ${allIssues.length} problemas en 8 categorias que afectan la visibilidad digital. Las areas mas criticas incluyen ${worstCategories}. ${criticalCount > 0 ? `Hay ${criticalCount} problemas criticos que requieren atencion inmediata. ` : ""}${allIssues.filter(i => i.category === "llm").length > 5 ? "El sitio tiene deficiencias significativas en preparacion para IA, lo que significa que asistentes como ChatGPT y Gemini no pueden descubrirlo ni recomendarlo. " : ""}El sitio necesita optimizacion para competir efectivamente en el panorama digital actual.`;

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
      fcp: lighthouseData?.fcp ?? null,
      tbt: lighthouseData?.tbt ?? null,
      si: lighthouseData?.si ?? null,
    },
    summary,
  };
}

import { NextRequest, NextResponse } from "next/server";
import { analyzeWebsite } from "@/lib/analyzer";
import { saveAudit, generateSlug, type StoredAudit } from "@/lib/storage";

export async function POST(req: NextRequest) {
  try {
    const { url, businessName } = await req.json();

    if (!url) {
      return NextResponse.json({ error: "URL es requerida" }, { status: 400 });
    }

    // Normalize URL
    let normalizedUrl = url;
    if (!normalizedUrl.startsWith("http")) {
      normalizedUrl = "https://" + normalizedUrl;
    }

    // Fetch the website HTML
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 15000);

    let html = "";
    let responseHeaders: Record<string, string> = {};

    try {
      const response = await fetch(normalizedUrl, {
        signal: controller.signal,
        headers: {
          "User-Agent": "Mozilla/5.0 (compatible; LiderifyBot/1.0; +https://liderify.com/bot)",
        },
      });
      clearTimeout(timeout);

      html = await response.text();

      // Collect headers
      response.headers.forEach((value, key) => {
        responseHeaders[key.toLowerCase()] = value;
      });
    } catch (fetchError) {
      clearTimeout(timeout);
      return NextResponse.json({
        error: "No se pudo acceder al sitio web",
        details: String(fetchError),
      }, { status: 502 });
    }

    // Fetch additional resources in parallel (non-blocking)
    const baseUrl = new URL(normalizedUrl);
    const origin = baseUrl.origin;

    const fetchWithTimeout = async (fetchUrl: string, timeoutMs = 8000): Promise<string | null> => {
      try {
        const resp = await fetch(fetchUrl, {
          signal: AbortSignal.timeout(timeoutMs),
          headers: {
            "User-Agent": "Mozilla/5.0 (compatible; LiderifyBot/1.0; +https://liderify.com/bot)",
          },
        });
        if (resp.ok) {
          return await resp.text();
        }
        return null;
      } catch {
        return null;
      }
    };

    // Fetch robots.txt, sitemap.xml, llms.txt in parallel
    const [robotsTxt, sitemapXml, llmsTxt] = await Promise.all([
      fetchWithTimeout(`${origin}/robots.txt`),
      fetchWithTimeout(`${origin}/sitemap.xml`),
      fetchWithTimeout(`${origin}/llms.txt`),
    ]);

    // Extract up to 3 internal links from homepage and fetch them
    const subpages: { url: string; html: string }[] = [];
    try {
      const internalLinks: string[] = [];
      const linkRegex = /<a[^>]*href=["']([^"'#]+)["'][^>]*>/gi;
      let linkMatch;
      while ((linkMatch = linkRegex.exec(html)) !== null && internalLinks.length < 10) {
        const href = linkMatch[1];
        try {
          const resolved = new URL(href, normalizedUrl);
          if (
            resolved.hostname === baseUrl.hostname &&
            resolved.pathname !== "/" &&
            resolved.pathname !== baseUrl.pathname &&
            !resolved.pathname.match(/\.(jpg|jpeg|png|gif|svg|webp|pdf|zip|css|js)$/i) &&
            !internalLinks.includes(resolved.href)
          ) {
            internalLinks.push(resolved.href);
          }
        } catch {
          // invalid URL, skip
        }
      }

      // Prioritize service/treatment pages, about pages, contact pages
      const prioritized = internalLinks.sort((a, b) => {
        const priority = (u: string) => {
          const lower = u.toLowerCase();
          if (lower.match(/servicio|tratamiento|procedimiento|service/)) return 0;
          if (lower.match(/contacto|contact/)) return 1;
          if (lower.match(/sobre|about|equipo|team/)) return 2;
          if (lower.match(/blog|articulo|article/)) return 3;
          return 4;
        };
        return priority(a) - priority(b);
      });

      // Fetch up to 3 subpages in parallel
      const subpageUrls = prioritized.slice(0, 3);
      const subpageResults = await Promise.all(
        subpageUrls.map(async (spUrl) => {
          const spHtml = await fetchWithTimeout(spUrl, 8000);
          if (spHtml) {
            return { url: spUrl, html: spHtml };
          }
          return null;
        })
      );

      for (const sp of subpageResults) {
        if (sp) subpages.push(sp);
      }
    } catch {
      // Subpage extraction failed, continue without
    }

    // Get Lighthouse data via Google PageSpeed API (works without key, with rate limits)
    let lighthouseData = undefined;
    const pagespeedKey = process.env.GOOGLE_PAGESPEED_API_KEY;

    try {
      let psUrl = `https://www.googleapis.com/pagespeedonline/v5/runPagespeed?url=${encodeURIComponent(normalizedUrl)}&strategy=mobile&category=performance&category=seo&category=accessibility&category=best-practices`;
      if (pagespeedKey) {
        psUrl += `&key=${pagespeedKey}`;
      }
      const psResponse = await fetch(psUrl, { signal: AbortSignal.timeout(30000) });
      const psData = await psResponse.json();

      if (psData.lighthouseResult || psData.loadingExperience) {
        const lr = psData.lighthouseResult || {};
        const cats = lr.categories || {};
        const auds = lr.audits || {};

        // Field data (real users) - preferred for INP
        const fieldMetrics = psData.loadingExperience?.metrics || {};

        // Lab LCP (ms -> seconds)
        const labLcp = auds["largest-contentful-paint"]?.numericValue
          ? Math.round((auds["largest-contentful-paint"].numericValue / 1000) * 10) / 10
          : undefined;
        // Field LCP (ms -> seconds)
        const fieldLcp = fieldMetrics["LARGEST_CONTENTFUL_PAINT_MS"]?.percentile
          ? Math.round((fieldMetrics["LARGEST_CONTENTFUL_PAINT_MS"].percentile / 1000) * 10) / 10
          : undefined;

        // Lab CLS
        const labCls = auds["cumulative-layout-shift"]?.numericValue != null
          ? Math.round(auds["cumulative-layout-shift"].numericValue * 100) / 100
          : undefined;
        // Field CLS (already 0-1 scale, but stored as integer like 0 = 0.00)
        const fieldCls = fieldMetrics["CUMULATIVE_LAYOUT_SHIFT_SCORE"]?.percentile != null
          ? Math.round(fieldMetrics["CUMULATIVE_LAYOUT_SHIFT_SCORE"].percentile) / 100
          : undefined;

        // INP - prefer field data (lab doesn't have it usually)
        const labInp = auds["interaction-to-next-paint"]?.numericValue != null
          ? Math.round(auds["interaction-to-next-paint"].numericValue)
          : undefined;
        const fieldInp = fieldMetrics["INTERACTION_TO_NEXT_PAINT"]?.percentile != null
          ? fieldMetrics["INTERACTION_TO_NEXT_PAINT"].percentile
          : undefined;

        // FCP
        const labFcp = auds["first-contentful-paint"]?.numericValue
          ? Math.round((auds["first-contentful-paint"].numericValue / 1000) * 10) / 10
          : undefined;
        const fieldFcp = fieldMetrics["FIRST_CONTENTFUL_PAINT_MS"]?.percentile
          ? Math.round((fieldMetrics["FIRST_CONTENTFUL_PAINT_MS"].percentile / 1000) * 10) / 10
          : undefined;

        // TBT (lab only, ms)
        const tbt = auds["total-blocking-time"]?.numericValue != null
          ? Math.round(auds["total-blocking-time"].numericValue)
          : undefined;

        // Speed Index (lab only, ms -> seconds)
        const si = auds["speed-index"]?.numericValue
          ? Math.round((auds["speed-index"].numericValue / 1000) * 10) / 10
          : undefined;

        lighthouseData = {
          // Use field data when available, fallback to lab
          lcp: fieldLcp ?? labLcp,
          cls: fieldCls ?? labCls,
          inp: fieldInp ?? labInp,
          fcp: fieldFcp ?? labFcp,
          tbt,
          si,
          performanceScore: cats.performance?.score ?? undefined,
          seoScore: cats.seo?.score ?? undefined,
          accessibilityScore: cats.accessibility?.score ?? undefined,
          bestPracticesScore: cats["best-practices"]?.score ?? undefined,
        };
      }
    } catch {
      // PageSpeed failed, continue without it
    }

    // Run analysis with all collected data
    const result = analyzeWebsite({
      url: normalizedUrl,
      html,
      headers: responseHeaders,
      lighthouseData,
      robotsTxt,
      sitemapXml,
      llmsTxt,
      subpages,
    });

    // Determine business name
    const name = businessName || extractTitleFromHTML(html) || new URL(normalizedUrl).hostname;
    const slug = generateSlug(name);

    // Save audit to storage
    const now = new Date();
    const dateStr = now.toLocaleDateString("es-ES", { day: "numeric", month: "long", year: "numeric" });

    const audit: StoredAudit = {
      id: `audit-${Date.now()}`,
      slug,
      businessName: name,
      siteUrl: normalizedUrl,
      auditDate: dateStr,
      overallScore: result.overallScore,
      overallGrade: result.overallGrade,
      totalIssues: result.totalIssues,
      criticalCount: result.criticalCount,
      majorCount: result.majorCount,
      minorCount: result.minorCount,
      oppsCount: result.oppsCount,
      categories: result.categories,
      issues: result.issues,
      vitals: result.vitals,
      summary: result.summary,
      viewCount: 0,
      ctaClicks: 0,
      createdAt: now.toISOString(),
    };

    saveAudit(audit);

    return NextResponse.json({
      success: true,
      url: normalizedUrl,
      slug,
      auditUrl: `/audit/${slug}`,
      ...result,
    });
  } catch (error) {
    return NextResponse.json(
      { error: "Error interno del servidor", details: String(error) },
      { status: 500 }
    );
  }
}

function extractTitleFromHTML(html: string): string | null {
  const match = html.match(/<title[^>]*>([^<]+)<\/title>/i);
  if (match) {
    let title = match[1].trim();
    // Remove common suffixes
    title = title.replace(/\s*[-|–—]\s*.{0,30}$/, "").trim();
    if (title.length > 3 && title.length < 100) return title;
  }
  return null;
}

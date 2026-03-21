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

    // Run analysis
    const result = analyzeWebsite({
      url: normalizedUrl,
      html,
      headers: responseHeaders,
      lighthouseData,
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

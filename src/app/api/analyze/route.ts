import { NextRequest, NextResponse } from "next/server";
import { analyzeWebsite } from "@/lib/analyzer";

export async function POST(req: NextRequest) {
  try {
    const { url } = await req.json();

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

    // Try to get Lighthouse data via Google PageSpeed API
    let lighthouseData = undefined;
    const pagespeedKey = process.env.GOOGLE_PAGESPEED_API_KEY;

    if (pagespeedKey) {
      try {
        const psUrl = `https://www.googleapis.com/pagespeedonline/v5/runPagespeed?url=${encodeURIComponent(normalizedUrl)}&key=${pagespeedKey}&strategy=mobile&category=performance&category=seo&category=accessibility&category=best-practices`;
        const psResponse = await fetch(psUrl);
        const psData = await psResponse.json();

        if (psData.lighthouseResult) {
          const lr = psData.lighthouseResult;
          const categories = lr.categories || {};
          const audits = lr.audits || {};

          lighthouseData = {
            lcp: audits["largest-contentful-paint"]?.numericValue
              ? audits["largest-contentful-paint"].numericValue / 1000
              : undefined,
            cls: audits["cumulative-layout-shift"]?.numericValue ?? undefined,
            inp: audits["interaction-to-next-paint"]?.numericValue ?? undefined,
            performanceScore: categories.performance?.score ?? undefined,
            seoScore: categories.seo?.score ?? undefined,
            accessibilityScore: categories.accessibility?.score ?? undefined,
            bestPracticesScore: categories["best-practices"]?.score ?? undefined,
          };
        }
      } catch {
        // PageSpeed failed, continue without it
      }
    }

    // Run analysis
    const result = analyzeWebsite({
      url: normalizedUrl,
      html,
      headers: responseHeaders,
      lighthouseData,
    });

    return NextResponse.json({
      success: true,
      url: normalizedUrl,
      ...result,
    });
  } catch (error) {
    return NextResponse.json(
      { error: "Error interno del servidor", details: String(error) },
      { status: 500 }
    );
  }
}

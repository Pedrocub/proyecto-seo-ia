import { NextRequest, NextResponse } from "next/server";
import { addLeads, type StoredLead } from "@/lib/storage";

interface PlaceResult {
  businessName: string;
  address: string;
  phone?: string;
  website?: string;
  rating?: number;
  reviewCount?: number;
  mapsUrl?: string;
  placeId?: string;
}

export async function POST(req: NextRequest) {
  try {
    const { query, city, category } = await req.json();

    if (!query || !city) {
      return NextResponse.json(
        { error: "query y city son requeridos" },
        { status: 400 }
      );
    }

    const apiKey = process.env.GOOGLE_PLACES_API_KEY;
    let results: PlaceResult[];
    let source: string;

    if (apiKey) {
      // Use official Google Places API
      results = await searchWithGoogleAPI(apiKey, query, city);
      source = "google_places";
    } else {
      // Use SerpAPI or free alternative
      const serpKey = process.env.SERPAPI_KEY;
      if (serpKey) {
        results = await searchWithSerpAPI(serpKey, query, city);
        source = "serpapi";
      } else {
        // Use Google Maps search via outscraper or direct fetch
        results = await searchWithDirectScrape(query, city);
        source = "direct_scrape";
      }
    }

    if (results.length === 0) {
      return NextResponse.json({
        success: false,
        error: "No se encontraron resultados. Verifica la búsqueda o configura GOOGLE_PLACES_API_KEY o SERPAPI_KEY en las variables de entorno.",
        leads: [],
      });
    }

    // Save leads to storage
    const newLeads: StoredLead[] = results.map((r, i) => ({
      id: `lead-${Date.now()}-${i}`,
      businessName: r.businessName,
      phone: r.phone,
      website: r.website,
      address: r.address || "",
      city,
      category: category || "medicina-estetica",
      rating: r.rating,
      reviewCount: r.reviewCount,
      mapsUrl: r.mapsUrl,
      status: "new",
      createdAt: new Date().toISOString(),
    }));

    addLeads(newLeads);

    return NextResponse.json({
      success: true,
      source,
      count: results.length,
      leads: newLeads,
    });
  } catch (error) {
    return NextResponse.json(
      { error: "Error interno del servidor", details: String(error) },
      { status: 500 }
    );
  }
}

// Option 1: Google Places API (official, needs API key)
async function searchWithGoogleAPI(apiKey: string, query: string, city: string): Promise<PlaceResult[]> {
  const searchQuery = `${query} ${city}`;
  const textSearchUrl = `https://maps.googleapis.com/maps/api/place/textsearch/json?query=${encodeURIComponent(searchQuery)}&key=${apiKey}&language=es`;

  const searchResponse = await fetch(textSearchUrl);
  const searchData = await searchResponse.json();

  if (searchData.status !== "OK") return [];

  const results: PlaceResult[] = [];
  for (const place of searchData.results.slice(0, 20)) {
    try {
      const detailsUrl = `https://maps.googleapis.com/maps/api/place/details/json?place_id=${place.place_id}&fields=name,formatted_address,formatted_phone_number,website,rating,user_ratings_total,url,types&key=${apiKey}&language=es`;
      const detailsResponse = await fetch(detailsUrl);
      const detailsData = await detailsResponse.json();
      if (detailsData.status === "OK") {
        const d = detailsData.result;
        results.push({
          businessName: d.name || place.name,
          address: d.formatted_address || place.formatted_address,
          phone: d.formatted_phone_number,
          website: d.website,
          rating: d.rating || place.rating,
          reviewCount: d.user_ratings_total || place.user_ratings_total,
          mapsUrl: d.url,
          placeId: place.place_id,
        });
      }
    } catch {
      results.push({
        businessName: place.name,
        address: place.formatted_address,
        rating: place.rating,
        reviewCount: place.user_ratings_total,
        placeId: place.place_id,
      });
    }
  }
  return results;
}

// Option 2: SerpAPI (Google Maps results, free tier available)
async function searchWithSerpAPI(apiKey: string, query: string, city: string): Promise<PlaceResult[]> {
  const searchQuery = `${query} en ${city}`;
  const url = `https://serpapi.com/search.json?engine=google_maps&q=${encodeURIComponent(searchQuery)}&hl=es&api_key=${apiKey}`;

  const response = await fetch(url, { signal: AbortSignal.timeout(15000) });
  const data = await response.json();

  if (!data.local_results) return [];

  return data.local_results.slice(0, 20).map((r: Record<string, unknown>) => ({
    businessName: r.title as string,
    address: r.address as string,
    phone: r.phone as string | undefined,
    website: r.website as string | undefined,
    rating: r.rating as number | undefined,
    reviewCount: r.reviews as number | undefined,
    mapsUrl: r.link as string | undefined,
    placeId: r.place_id as string | undefined,
  }));
}

// Option 3: Direct scrape via Google custom search
async function searchWithDirectScrape(query: string, city: string): Promise<PlaceResult[]> {
  const searchQuery = `${query} ${city}`;

  // Try using Google Custom Search JSON API (free 100 queries/day)
  const cseKey = process.env.GOOGLE_CSE_KEY;
  const cseId = process.env.GOOGLE_CSE_ID;

  if (cseKey && cseId) {
    try {
      const url = `https://www.googleapis.com/customsearch/v1?key=${cseKey}&cx=${cseId}&q=${encodeURIComponent(searchQuery + " site:google.com/maps")}&num=10`;
      const res = await fetch(url, { signal: AbortSignal.timeout(10000) });
      const data = await res.json();

      if (data.items) {
        return data.items.map((item: Record<string, unknown>) => ({
          businessName: (item.title as string || "").replace(/ - Google Maps$/, ""),
          address: (item.snippet as string || "").slice(0, 100),
          mapsUrl: item.link as string,
        }));
      }
    } catch {
      // fallback below
    }
  }

  // Fallback: use fetch to get autocomplete suggestions from Google
  // This gives real business names but limited data
  try {
    const url = `https://www.google.com/search?q=${encodeURIComponent(searchQuery)}&hl=es&gl=es&num=20`;
    const res = await fetch(url, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        "Accept-Language": "es-ES,es;q=0.9",
      },
      signal: AbortSignal.timeout(10000),
    });
    const html = await res.text();

    // Extract business-like results from Google search
    const results: PlaceResult[] = [];

    // Match patterns like business names and addresses from local pack
    const titleRegex = /<h3[^>]*>(.*?)<\/h3>/g;
    const matches = [...html.matchAll(titleRegex)];

    for (const match of matches.slice(0, 20)) {
      const name = match[1].replace(/<[^>]*>/g, "").trim();
      if (name && name.length > 3 && name.length < 100 && !name.includes("Google") && !name.includes("Búsqueda")) {
        // Try to extract URL
        const surroundingText = html.slice(Math.max(0, match.index! - 500), match.index! + 500);
        const urlMatch = surroundingText.match(/href="(https?:\/\/[^"]+)"/);
        const website = urlMatch ? urlMatch[1] : undefined;

        // Avoid Google's own links
        if (website && (website.includes("google.com") || website.includes("youtube.com"))) continue;

        results.push({
          businessName: name,
          website: website,
          address: city,
        });
      }
    }

    // Deduplicate by name
    const seen = new Set<string>();
    return results.filter((r) => {
      const key = r.businessName.toLowerCase();
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  } catch {
    return [];
  }
}

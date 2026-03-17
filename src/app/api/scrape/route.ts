import { NextRequest, NextResponse } from "next/server";

interface PlaceResult {
  businessName: string;
  address: string;
  phone?: string;
  website?: string;
  rating?: number;
  reviewCount?: number;
  mapsUrl?: string;
  placeId?: string;
  types?: string[];
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

    if (!apiKey) {
      // Return demo data if no API key configured
      return NextResponse.json({
        success: true,
        source: "demo",
        results: getDemoResults(city, category || "medicina-estetica"),
        message: "Datos de demostración. Configura GOOGLE_PLACES_API_KEY para datos reales.",
      });
    }

    // Use Google Places Text Search API
    const searchQuery = `${query} ${city}`;
    const textSearchUrl = `https://maps.googleapis.com/maps/api/place/textsearch/json?query=${encodeURIComponent(searchQuery)}&key=${apiKey}&language=es`;

    const searchResponse = await fetch(textSearchUrl);
    const searchData = await searchResponse.json();

    if (searchData.status !== "OK") {
      return NextResponse.json(
        { error: `Google Places API error: ${searchData.status}`, details: searchData.error_message },
        { status: 502 }
      );
    }

    // Get details for each place
    const results: PlaceResult[] = [];

    for (const place of searchData.results.slice(0, 20)) {
      // Get place details for phone and website
      const detailsUrl = `https://maps.googleapis.com/maps/api/place/details/json?place_id=${place.place_id}&fields=name,formatted_address,formatted_phone_number,website,rating,user_ratings_total,url,types&key=${apiKey}&language=es`;

      try {
        const detailsResponse = await fetch(detailsUrl);
        const detailsData = await detailsResponse.json();

        if (detailsData.status === "OK") {
          const detail = detailsData.result;
          results.push({
            businessName: detail.name || place.name,
            address: detail.formatted_address || place.formatted_address,
            phone: detail.formatted_phone_number,
            website: detail.website,
            rating: detail.rating || place.rating,
            reviewCount: detail.user_ratings_total || place.user_ratings_total,
            mapsUrl: detail.url,
            placeId: place.place_id,
            types: detail.types,
          });
        }
      } catch {
        // If details fail, use basic data
        results.push({
          businessName: place.name,
          address: place.formatted_address,
          rating: place.rating,
          reviewCount: place.user_ratings_total,
          placeId: place.place_id,
        });
      }
    }

    return NextResponse.json({
      success: true,
      source: "google_places",
      query: searchQuery,
      count: results.length,
      results,
    });
  } catch (error) {
    return NextResponse.json(
      { error: "Error interno del servidor", details: String(error) },
      { status: 500 }
    );
  }
}

function getDemoResults(city: string, category: string): PlaceResult[] {
  const names = [
    "Clínica Estética Luminous",
    "Centro Médico Estético Bella Donna",
    "Clínica Dermoestética Vital",
    "Dr. García - Medicina Estética Avanzada",
    "Clínica Estética Premier",
    "Centro de Estética Facial Dr. López",
    "MedEstética Barcelona",
    "Clínica de Belleza y Salud Integral",
    "Instituto Médico Estético Renovar",
    "Clínica Estética Armonía",
  ];

  return names.map((name, i) => ({
    businessName: name,
    address: `Calle Ejemplo ${100 + i}, ${city}`,
    phone: `+34 6${Math.floor(10000000 + Math.random() * 90000000)}`,
    website: `https://www.${name.toLowerCase().replace(/[^a-z0-9]/g, "").slice(0, 20)}.com`,
    rating: Math.round((3.5 + Math.random() * 1.5) * 10) / 10,
    reviewCount: Math.floor(20 + Math.random() * 200),
    mapsUrl: `https://maps.google.com/?cid=${Math.floor(Math.random() * 1000000000)}`,
    placeId: `ChIJ${Math.random().toString(36).substring(2, 15)}`,
  }));
}

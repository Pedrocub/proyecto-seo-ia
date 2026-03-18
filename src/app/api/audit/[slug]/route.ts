import { NextRequest, NextResponse } from "next/server";
import { getAuditBySlug, incrementAuditView } from "@/lib/storage";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params;
  const audit = getAuditBySlug(slug);

  if (!audit) {
    return NextResponse.json({ error: "Auditoría no encontrada" }, { status: 404 });
  }

  // Increment view count
  incrementAuditView(slug);

  return NextResponse.json({ audit });
}

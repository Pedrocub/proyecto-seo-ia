import { NextResponse } from "next/server";
import { getAudits } from "@/lib/storage";

export async function GET() {
  const audits = getAudits();
  return NextResponse.json({ audits });
}

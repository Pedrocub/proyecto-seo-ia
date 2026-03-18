import { NextResponse } from "next/server";
import { getLeads } from "@/lib/storage";

export async function GET() {
  const leads = getLeads();
  return NextResponse.json({ leads });
}

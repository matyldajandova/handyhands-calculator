import { NextResponse } from "next/server";
import { generateAuthUrl } from "@/utils/google-drive";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const url = generateAuthUrl();
  return NextResponse.redirect(url);
}



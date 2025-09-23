import { NextRequest, NextResponse } from "next/server";
import { exchangeCodeForTokens } from "@/utils/google-drive";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state") || "";

  if (!code) {
    return NextResponse.json({ error: "Missing OAuth code" }, { status: 400 });
  }

  try {
    const tokens = await exchangeCodeForTokens(code);
    // In production, store tokens securely (DB/KV). For now, echo minimal success.
    // Optionally, redirect back to an admin page with a success flag.
    const origin = new URL(req.url).origin;
    let absoluteRedirect: string;
    if (state) {
      if (/^https?:\/\//i.test(state)) {
        absoluteRedirect = state;
      } else if (state.startsWith("/")) {
        absoluteRedirect = `${origin}${state}`;
      } else {
        absoluteRedirect = `${origin}/${state}`;
      }
    } else {
      absoluteRedirect = `${origin}/?googleDrive=connected`;
    }

    // Set HttpOnly cookie with refresh/access (temporary demo storage)
    const response = NextResponse.redirect(absoluteRedirect);
    response.cookies.set("gg_tokens", JSON.stringify(tokens), {
      httpOnly: true,
      secure: true,
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60 * 24 * 30,
    });
    return response;
  } catch (e) {
    const message = e instanceof Error ? e.message : "OAuth exchange failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}



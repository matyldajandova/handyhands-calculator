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
    
    // Log individual environment variables for server-side setup
    console.log('\n=== Google OAuth Tokens - Add these to your .env.local or Vercel environment variables ===');
    console.log('GOOGLE_ACCESS_TOKEN=' + (tokens.access_token || ''));
    if (tokens.refresh_token) {
      console.log('GOOGLE_REFRESH_TOKEN=' + tokens.refresh_token);
    }
    console.log('=== Copy the above lines to your environment variables ===');
    console.log('Note: Token type is always "Bearer", expiry date is managed automatically after refresh\n');
    
    // Redirect back to an admin page with a success flag
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

    // No cookies - tokens are only stored in environment variables (server-side only)
    return NextResponse.redirect(absoluteRedirect);
  } catch (e) {
    const message = e instanceof Error ? e.message : "OAuth exchange failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}



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
    console.log('[OAUTH] API GET /api/google/oauth/callback', { hasCode: !!code, hasState: !!state });
    
    const tokens = await exchangeCodeForTokens(code);
    
    // Log individual environment variables for server-side setup - using direct console.error for visibility
    console.error('[OAUTH] === Google OAuth Tokens - Add these to your .env.local or Vercel environment variables ===');
    console.error('[OAUTH] GOOGLE_ACCESS_TOKEN=' + (tokens.access_token || ''));
    if (tokens.refresh_token) {
      console.error('[OAUTH] GOOGLE_REFRESH_TOKEN=' + tokens.refresh_token);
    }
    console.error('[OAUTH] === Copy the above lines to your environment variables ===');
    console.error('[OAUTH] Note: Token type is always "Bearer", expiry date is managed automatically after refresh');
    
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
    console.log('[OAUTH] API GET /api/google/oauth/callback → 302', { redirectTo: absoluteRedirect });
    return NextResponse.redirect(absoluteRedirect);
  } catch (e) {
    const message = e instanceof Error ? e.message : "OAuth exchange failed";
    console.error('[OAUTH] OAuth exchange failed', e);
    console.error('[OAUTH] API GET /api/google/oauth/callback → 500', { error: message });
    return NextResponse.json({ error: message }, { status: 500 });
  }
}



import { NextRequest, NextResponse } from "next/server";
import { exchangeCodeForTokens } from "@/utils/google-drive";
import { logger } from "@/utils/logger";

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
    logger.apiRequest('GET', '/api/google/oauth/callback', { hasCode: !!code, hasState: !!state });
    
    const tokens = await exchangeCodeForTokens(code);
    
    // Log individual environment variables for server-side setup
    logger.log('\n=== Google OAuth Tokens - Add these to your .env.local or Vercel environment variables ===', undefined, { prefix: 'OAUTH' });
    logger.log('GOOGLE_ACCESS_TOKEN=' + (tokens.access_token || ''), undefined, { prefix: 'OAUTH' });
    if (tokens.refresh_token) {
      logger.log('GOOGLE_REFRESH_TOKEN=' + tokens.refresh_token, undefined, { prefix: 'OAUTH' });
    }
    logger.log('=== Copy the above lines to your environment variables ===', undefined, { prefix: 'OAUTH' });
    logger.log('Note: Token type is always "Bearer", expiry date is managed automatically after refresh\n', undefined, { prefix: 'OAUTH' });
    
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
    logger.apiResponse('GET', '/api/google/oauth/callback', 302, { redirectTo: absoluteRedirect });
    return NextResponse.redirect(absoluteRedirect);
  } catch (e) {
    const message = e instanceof Error ? e.message : "OAuth exchange failed";
    logger.error('OAuth exchange failed', e, { prefix: 'OAUTH' });
    logger.apiResponse('GET', '/api/google/oauth/callback', 500, { error: message });
    return NextResponse.json({ error: message }, { status: 500 });
  }
}



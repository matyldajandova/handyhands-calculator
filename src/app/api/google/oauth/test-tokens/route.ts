import { NextRequest, NextResponse } from "next/server";
import { getOAuthClient } from "@/utils/google-drive";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Test endpoint to verify Google Drive OAuth token status and refresh functionality
 * GET /api/google/oauth/test-tokens
 */
export async function GET(req: NextRequest) {
  try {
    const url = new URL(req.url);
    // Allow forcing refresh test even if token is not expired (for testing)
    const forceRefresh = url.searchParams.get('forceRefresh') === 'true';
    
    const tokensCookie = req.cookies.get("gg_tokens")?.value;

    if (!tokensCookie) {
      return NextResponse.json({
        success: false,
        error: "No tokens found in cookies",
        message: "Please complete OAuth flow at /api/google/oauth/init",
        tokensPresent: false,
      });
    }

    let tokens;
    try {
      tokens = JSON.parse(tokensCookie);
    } catch (parseError) {
      return NextResponse.json({
        success: false,
        error: "Failed to parse tokens from cookie",
        details: parseError instanceof Error ? parseError.message : String(parseError),
        tokensPresent: true,
        tokensValid: false,
      });
    }

    const now = Date.now();
    const hasAccessToken = !!tokens.access_token;
    const hasRefreshToken = !!tokens.refresh_token;
    const hasExpiryDate = typeof tokens.expiry_date === 'number';
    
    // If forceRefresh is true, treat token as expired for testing purposes
    let isExpired = hasExpiryDate && tokens.expiry_date < now;
    if (forceRefresh && hasRefreshToken) {
      isExpired = true;
      console.log('Force refresh mode enabled - treating token as expired for testing');
    }
    
    const timeUntilExpiry = hasExpiryDate 
      ? (tokens.expiry_date - now) 
      : null;
    const expiresInMinutes = timeUntilExpiry 
      ? Math.floor(timeUntilExpiry / 1000 / 60) 
      : null;

    const tokenStatus = {
      tokensPresent: true,
      tokensValid: hasAccessToken && (hasRefreshToken || !isExpired),
      hasAccessToken,
      hasRefreshToken,
      hasExpiryDate,
      isExpired: forceRefresh ? 'forced (for testing)' : isExpired,
      actualExpiry: hasExpiryDate && !forceRefresh ? (tokens.expiry_date < now) : null,
      expiryDate: hasExpiryDate ? new Date(tokens.expiry_date).toISOString() : null,
      expiresInMinutes,
      timeUntilExpiry: timeUntilExpiry ? `${Math.floor(timeUntilExpiry / 1000 / 60)} minutes` : null,
      forceRefreshMode: forceRefresh,
    };

    // If token is expired (or force refresh) and we have a refresh token, test refresh
    if (isExpired && hasRefreshToken) {
      try {
        console.log('Testing token refresh...', { forceRefresh, actualExpired: hasExpiryDate && tokens.expiry_date < now });
        const oauth2Client = getOAuthClient();
        oauth2Client.setCredentials(tokens);
        
        // Type assertion for refresh method
        const oauthClientWithRefresh = oauth2Client as typeof oauth2Client & {
          refreshAccessToken: () => Promise<{ 
            credentials: { 
              access_token?: string; 
              refresh_token?: string; 
              expiry_date?: number; 
              token_type?: string; 
              scope?: string;
            } 
          }>;
        };
        
        const { credentials } = await oauthClientWithRefresh.refreshAccessToken();
        
        const newExpiry = credentials.expiry_date 
          ? new Date(credentials.expiry_date).toISOString() 
          : null;
        const newExpiresIn = credentials.expiry_date 
          ? Math.floor((credentials.expiry_date - now) / 1000 / 60)
          : null;

        return NextResponse.json({
          success: true,
          message: forceRefresh 
            ? "Token refresh test successful! (Forced refresh test - token was not actually expired)"
            : "Token refresh test successful!",
          tokenStatus,
          refreshTest: {
            success: true,
            forceRefresh,
            actualTokenExpired: hasExpiryDate && tokens.expiry_date < now,
            oldAccessToken: tokens.access_token?.substring(0, 20) + '...',
            newAccessToken: credentials.access_token?.substring(0, 20) + '...',
            tokenChanged: tokens.access_token !== credentials.access_token,
            newExpiryDate: newExpiry,
            newExpiresInMinutes: newExpiresIn,
            refreshTokenPreserved: !!credentials.refresh_token,
          },
          note: forceRefresh 
            ? "Tokens were refreshed (test mode). Original tokens are still valid. Refresh test successful!"
            : "Tokens were refreshed but NOT saved to cookie. Run OAuth flow again to get fresh tokens.",
        });
      } catch (refreshError) {
        return NextResponse.json({
          success: false,
          error: "Token refresh test failed",
          tokenStatus,
          refreshTest: {
            success: false,
            error: refreshError instanceof Error ? refreshError.message : String(refreshError),
            stack: refreshError instanceof Error ? refreshError.stack : undefined,
          },
          message: "Token refresh failed. You may need to re-authorize.",
        });
      }
    }

    // If token is not expired and force refresh not enabled, just return status
    return NextResponse.json({
      success: true,
      message: isExpired 
        ? "Token is expired but no refresh token available" 
        : "Token is valid",
      tokenStatus,
      refreshTest: {
        attempted: false,
        reason: isExpired 
          ? "No refresh token available" 
          : "Token is not expired, no refresh needed",
        hint: "Add ?forceRefresh=true to the URL to test refresh even with valid tokens",
      },
    });

  } catch (error) {
    return NextResponse.json({
      success: false,
      error: "Unexpected error",
      details: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
    }, { status: 500 });
  }
}

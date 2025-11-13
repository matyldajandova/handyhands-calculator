import { NextRequest, NextResponse } from "next/server";
import { getOAuthClient, getTokensFromEnv } from "@/utils/google-drive";
import { logger } from "@/utils/logger";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Test endpoint to verify Google Drive OAuth token status and refresh functionality
 * Checks both environment variable tokens (server-side) and cookie tokens (browser)
 * GET /api/google/oauth/test-tokens
 */
export async function GET(req: NextRequest) {
  try {
    const url = new URL(req.url);
    // Allow forcing refresh test even if token is not expired (for testing)
    const forceRefresh = url.searchParams.get('forceRefresh') === 'true';
    
    // Verify OAuth client configuration
    const hasClientId = !!process.env.GOOGLE_CLIENT_ID;
    const hasClientSecret = !!process.env.GOOGLE_CLIENT_SECRET;
    const hasRedirectUri = !!process.env.GOOGLE_REDIRECT_URI;
    const redirectUri = process.env.GOOGLE_REDIRECT_URI;
    
    const configStatus = {
      hasClientId,
      hasClientSecret,
      hasRedirectUri,
      redirectUri: redirectUri || 'NOT SET',
      configValid: hasClientId && hasClientSecret && hasRedirectUri,
    };
    
    // Check environment variables only (server-side tokens)
    const tokens = getTokensFromEnv();
    const tokenSource = tokens ? 'environment variables (GOOGLE_ACCESS_TOKEN, etc.)' : null;

    // Return configuration status even if no tokens
    const envTokenStatus = {
      hasAccessToken: !!process.env.GOOGLE_ACCESS_TOKEN,
      hasRefreshToken: !!process.env.GOOGLE_REFRESH_TOKEN,
    };
    
    if (!tokens) {
      return NextResponse.json({
        success: false,
        error: "No tokens found",
        message: "Please complete OAuth flow at /api/google/oauth/init and set environment variables for server-side access",
        tokensPresent: false,
        configStatus,
        envTokenStatus,
        setupInstructions: {
          step1: "Complete OAuth flow: /api/google/oauth/init",
          step2: "Copy GOOGLE_ACCESS_TOKEN and GOOGLE_REFRESH_TOKEN from the logs",
          step3: "Add them to your .env.local or Vercel environment variables",
          step4: "Redeploy for environment variables to take effect"
        }
      });
    }

    const now = Date.now();
    const hasAccessToken = !!tokens.access_token;
    const hasRefreshToken = !!tokens.refresh_token;
    const hasExpiryDate = typeof tokens.expiry_date === 'number';
    const expiryDate = tokens.expiry_date; // Store for type narrowing
    
    // If forceRefresh is true, treat token as expired for testing purposes
    let isExpired = hasExpiryDate && expiryDate !== undefined && expiryDate < now;
    if (forceRefresh && hasRefreshToken) {
      isExpired = true;
      logger.info('Force refresh mode enabled - treating token as expired for testing', undefined, { prefix: 'OAUTH' });
    }
    
    const timeUntilExpiry = hasExpiryDate && expiryDate !== undefined
      ? (expiryDate - now) 
      : null;
    const expiresInMinutes = timeUntilExpiry 
      ? Math.floor(timeUntilExpiry / 1000 / 60) 
      : null;

    const tokenStatus = {
      tokensPresent: true,
      tokenSource,
      tokensValid: hasAccessToken && (hasRefreshToken || !isExpired),
      hasAccessToken,
      hasRefreshToken,
      hasExpiryDate,
      isExpired: forceRefresh ? 'forced (for testing)' : isExpired,
      actualExpiry: hasExpiryDate && expiryDate !== undefined && !forceRefresh ? (expiryDate < now) : null,
      expiryDate: hasExpiryDate && expiryDate !== undefined ? new Date(expiryDate).toISOString() : null,
      expiresInMinutes,
      timeUntilExpiry: timeUntilExpiry ? `${Math.floor(timeUntilExpiry / 1000 / 60)} minutes` : null,
      forceRefreshMode: forceRefresh,
    };

    // If token is expired (or force refresh) and we have a refresh token, test refresh
    if (isExpired && hasRefreshToken) {
      try {
        logger.info('Testing token refresh...', { forceRefresh, actualExpired: hasExpiryDate && expiryDate !== undefined && expiryDate < now }, { prefix: 'OAUTH' });
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
          configStatus,
          tokenStatus,
          refreshTest: {
            success: true,
            forceRefresh,
            actualTokenExpired: hasExpiryDate && expiryDate !== undefined && expiryDate < now,
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
          configStatus,
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
      configStatus,
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
    // Include config status even in error cases
    const hasClientId = !!process.env.GOOGLE_CLIENT_ID;
    const hasClientSecret = !!process.env.GOOGLE_CLIENT_SECRET;
    const hasRedirectUri = !!process.env.GOOGLE_REDIRECT_URI;
    const redirectUri = process.env.GOOGLE_REDIRECT_URI;
    
    return NextResponse.json({
      success: false,
      error: "Unexpected error",
      details: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
      configStatus: {
        hasClientId,
        hasClientSecret,
        hasRedirectUri,
        redirectUri: redirectUri || 'NOT SET',
        configValid: hasClientId && hasClientSecret && hasRedirectUri,
      },
      envTokenStatus: {
        hasAccessToken: !!process.env.GOOGLE_ACCESS_TOKEN,
        hasRefreshToken: !!process.env.GOOGLE_REFRESH_TOKEN,
      },
      hasEnvTokens: !!getTokensFromEnv(),
    }, { status: 500 });
  }
}

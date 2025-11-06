# Google Drive Token Refresh Testing Guide

This guide explains how to test the Google Drive OAuth token refresh functionality.

## Test Endpoint

A test endpoint has been created at `/api/google/oauth/test-tokens` that:
- Checks if tokens are present in cookies
- Validates token structure
- Checks if tokens are expired
- Tests token refresh functionality (if expired)
- Returns detailed status information

## How to Test

### Option 1: Browser Test

1. **Ensure you have tokens** (complete OAuth flow if needed):
   ```
   Visit: /api/google/oauth/init
   ```

2. **Check token status**:
   ```
   Visit: /api/google/oauth/test-tokens
   ```

3. **Interpret results**:
   - ✅ **Tokens valid** - Tokens are present and not expired
   - ⚠️ **Tokens expired** - Tokens are expired, refresh will be tested
   - ❌ **No tokens** - Need to complete OAuth flow
   - 🔄 **Refresh test** - If expired, refresh will be attempted

### Option 2: Command Line Test

1. **Using curl**:
   ```bash
   curl http://localhost:3000/api/google/oauth/test-tokens \
     -H "Cookie: gg_tokens=YOUR_TOKENS_HERE" \
     | jq '.'
   ```

2. **Using the test script**:
   ```bash
   ./scripts/test-token-refresh.sh
   ```

   Or with custom URL:
   ```bash
   ./scripts/test-token-refresh.sh https://your-domain.com
   ```

### Option 3: Test Expired Token Refresh

To test token refresh, you need expired tokens:

1. **Manually expire tokens** (for testing):
   - Open browser DevTools → Application → Cookies
   - Find `gg_tokens` cookie
   - Edit the cookie value (JSON)
   - Set `expiry_date` to a past timestamp (e.g., `1000000000000`)
   - Save and refresh

2. **Test refresh**:
   ```
   Visit: /api/google/oauth/test-tokens
   ```

3. **Expected result**:
   ```json
   {
     "success": true,
     "message": "Token refresh test successful!",
     "refreshTest": {
       "success": true,
       "newAccessToken": "...",
       "newExpiryDate": "...",
       "newExpiresInMinutes": 60
     }
   }
   ```

## Test Response Format

### Success - Valid Tokens
```json
{
  "success": true,
  "message": "Token is valid",
  "tokenStatus": {
    "tokensPresent": true,
    "tokensValid": true,
    "hasAccessToken": true,
    "hasRefreshToken": true,
    "hasExpiryDate": true,
    "isExpired": false,
    "expiryDate": "2024-01-01T12:00:00.000Z",
    "expiresInMinutes": 3599,
    "timeUntilExpiry": "3599 minutes"
  },
  "refreshTest": {
    "attempted": false,
    "reason": "Token is not expired, no refresh needed"
  }
}
```

### Success - Refresh Test
```json
{
  "success": true,
  "message": "Token refresh test successful!",
  "tokenStatus": {
    "isExpired": true,
    "expiresInMinutes": -60
  },
  "refreshTest": {
    "success": true,
    "oldAccessToken": "...",
    "newAccessToken": "...",
    "newExpiryDate": "2024-01-01T13:00:00.000Z",
    "newExpiresInMinutes": 3600,
    "refreshTokenPreserved": true
  }
}
```

### Error - No Tokens
```json
{
  "success": false,
  "error": "No tokens found in cookies",
  "message": "Please complete OAuth flow at /api/google/oauth/init",
  "tokensPresent": false
}
```

### Error - Refresh Failed
```json
{
  "success": false,
  "error": "Token refresh test failed",
  "tokenStatus": {
    "isExpired": true
  },
  "refreshTest": {
    "success": false,
    "error": "invalid_grant",
    "stack": "..."
  },
  "message": "Token refresh failed. You may need to re-authorize."
}
```

## Integration with PDF Upload

The token refresh logic is automatically used in the PDF upload process:

1. **When PDF is generated** (`/api/pdf/offer`):
   - Checks if tokens are expired
   - Automatically refreshes if needed
   - Uses refreshed tokens for upload
   - Logs refresh status in console

2. **Logs to check**:
   ```
   PDF Upload conditions: { hasTokens: true, ... }
   Access token expired, attempting to refresh...
   Tokens refreshed successfully
   Uploading PDF to Google Drive: { ... }
   PDF uploaded successfully to Google Drive: https://...
   ```

## Troubleshooting

### Token Refresh Fails

**Common causes**:
1. **No refresh token** - OAuth flow didn't request offline access
   - Solution: Re-authorize with `access_type: "offline"` and `prompt: "consent"`

2. **Refresh token revoked** - User revoked access
   - Solution: Re-authorize at `/api/google/oauth/init`

3. **Invalid credentials** - OAuth client credentials are wrong
   - Solution: Check `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET`

### Tokens Not Being Refreshed

**Check**:
1. Are tokens actually expired? Check `expiry_date` in cookie
2. Is `refresh_token` present in cookie?
3. Are OAuth credentials configured correctly?

### Test Endpoint Returns 500

**Check**:
1. Server logs for detailed error
2. OAuth credentials are set in environment
3. Redirect URI matches OAuth configuration

## Notes

- **Token refresh in test endpoint** does NOT update the cookie
- **Token refresh in PDF upload** uses refreshed tokens for that request only
- **To persist refreshed tokens**, you'd need to update the cookie (future enhancement)
- **Refresh tokens** are long-lived but can be revoked by user
- **Access tokens** expire after 1 hour (3600 seconds)

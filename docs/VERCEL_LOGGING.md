# Viewing Logs in Vercel

## Where to Find Console.log Output

In Vercel, `console.log()` output from your API routes appears in **Runtime Logs** in the main Logs tab.

### Method 1: Vercel Dashboard (Recommended)

1. Go to your [Vercel Dashboard](https://vercel.com/dashboard)
2. Select your project
3. Click on the **"Logs"** tab (top navigation)
4. You'll see Runtime Logs showing:
   - HTTP requests (GET, POST, etc.)
   - **Console.log output from your functions** (scroll down or filter)
   - Function execution details

**Important**: Console.log output appears in the same Logs tab, mixed with HTTP requests. Use filters to find them:
- Filter by **Function** (e.g., `api/google/oauth/callback`)
- Filter by **Resource** → Select "Vercel Function"
- Search for your log messages in the search bar

### Method 2: Vercel CLI

You can view logs in real-time using the Vercel CLI:

```bash
# View logs for the latest deployment (recommended)
vercel logs --follow

# View logs for a specific deployment
vercel logs [deployment-url] --follow

# Filter logs by function
vercel logs --follow | grep "api/google/oauth/callback"
```

### Method 3: Filtering in Dashboard

In the Logs tab, use the left sidebar filters:
- **Function**: Select specific API route (e.g., `api/test-logs`)
- **Resource**: Select "Vercel Function" to see only function logs
- **Level**: Filter by Info, Warning, or Error
- **Search bar**: Search for specific text (e.g., "OAUTH", "TEST", "ERROR")

## Understanding Vercel Log Types

### 1. Deployment Logs (Build Logs)
- Shows build output, compilation errors, etc.
- **Location**: Deployment page → "Build Logs" tab
- **Contains**: Build process, npm install, Next.js build output

### 2. HTTP Request Logs
- Shows incoming HTTP requests (GET, POST, etc.)
- **Location**: Deployment page → "Logs" tab (main view)
- **Contains**: Request method, path, status code, timestamp
- **Example**: `GET 200 /api/google/oauth/callback`

### 3. Runtime Logs ⭐ **This is where console.log appears**
- Shows console.log, console.error, etc. from your API routes
- **Location**: Project Dashboard → **"Logs"** tab (main navigation)
- **Contains**: All console output from serverless function execution
- **How to find**: Filter by Function name or Resource type
- **Example**: 
  ```
  [2024-11-13T17:18:57.123Z] [OAUTH] Google OAuth Tokens - Add these to your .env.local...
  [2024-11-13T17:18:57.124Z] [OAUTH] GOOGLE_ACCESS_TOKEN=ya29.a0AfH6...
  ```
  
**Log Level Mapping** (according to Vercel docs):
- `console.log`, `console.info` → **Info** level (blue)
- `console.warn` → **Warning** level (amber)
- `console.error`, `stderr` → **Error** level (red)

## Using the Logger Utility

We've created a logger utility (`src/utils/logger.ts`) that ensures logs are properly formatted and visible:

```typescript
import { logger } from '@/utils/logger';

// Basic logging
logger.log('Message', data);
logger.info('Info message', data);
logger.warn('Warning message', data);
logger.error('Error message', error);

// API-specific logging
logger.apiRequest('GET', '/api/endpoint', { param: 'value' });
logger.apiResponse('GET', '/api/endpoint', 200, { result: 'success' });
```

## Troubleshooting

### Logs Not Appearing?

1. **Check you're looking in the right place**: Function Logs, not HTTP request logs
2. **Wait a few seconds**: Logs may take a moment to appear
3. **Check the function executed**: Make sure the API route was actually called
4. **Use Vercel CLI**: Sometimes CLI shows logs that aren't visible in dashboard
5. **Check function runtime**: Ensure `export const runtime = "nodejs"` is set if needed

### Logs Only Show HTTP Requests?

The Logs tab shows both HTTP requests AND console.log output. To see console.log output:
1. **Filter by Function**: Use the left sidebar → Function filter → Select your API route
2. **Filter by Resource**: Select "Vercel Function" to see only function logs
3. **Search**: Use the search bar to find specific log messages (e.g., search for "OAUTH" or "TEST")
4. **Look for Info/Warning/Error levels**: Console.log appears as Info level logs

**Tip**: HTTP requests appear as single-line entries. Console.log output appears as separate log entries with the full message.

## Example: Finding OAuth Token Logs

When you complete the OAuth flow at `/api/google/oauth/init`:

1. Go to Vercel Dashboard → Your Project → **"Logs"** tab
2. **Filter by Function**: Select `api/google/oauth/callback` from the Function filter
3. **Or search**: Type "OAUTH" in the search bar
4. You should see logs like:
   ```
   [2024-11-13T17:18:57.123Z] [OAUTH] === Google OAuth Tokens ===
   [2024-11-13T17:18:57.124Z] [OAUTH] GOOGLE_ACCESS_TOKEN=ya29.a0AfH6...
   [2024-11-13T17:18:57.125Z] [OAUTH] GOOGLE_REFRESH_TOKEN=1//0g...
   ```

## Test Your Logging

Visit `/api/test-logs` after deploying to verify logging works:
1. Deploy your app
2. Visit `https://your-domain.com/api/test-logs`
3. Go to Vercel Dashboard → Logs tab
4. Filter by Function: `api/test-logs`
5. You should see test log messages

## Additional Resources

- [Vercel Logs Documentation](https://vercel.com/docs/observability/logs)
- [Vercel CLI Logs](https://vercel.com/docs/cli#logs)


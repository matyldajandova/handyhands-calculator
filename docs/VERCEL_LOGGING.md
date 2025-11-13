# Viewing Logs in Vercel

## Where to Find Console.log Output

In Vercel, `console.log()` output from your API routes appears in **Function Logs**, not in the main deployment logs that show HTTP requests.

### Method 1: Vercel Dashboard (Recommended)

1. Go to your [Vercel Dashboard](https://vercel.com/dashboard)
2. Select your project
3. Click on a specific **deployment**
4. Look for one of these tabs:
   - **"Functions"** tab - Click on a specific function to see its logs
   - **"Runtime Logs"** or **"Logs"** tab - Shows function execution logs
   - **"Function Logs"** - Direct access to console.log output

### Method 2: Vercel CLI

You can view logs in real-time using the Vercel CLI:

```bash
# View logs for a specific deployment
vercel logs [deployment-url] --follow

# View logs for the latest deployment
vercel logs --follow

# View logs for a specific function
vercel logs --follow --function=api/google/oauth/callback
```

### Method 3: Vercel Dashboard - Real-time Logs

1. Go to your project dashboard
2. Click on **"Deployments"**
3. Click on a specific deployment
4. Look for **"Runtime Logs"** or **"Function Logs"** section
5. You should see console.log output with timestamps

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

### 3. Function Logs (Runtime Logs) ⭐ **This is where console.log appears**
- Shows console.log, console.error, etc. from your API routes
- **Location**: Deployment page → "Functions" tab → Click on a function
- **Contains**: All console output from serverless function execution
- **Example**: 
  ```
  [2024-11-13T17:18:57.123Z] [OAUTH] Google OAuth Tokens - Add these to your .env.local...
  [2024-11-13T17:18:57.124Z] [OAUTH] GOOGLE_ACCESS_TOKEN=ya29.a0AfH6...
  ```

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

The main "Logs" tab shows HTTP requests. To see console.log output:
- Click on the **"Functions"** tab
- Click on the specific function (e.g., `api/google/oauth/callback`)
- You'll see the console.log output there

## Example: Finding OAuth Token Logs

When you complete the OAuth flow at `/api/google/oauth/init`:

1. Go to Vercel Dashboard → Your Project → Latest Deployment
2. Click **"Functions"** tab
3. Find and click on `api/google/oauth/callback`
4. You should see logs like:
   ```
   [2024-11-13T17:18:57.123Z] [OAUTH] === Google OAuth Tokens ===
   [2024-11-13T17:18:57.124Z] [OAUTH] GOOGLE_ACCESS_TOKEN=ya29.a0AfH6...
   [2024-11-13T17:18:57.125Z] [OAUTH] GOOGLE_REFRESH_TOKEN=1//0g...
   ```

## Additional Resources

- [Vercel Logs Documentation](https://vercel.com/docs/observability/logs)
- [Vercel CLI Logs](https://vercel.com/docs/cli#logs)


# Vercel Performance Optimization

This document explains the optimizations implemented to reduce cold start times and improve performance on Vercel.

## Problem

The first time a calculator page was accessed, it took a while to load due to:
1. **Serverless cold starts** - Functions need to initialize on first request
2. **No static pre-rendering** - Pages were fully client-side rendered
3. **No caching strategy** - Each request was treated as new

## Solutions Implemented

### 1. Static Site Generation (SSG)

**File:** `src/app/kalkulator/[slug]/page.tsx`

Added `generateStaticParams()` to pre-generate all calculator pages at build time:

```typescript
export function generateStaticParams() {
  return getAllSlugs().map((slug) => ({
    slug,
  }));
}
```

**Benefits:**
- All calculator pages are pre-built during deployment
- No serverless function invocation needed for initial page load
- Instant page loads after first deployment
- Pages are served from Vercel's Edge Network (CDN)

### 2. Next.js Configuration

**File:** `next.config.ts` (newly created)

Optimizations added:
- **SWC Minification** - Faster builds and smaller bundles
- **Image Optimization** - AVIF/WebP formats with proper device sizes
- **Package Import Optimization** - Tree-shaking for `lucide-react`, `date-fns`, `zod`
- **Console Removal** - Remove console logs in production (except errors/warnings)

### 3. Vercel Configuration

**File:** `vercel.json` (newly created)

Optimizations added:

#### Caching Strategy
```json
{
  "/kalkulator/:slug": "public, max-age=3600, s-maxage=86400, stale-while-revalidate=604800"
}
```
- **Client cache:** 1 hour
- **CDN cache:** 24 hours
- **Stale-while-revalidate:** 7 days (serve stale content while revalidating in background)

#### Static Assets
```json
{
  "/_next/static/(.*)": "public, max-age=31536000, immutable"
}
```
- **1 year cache** for static assets (JS, CSS, images)
- Marked as `immutable` for maximum caching

#### Regional Deployment
```json
{
  "regions": ["fra1"]
}
```
- **Deployed to Frankfurt, Germany (`fra1`)** - The closest Vercel region to Czech Republic
- Reduces latency for Czech users (typically 10-20ms vs 100-150ms from US regions)
- Note: Vercel's Edge Network (CDN) still serves static content globally from the nearest location

#### Security Headers
- DNS prefetching enabled
- HSTS for secure connections
- Frame protection
- Content type sniffing prevention

### 4. API Function Optimization

```json
{
  "functions": {
    "src/app/api/**/*.ts": {
      "maxDuration": 10
    }
  }
}
```
- Set reasonable timeout for API functions
- Prevents long-running requests

## Expected Results

### Before Optimization
- **First visit:** 2-5 seconds (cold start)
- **Subsequent visits:** 200-500ms
- **Cache:** Browser only

### After Optimization
- **First visit:** 200-500ms (served from CDN)
- **Subsequent visits:** 100-200ms (browser cache)
- **Cache:** Multi-layer (Browser → CDN → Origin)
- **No cold starts** for calculator pages

## Deployment

After these changes are deployed to Vercel:

1. **Build time** will be slightly longer (pre-generating all pages)
2. **All calculator pages** will be available instantly
3. **CDN caching** will serve pages globally
4. **Stale-while-revalidate** ensures users never wait for updates

## Monitoring

To verify the improvements:

1. Check **Vercel Analytics** for:
   - Time to First Byte (TTFB)
   - First Contentful Paint (FCP)
   - Largest Contentful Paint (LCP)

2. Check **Network tab** in browser DevTools:
   - Look for `x-vercel-cache: HIT` header (CDN cache hit)
   - Look for `age` header (how long cached)

3. Test from different locations:
   - Should be fast globally due to Edge Network

## Additional Recommendations

### Future Optimizations
1. **Incremental Static Regeneration (ISR)** - If form configs change frequently
2. **Edge Functions** - Move API routes to Edge for lower latency
3. **Image CDN** - Use Vercel's image optimization for all images
4. **Font Optimization** - Preload critical fonts

### Monitoring Tools
- Vercel Analytics (built-in)
- Google Lighthouse (performance audits)
- WebPageTest (detailed performance analysis)

## Troubleshooting

### If pages are still slow
1. Check if `generateStaticParams` is working:
   ```bash
   npm run build
   # Look for "○ /kalkulator/[slug]" in output (should show all slugs)
   ```

2. Verify caching headers:
   ```bash
   curl -I https://your-domain.vercel.app/kalkulator/cinzovni-domy
   # Look for Cache-Control and x-vercel-cache headers
   ```

3. Check Vercel deployment logs for errors

### If cold starts persist for API routes
- Consider moving to Edge Functions
- Reduce bundle size of API routes
- Use connection pooling for database connections

## References

- [Next.js Static Site Generation](https://nextjs.org/docs/pages/building-your-application/rendering/static-site-generation)
- [Vercel Caching](https://vercel.com/docs/edge-network/caching)
- [Next.js Performance](https://nextjs.org/docs/app/building-your-application/optimizing)


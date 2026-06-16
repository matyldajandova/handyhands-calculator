# Development Setup Guide

## 🚀 **Starting the Development Server**

### **Option 1: Standard Dev (Fixed Port 3000)**
```bash
npm run dev
```
- **Port**: Always 3000
- **Use when**: You know port 3000 is free
- **Risk**: Will fail if port 3000 is occupied

### **Option 2: Smart Dev (Auto-find Port)**
```bash
npm run dev:smart
```
- **Port**: Automatically finds available port (3000, 3001, 3002, etc.)
- **Use when**: You want to avoid port conflicts
- **Best for**: Daily development

### **Option 3: Kill All Dev Processes First**
```bash
npm run dev:kill
npm run dev
```
- **Port**: 3000 (guaranteed to be free)
- **Use when**: You want to ensure a clean start
- **Best for**: Troubleshooting

## 🛠️ **Port Conflict Solutions**

### **Quick Fix - Kill All Dev Processes**
```bash
# Kill all Next.js dev servers
npm run dev:kill

# Or manually
pkill -f "next dev"
```

### **Check What's Using Port 3000**
```bash
lsof -i :3000
```

### **Force Specific Port**
```bash
PORT=3001 npm run dev
```

## 📋 **Available Scripts**

| Script | Description | Use Case |
|--------|-------------|----------|
| `npm run dev` | Start dev server on port 3000 | Standard development |
| `npm run dev:smart` | Auto-find available port | Avoid port conflicts |
| `npm run dev:kill` | Kill all dev processes | Clean restart |
| `npm run build` | Build for production | Testing builds |
| `npm run start` | Start production server | Production testing |

## 🔧 **Troubleshooting**

### **Port Already in Use Error**
```bash
# Solution 1: Use smart dev
npm run dev:smart

# Solution 2: Kill and restart
npm run dev:kill
npm run dev

# Solution 3: Check what's using the port
lsof -i :3000
```

### **Multiple Dev Servers Running**
```bash
# Kill all dev processes
npm run dev:kill

# Check for remaining processes
ps aux | grep "next dev"
```

### **Permission Denied on Scripts**
```bash
# Make scripts executable
chmod +x scripts/dev.sh
```

## 💡 **Best Practices**

1. **Use `npm run dev:smart`** for daily development
2. **Use `npm run dev:kill`** before starting fresh
3. **Check port usage** if you encounter conflicts
4. **Keep only one dev server** running at a time

## 🎯 **Recommended Workflow**

```bash
# Start development (smart port detection)
npm run dev:smart

# If you need to restart
npm run dev:kill
npm run dev:smart

# Build and test
npm run build
npm run start
```

This setup ensures you'll never have port conflicts again! 🎉

## A/B test (local)

The PDF funnel A/B test (`/vysledek` → email/PDF → `/poptavka`) assigns variant **A** (control) or **B** (email gate) via `src/middleware.ts` (must live next to `src/app`, not the repo root). Overrides work only in development.

### Force a variant

| URL | Effect |
|-----|--------|
| `/vysledek?hash=…&ab=a` | Control — price visible before PDF |
| `/vysledek?hash=…&ab=b` | Treatment — email gate before price/PDF |
| `/vysledek?hash=…&ab=reset` | Clear `ab_pdf_funnel_v1` cookie; next visit re-randomizes |

The query param updates the cookie so `/poptavka` and PDF API calls stay on the same variant.

### Default variant (optional)

Add to `.env.local`:

```bash
AB_FORCE_VARIANT=b
```

Used only when there is no `?ab=` param and no cookie yet. Clear with `?ab=reset` first if you need to change an existing assignment.

### Dev badge

On `/vysledek` and `/poptavka`, a small amber pill in the bottom-right shows the active variant and links to `a` / `b` / `reset` (preserves `hash` and other query params).

### Typical flow

1. Complete a calculator → land on `/vysledek?hash=…`
2. Add `&ab=b` to compare the treatment UX
3. Submit email → PDF → check price and “Návrh smlouvy” appear
4. Use `&ab=reset` and reload to simulate a new visitor’s random assignment

## GA4 / GTM tracking (A/B funnel)

Application code pushes variant-aware events to `dataLayer` for GTM container `GTM-58FFPMBH`. GTM must be configured to forward them to GA4 — see **[docs/GTM_GA4_SETUP.md](docs/GTM_GA4_SETUP.md)** for the full prerequisite audit, tag setup, and verification checklist.

### Quick local verification

1. `npm run dev` (variant overrides only work locally, not on Vercel preview/prod)
2. Clear `sessionStorage` keys `ab_exposure_sent` and `view_item_sent:*` between tests
3. Open GTM Preview connected to `localhost:3000`
4. Complete funnel with `?ab=a` then `?ab=b` on `/vysledek?hash=…`
5. Confirm `dataLayer` events: `ab_exposure` → `view_item` → `generate_lead` (with `lead_type`)
6. Check GA4 DebugView for `ab_variant` on each event

Optional env override for GTM container:

```bash
NEXT_PUBLIC_GTM_ID=GTM-58FFPMBH
```

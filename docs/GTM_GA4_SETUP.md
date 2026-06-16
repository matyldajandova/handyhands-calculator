# GTM & GA4 Setup — A/B Funnel Tracking

This document covers the **prerequisite audit** and **GTM container configuration** for variant-aware GA4 conversion tracking. Application code pushes events to `dataLayer` via `sendGTMEvent`; GTM must forward them to GA4.

**Container:** `GTM-58FFPMBH`  
**A/B test:** `pdf_funnel_v1` (variants `a` = control, `b` = email gate)

---

## Prerequisite audit (do this first)

### 1. Confirm GA4 is connected

1. Open [Google Tag Manager](https://tagmanager.google.com) → container `GTM-58FFPMBH`.
2. Go to **Tags** and look for an existing **Google Tag** or **GA4 Configuration** tag.
3. Record the **Measurement ID** (`G-XXXXXXXX`). If none exists:
   - Create a GA4 property for the calculator site.
   - Add a GA4 Configuration / Google Tag with trigger **All Pages**.
4. **Do not create a second GA4 config tag** if one already exists — extend it.

### 2. Inventory existing tags (avoid double-counting)

Before adding new tags, note:

| Check | Action |
|-------|--------|
| Duplicate GA4 config tags | Keep one; disable/remove extras |
| URL-based conversion triggers on `/vysledek` or `/poptavka` | Plan to retire once event-based `generate_lead` is validated |
| Existing custom events with same names (`view_item`, `generate_lead`) | Merge parameters or rename app events |

### 3. Record Measurement ID

Add to Vercel env (optional, for reference in other tools):

```bash
# Not used by app code today — GTM holds the Measurement ID
NEXT_PUBLIC_GA_MEASUREMENT_ID=G-XXXXXXXX
```

---

## GA4 Admin — custom dimensions & key events

### Event-scoped custom dimensions

| Dimension name | Event parameter |
|----------------|-----------------|
| AB Variant | `ab_variant` |
| AB Test Name | `ab_test_name` |
| Lead Type | `lead_type` |
| Service Type | `service_type` |

### User-scoped custom dimension

| Dimension name | User property |
|----------------|---------------|
| AB Variant | `ab_variant` |

### Key events (conversions)

| Event | Filter | Priority |
|-------|--------|----------|
| `generate_lead` | `lead_type` = `poptavka` | Primary conversion |
| `generate_lead` | `lead_type` = `pdf_download` | Secondary (optional) |

**Note:** `value` on events is **monthly price in CZK**, not one-off purchase revenue.

---

## GTM variables (Data Layer)

Create **Data Layer Variables** (Version 2):

| Variable name | Data Layer Variable Name |
|---------------|--------------------------|
| DLV - ab_variant | `ab_variant` |
| DLV - ab_test_name | `ab_test_name` |
| DLV - lead_type | `lead_type` |
| DLV - service_type | `service_type` |
| DLV - value | `value` |
| DLV - currency | `currency` |
| DLV - items | `items` |

---

## GTM triggers

| Trigger name | Type | Event name |
|--------------|------|------------|
| CE - ab_exposure | Custom Event | `ab_exposure` |
| CE - view_item | Custom Event | `view_item` |
| CE - generate_lead | Custom Event | `generate_lead` |

---

## GTM tags

### Tag: GA4 Configuration (reuse existing)

- **Type:** Google Tag / GA4 Configuration
- **Measurement ID:** your `G-XXXXXXXX`
- **Trigger:** All Pages
- **Fields to Set → User properties:** `ab_variant` = `{{DLV - ab_variant}}` (when present)

### Tag: GA4 Event — ab_exposure

- **Type:** Google Analytics: GA4 Event
- **Configuration tag:** (select existing GA4 config)
- **Event name:** `ab_exposure`
- **Event parameters:**
  - `ab_variant` = `{{DLV - ab_variant}}`
  - `ab_test_name` = `{{DLV - ab_test_name}}`
- **User properties:** `ab_variant` = `{{DLV - ab_variant}}`
- **Trigger:** CE - ab_exposure

### Tag: GA4 Event — view_item

- **Event name:** `view_item`
- **Parameters:** `ab_variant`, `ab_test_name`, `currency`, `value`, `items`
- **Trigger:** CE - view_item

### Tag: GA4 Event — generate_lead

- **Event name:** `generate_lead`
- **Parameters:** `ab_variant`, `ab_test_name`, `lead_type`, `service_type`, `currency`, `value`
- **Trigger:** CE - generate_lead

**Publish** the container after Preview validation.

---

## Events pushed from application code

| dataLayer `event` | When | GA4 mapping |
|-------------------|------|-------------|
| `ab_exposure` | First funnel page load per session (`/vysledek` or `/poptavka`) | Custom + user property |
| `view_item` | Results hash decoded on `/vysledek` (once per hash per session) | GA4 `view_item` |
| `generate_lead` | PDF downloaded (`lead_type: pdf_download`) | GA4 `generate_lead` |
| `generate_lead` | Poptávka submitted (`lead_type: poptavka`) | GA4 `generate_lead` |

All events include `ab_variant` (`a` | `b`) and `ab_test_name` (`pdf_funnel_v1`). No PII (email/name) is sent to GA4.

---

## Verification checklist

### Local (forced variants)

`?ab=a` / `?ab=b` work **only** in `npm run dev` (`NODE_ENV !== 'production'`).

1. Complete calculator → `/vysledek?hash=…&ab=a`
2. Open browser DevTools → Application → clear `sessionStorage` keys `ab_exposure_sent`, `view_item_sent:*`
3. GTM **Preview** mode: connect to `localhost:3000`
4. Confirm sequence: `ab_exposure` → `view_item` → (after PDF) `generate_lead` with `lead_type: pdf_download`
5. Repeat with `&ab=b`
6. **GA4 DebugView:** Admin → DebugView; verify parameters and user property `ab_variant`
7. **No-PII check:** no email/name in event payloads
8. **Dedup:** reload `/vysledek` — `view_item` should not fire again for same hash in same session
9. Submit poptávka → `generate_lead` with `lead_type: poptavka`

### Deployed (random assignment)

On Vercel preview/production, variant overrides are ignored. Clear `ab_pdf_funnel_v1` cookie and reload until each variant appears; confirm events in GTM Preview / GA4 DebugView.

### Cross-check

| Source | What to compare |
|--------|-----------------|
| Vercel Analytics | `ab_funnel_view`, `ab_pdf_download`, `ab_poptavka_submit` with `variant` |
| GA4 | `view_item`, `generate_lead` with `ab_variant` |
| Google Sheets | Column Y variant label on PDF/poptávka rows |

### A/B report in GA4

Explore → segment by **AB Variant** custom dimension → compare `generate_lead` rate from `view_item` by variant.

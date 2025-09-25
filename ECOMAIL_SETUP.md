# Ecomail Integration Setup

This document explains how the Ecomail integration works in the cleaning service calculator application.

## Overview

The application integrates with Ecomail to store customer data when they either:
1. Download a PDF offer
2. Submit a formal request (poptávka)

## API Endpoints

### `/api/ecomail/subscribe` (POST)
Stores customer data in Ecomail with custom fields mapped to merge tags.

**Custom Fields Mapping:**
- `*|START_UKLIDU|*` → Service start date
- `*|POZNAMKA|*` → Customer notes
- `*|PDF_OBJEDNAVKA|*` → PDF order URL
- `*|FAKTURACNI_PSC|*` → Billing ZIP code
- `*|FAKTURACNI_MESTO|*` → Billing city
- `*|FAKTURACNI_EMAIL|*` → Billing email
- `*|FAKTURACNI_ADRESA|*` → Billing address

### `/api/regenerate-pdf` (POST)
Regenerates PDF with final customer data and uploads to Google Drive.

## Configuration Required

1. **Ecomail API Key**: Set the `ECOMAIL_API_KEY` environment variable with your Ecomail API key.

2. **Ecomail List ID**: Update the `listId` in `/src/app/api/ecomail/subscribe/route.ts` (line 77) to match your Ecomail list ID.

3. **Google Drive Integration**: Ensure you have:
   - `GDRIVE_PARENT_FOLDER_ID` environment variable set (for regular PDF downloads)
   - `GDRIVE_FINAL_OFFER_FOLDER_ID=13zL_j5CiYdM3rqGLOc2bvboct8IaMFJx` environment variable set (for poptavky submissions)
   - Google Drive OAuth tokens available in cookies
   - Proper Google Drive API permissions for the folder

## Customer Labeling

Customers are tagged based on their action:
- `PDF` - When they download a PDF offer
- `Poptávka` - When they submit a formal request

## Data Updates

The integration uses `update_existing: 1` and `resubscribe: 1` to update existing contacts rather than creating duplicates.

## Environment Variables

Set the following environment variables:
- `ECOMAIL_API_KEY` - Your Ecomail API key

## Error Handling

- Ecomail failures are logged but don't block the main user flow
- PDF regeneration failures will show an error to the user
- Google Drive upload failures are logged but don't block PDF delivery

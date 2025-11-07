# Ecomail Integration Setup

This document explains how the Ecomail integration works in the cleaning service calculator application.

## Overview

The application integrates with Ecomail to:
1. **Store customer data** when they download a PDF or submit a poptávka
2. **Send transactional emails** with PDF attachments when a poptávka is submitted

## API Endpoints

### `/api/ecomail/subscribe` (POST)
Stores customer data in Ecomail with custom fields mapped to merge tags.

**Custom Fields Mapping:**
- `*|START_UKLIDU|*` → Service start date
- `*|POZNAMKA|*` → Customer notes
- `*|PDF_OBJEDNAVKA|*` → PDF order URL (Google Drive link)
- `*|POPTAVKA_URL|*` → Poptavka page URL with hash (for editing/viewing the calculation)
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

## Transactional Emails

### Overview

When a customer submits a poptávka (formal request), the system automatically sends a transactional email with the generated PDF as an attachment.

**Documentation**: [Ecomail Transactional Emails](https://support.ecomail.cz/cs/articles/6197248-transakcni-e-maily)

### Configuration

1. **Ecomail Template**: Create a template in Ecomail (currently using template ID 2)
2. **Transactional Domain**: Verify a subdomain for transactional emails (different from your marketing domain)
3. **Environment Variables**:
   - `ECOMAIL_API_KEY` - Your Ecomail API key
   - `ECOMAIL_FROM_EMAIL` - Sender email (must use verified transactional domain)

### Email Details

**Common Details:**
- **Subject**: "Vaše kalkulace úklidových služeb Handy Hands"
- **Sender**: Handy Hands
- **Attachment**: Generated PDF with customer's calculation
- **Merge Variables**:
  - `customer_name` - Customer's name
  - `pdf_url` - Google Drive link to PDF
  - `service_title` - Type of service (e.g., "Pravidelný úklid kancelářských prostor")

**Template IDs:**
- **Template ID 2**: Poptávka submission email (formal request)
- **Template ID 3**: Regular PDF download email (from /vysledek page)

### When Emails Are Sent

Transactional emails are sent:
- ✅ When a poptávka is submitted AND PDF is uploaded to Google Drive (Template ID 2)
- ✅ When a PDF is downloaded from /vysledek page AND PDF is uploaded to Google Drive (Template ID 3)

### Implementation

The transactional email service is located at `/src/utils/ecomail-transactional.ts` and provides:

```typescript
sendTransactionalEmail({
  to: [{ email: 'customer@example.com', name: 'Customer Name' }],
  subject: 'Email Subject',
  fromName: 'Sender Name',
  fromEmail: 'sender@domain.com',
  templateId: 2, // Or use html/text for inline content
  attachments: [{ type: 'application/pdf', name: 'file.pdf', content: 'base64...' }],
  globalMergeVars: [{ name: 'variable_name', content: 'value' }],
})
```

### API Endpoints

The service uses Ecomail's API endpoints:
- **With template**: `POST /transactional/send-template`
- **Inline content**: `POST /transactional/send-message`

## Environment Variables

Set the following environment variables:
- `ECOMAIL_API_KEY` - Your Ecomail API key
- `ECOMAIL_API_URL` - Ecomail API base URL (default: https://api2.ecomail.app)
- `ECOMAIL_FROM_EMAIL` - Sender email address (must use verified transactional domain)

## Error Handling

- Ecomail subscription failures are logged but don't block the main user flow
- Transactional email failures are logged but don't block PDF generation
- PDF generation failures will show an error to the user
- All failures are logged to console for debugging
- Google Drive upload failures are logged but don't block PDF delivery

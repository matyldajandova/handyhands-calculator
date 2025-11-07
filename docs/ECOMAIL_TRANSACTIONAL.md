# Ecomail Transactional Email Service

Universal service for sending transactional emails via Ecomail API.

## Overview

The transactional email service (`src/utils/ecomail-transactional.ts`) provides a flexible, reusable way to send transactional emails through Ecomail's API.

**Official Documentation**: [Ecomail Transactional Emails](https://support.ecomail.cz/cs/articles/6197248-transakcni-e-maily)

## Features

- ✅ Send emails using Ecomail templates or inline content (HTML/text)
- ✅ Attach files (PDFs, images, etc.) up to 4 MB total
- ✅ Use merge variables for personalization
- ✅ Track opens and clicks
- ✅ Full TypeScript support
- ✅ Comprehensive error handling and logging

## Current Implementation

### 1. Poptávka PDF Email (Template ID 2)

When a customer submits a poptávka (formal request), an email is automatically sent with:

- **Subject**: "Vaše kalkulace úklidových služeb Handy Hands"
- **Template**: ID 2 (created in Ecomail)
- **Attachment**: Generated PDF with calculation
- **Merge Variables**:
  - `customer_name` - Customer's full name
  - `pdf_url` - Google Drive link to PDF
  - `service_title` - Type of service

**Location**: `/src/app/api/pdf/offer/route.tsx` (lines 399-437)

### 2. Regular PDF Download Email (Template ID 3)

When a customer downloads a PDF from the /vysledek results page, an email is automatically sent with:

- **Subject**: "Vaše kalkulace úklidových služeb Handy Hands"
- **Template**: ID 3 (created in Ecomail)
- **Attachment**: Generated PDF with calculation
- **Merge Variables**:
  - `customer_name` - Customer's full name
  - `pdf_url` - Google Drive link to PDF
  - `service_title` - Type of service

**Location**: `/src/app/api/pdf/offer/route.tsx` (lines 399-437)

**Note**: Both email types use the same logic but different template IDs to allow for different messaging/styling in Ecomail.

## Usage

### Basic Example with Template

```typescript
import { sendTransactionalEmail } from '@/utils/ecomail-transactional';

const result = await sendTransactionalEmail({
  to: [{
    email: 'customer@example.com',
    name: 'Jan Novák',
  }],
  subject: 'Your Order Confirmation',
  fromName: 'Handy Hands',
  fromEmail: 'orders@handyhands.cz',
  templateId: 2, // Template created in Ecomail
  globalMergeVars: [
    { name: 'customer_name', content: 'Jan Novák' },
    { name: 'order_id', content: '12345' },
  ],
});

if (result.success) {
  console.log('Email sent:', result.messageId);
} else {
  console.error('Email failed:', result.error);
}
```

### Example with PDF Attachment

```typescript
import { 
  sendTransactionalEmail, 
  createPdfAttachment 
} from '@/utils/ecomail-transactional';

const pdfBuffer = Buffer.from(/* PDF data */);

const result = await sendTransactionalEmail({
  to: [{ email: 'customer@example.com', name: 'Jan Novák' }],
  subject: 'Your PDF Document',
  fromName: 'Handy Hands',
  fromEmail: 'documents@handyhands.cz',
  templateId: 3,
  attachments: [
    createPdfAttachment(pdfBuffer, 'invoice.pdf')
  ],
});
```

### Example with Inline HTML

```typescript
const result = await sendTransactionalEmail({
  to: [{ email: 'customer@example.com' }],
  subject: 'Welcome!',
  fromName: 'Handy Hands',
  fromEmail: 'hello@handyhands.cz',
  html: '<h1>Welcome!</h1><p>Thank you for signing up.</p>',
  // Or use plain text:
  // text: 'Welcome! Thank you for signing up.',
});
```

### Example with Multiple Recipients

```typescript
const result = await sendTransactionalEmail({
  to: [
    { 
      email: 'customer@example.com', 
      name: 'Customer',
      cc: 'manager@company.com',
      bcc: 'archive@company.com'
    }
  ],
  subject: 'Important Notification',
  fromName: 'Handy Hands',
  fromEmail: 'notify@handyhands.cz',
  templateId: 4,
});
```

## API Reference

### `sendTransactionalEmail(params)`

Sends a transactional email via Ecomail API.

#### Parameters

```typescript
interface SendTransactionalEmailParams {
  // Required: Recipient information
  to: EcomailRecipient[];
  
  // Required: Email metadata
  subject: string;
  fromName: string;
  fromEmail: string; // Must use verified transactional domain
  
  // Optional: Reply-to
  replyTo?: string;
  
  // Content: Use either templateId OR html/text
  templateId?: number; // Ecomail template ID
  html?: string; // HTML content (requires text or html)
  text?: string; // Plain text content
  
  // Optional: Attachments (max 4 MB total)
  attachments?: EcomailAttachment[];
  
  // Optional: Personalization
  globalMergeVars?: EcomailMergeVar[];
  
  // Optional: Metadata
  metadata?: Record<string, string>;
  
  // Optional: Tracking (default: true)
  clickTracking?: boolean;
  openTracking?: boolean;
}
```

#### Returns

```typescript
interface SendTransactionalEmailResult {
  success: boolean;
  messageId?: string; // Ecomail message ID
  error?: string;
  details?: unknown;
}
```

### Helper Functions

#### `createPdfAttachment(buffer, filename)`

Creates a PDF attachment from a buffer.

```typescript
const attachment = createPdfAttachment(
  pdfBuffer, // Buffer or Uint8Array
  'document.pdf' // Filename (optional .pdf extension)
);
```

#### `bufferToBase64(buffer)`

Converts a buffer to base64 string.

```typescript
const base64 = bufferToBase64(buffer);
```

## Configuration

### Environment Variables

```bash
# Required
ECOMAIL_API_KEY=your_api_key_here
ECOMAIL_API_URL=https://api2.ecomail.app

# Required for sending emails
ECOMAIL_FROM_EMAIL=transactional@your-domain.cz
```

### Ecomail Setup

1. **Create Templates**: Go to Ecomail → Templates → Create new template
2. **Verify Domain**: Go to Settings → Domains → Add transactional subdomain
3. **Get API Key**: Go to Account Settings → For Developers → API Key

### Best Practices

1. **Use Subdomain**: Use a separate subdomain for transactional emails (e.g., `transactional.handyhands.cz`) to separate from marketing emails
2. **Template vs Inline**: Use templates for consistent branding, inline HTML for simple notifications
3. **Merge Variables**: Always provide default values for merge variables
4. **Error Handling**: Don't fail the main flow if email fails - log and continue
5. **Attachment Size**: Keep total size under 2 MB (4 MB max)

## Limitations

- **Max Attachment Size**: 4 MB total (including all attachments)
- **Rate Limits**: Transactional emails count should not exceed 10x your database size
- **Tracking**: Can be disabled for privacy-sensitive emails
- **Recipients**: Database contacts don't need to exist (unlike marketing emails)

## Troubleshooting

### Email Not Received

1. **Check logs**: Look for "Transactional email sent successfully" in server logs
2. **Verify domain**: Ensure `ECOMAIL_FROM_EMAIL` uses a verified transactional domain
3. **Check spam**: Transactional emails typically go to primary inbox, but check spam
4. **API key**: Verify `ECOMAIL_API_KEY` is correct and has transactional email permissions

### Generation Failure Error

This typically means an error in email content, most commonly:
- Invalid merge tag syntax
- Missing required merge variable
- Template ID doesn't exist

### Common Errors

```typescript
// ❌ Bad: fromEmail not verified
fromEmail: 'random@gmail.com'

// ✅ Good: Use verified transactional domain
fromEmail: 'transactional@handyhands.cz'

// ❌ Bad: Missing required content
templateId: undefined,
html: undefined,
text: undefined

// ✅ Good: Provide either templateId OR html/text
templateId: 2

// ❌ Bad: Attachment too large
attachments: [{ content: '... 10 MB base64 ...' }]

// ✅ Good: Keep under 2-4 MB
attachments: [createPdfAttachment(smallBuffer, 'doc.pdf')]
```

## Future Enhancements

Ideas for next iteration:

1. **Email Templates**: Create more templates for different scenarios
   - Order confirmation
   - Service reminder
   - Follow-up emails

2. **Queue System**: Implement email queue for better reliability
3. **Retry Logic**: Auto-retry failed emails
4. **Email Status**: Track delivery status via webhook
5. **Scheduled Emails**: Send emails at specific times

## Examples for Next Iteration

### Order Confirmation Email

```typescript
await sendTransactionalEmail({
  to: [{ email: customer.email, name: customer.name }],
  subject: 'Potvrzení objednávky',
  fromName: 'Handy Hands',
  fromEmail: process.env.ECOMAIL_FROM_EMAIL,
  templateId: 5, // Create template for order confirmation
  globalMergeVars: [
    { name: 'order_id', content: orderId },
    { name: 'order_date', content: orderDate },
    { name: 'total_price', content: totalPrice },
  ],
});
```

### Service Reminder Email

```typescript
await sendTransactionalEmail({
  to: [{ email: customer.email }],
  subject: 'Připomínka nadcházející služby',
  fromName: 'Handy Hands',
  fromEmail: process.env.ECOMAIL_FROM_EMAIL,
  templateId: 6,
  globalMergeVars: [
    { name: 'service_date', content: serviceDate },
    { name: 'service_type', content: serviceType },
  ],
});
```

## Resources

- [Ecomail Transactional Email Documentation](https://support.ecomail.cz/cs/articles/6197248-transakcni-e-maily)
- [Ecomail API Documentation](https://ecomail.docs.apiary.io/)
- Source Code: `/src/utils/ecomail-transactional.ts`

/**
 * Ecomail Transactional Email Service
 * Universal service for sending transactional emails via Ecomail API
 * 
 * Documentation: https://support.ecomail.cz/cs/articles/6197248-transakcni-e-maily
 */

const ECOMAIL_API_KEY = process.env.ECOMAIL_API_KEY;
const ECOMAIL_API_URL = process.env.ECOMAIL_API_URL;

export interface EcomailAttachment {
  type: string; // MIME type, e.g., "application/pdf"
  name: string; // Filename with extension
  content: string; // Base64 encoded content
}

export interface EcomailRecipient {
  email: string;
  name?: string;
  cc?: string;
  bcc?: string;
}

export interface EcomailMergeVar {
  name: string;
  content: string;
}

export interface SendTransactionalEmailParams {
  // Recipient information
  to: EcomailRecipient[];
  
  // Email content
  subject: string;
  fromName: string;
  fromEmail: string;
  replyTo?: string;
  
  // Content (either text/html or templateId)
  text?: string;
  html?: string;
  templateId?: number;
  
  // Optional features
  attachments?: EcomailAttachment[];
  globalMergeVars?: EcomailMergeVar[];
  metadata?: Record<string, string>;
  
  // Tracking options
  clickTracking?: boolean;
  openTracking?: boolean;
}

export interface SendTransactionalEmailResult {
  success: boolean;
  messageId?: string;
  error?: string;
  details?: unknown;
}

/**
 * Send a transactional email via Ecomail API
 * Supports both inline content (text/html) and templates
 */
export async function sendTransactionalEmail(
  params: SendTransactionalEmailParams
): Promise<SendTransactionalEmailResult> {
  // Validate API configuration
  if (!ECOMAIL_API_KEY) {
    console.error('[ECOMAIL] Ecomail API key not configured');
    return {
      success: false,
      error: 'Ecomail API key not configured',
    };
  }

  if (!ECOMAIL_API_URL) {
    console.error('[ECOMAIL] Ecomail API URL not configured');
    return {
      success: false,
      error: 'Ecomail API URL not configured',
    };
  }

  // Determine which endpoint to use
  const useTemplate = params.templateId !== undefined;
  const endpoint = useTemplate
    ? `${ECOMAIL_API_URL}/transactional/send-template`
    : `${ECOMAIL_API_URL}/transactional/send-message`;

  // Build request payload based on endpoint type
  let payload: Record<string, unknown>;

  if (useTemplate) {
    // Send transactional template endpoint
    payload = {
      message: {
        template_id: params.templateId,
        subject: params.subject,
        from_name: params.fromName,
        from_email: params.fromEmail,
        reply_to: params.replyTo,
        to: params.to,
        global_merge_vars: params.globalMergeVars || [],
        metadata: params.metadata,
        attachments: params.attachments || [],
        options: {
          click_tracking: params.clickTracking ?? true,
          open_tracking: params.openTracking ?? true,
        },
      },
    };
  } else {
    // Send inline email endpoint
    payload = {
      message: {
        subject: params.subject,
        from_name: params.fromName,
        from_email: params.fromEmail,
        reply_to: params.replyTo,
        text: params.text,
        html: params.html,
        to: params.to,
        global_merge_vars: params.globalMergeVars || [],
        metadata: params.metadata,
        attachments: params.attachments || [],
        options: {
          click_tracking: params.clickTracking ?? true,
          open_tracking: params.openTracking ?? true,
        },
      },
    };
  }

  console.log('[ECOMAIL] Sending transactional email via Ecomail:', {
    endpoint,
    useTemplate,
    templateId: params.templateId,
    subject: params.subject,
    toEmail: params.to[0]?.email,
    hasAttachments: (params.attachments?.length || 0) > 0,
    attachmentCount: params.attachments?.length || 0,
  });

  try {
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Key': ECOMAIL_API_KEY,
      },
      body: JSON.stringify(payload),
    });

    const responseText = await response.text();
    let result;
    try {
      result = JSON.parse(responseText);
    } catch {
      result = responseText;
    }

    if (!response.ok) {
      console.error('[ECOMAIL] Ecomail transactional email error:', {
        status: response.status,
        statusText: response.statusText,
        response: result,
      });
      
      return {
        success: false,
        error: `Failed to send email: ${response.status} ${response.statusText}`,
        details: result,
      };
    }

    console.log('[ECOMAIL] Transactional email sent successfully:', {
      messageId: result.message_id || result.id,
      toEmail: params.to[0]?.email,
    });

    return {
      success: true,
      messageId: result.message_id || result.id,
      details: result,
    };
  } catch (error) {
    console.error('[ECOMAIL] Error sending transactional email:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : String(error),
      details: error,
    };
  }
}

/**
 * Convert a Buffer to base64 string for attachment
 */
export function bufferToBase64(buffer: Buffer | Uint8Array): string {
  if (Buffer.isBuffer(buffer)) {
    return buffer.toString('base64');
  }
  return Buffer.from(buffer).toString('base64');
}

/**
 * Create a PDF attachment from a buffer
 */
export function createPdfAttachment(
  pdfBuffer: Buffer | Uint8Array,
  filename: string
): EcomailAttachment {
  return {
    type: 'application/pdf',
    name: filename.endsWith('.pdf') ? filename : `${filename}.pdf`,
    content: bufferToBase64(pdfBuffer),
  };
}

/**
 * Create a DOCX attachment from a buffer
 */
export function createDocxAttachment(
  docxBuffer: Buffer | Uint8Array,
  filename: string
): EcomailAttachment {
  return {
    type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    name: filename.endsWith('.docx') ? filename : `${filename}.docx`,
    content: bufferToBase64(docxBuffer),
  };
}


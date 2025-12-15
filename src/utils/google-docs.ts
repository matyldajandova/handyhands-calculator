import { google } from "googleapis";

// Type definitions for Google Docs API
type TextRun = { content?: string };
type ParagraphElement = { textRun?: TextRun };
type Paragraph = { elements?: ParagraphElement[] };
type BodyContent = { paragraph?: Paragraph };
type DocsGetResponse = {
  documentId?: string;
  title?: string;
  body?: { content?: BodyContent[] };
};

type DocsApiType = {
  documents: {
    get: (options: { documentId: string }) => Promise<{ data: DocsGetResponse }>;
    batchUpdate: (options: {
      documentId: string;
      requestBody: {
        requests: Array<{
          insertText?: { location: { index: number }; text: string };
          deleteContentRange?: { range: { startIndex: number; endIndex: number } };
          replaceAllText?: { containsText: { text: string; matchCase?: boolean }; replaceText: string };
        }>;
      };
    }) => Promise<{ data: { documentId?: string } }>;
  };
};

// Type definitions for Google Drive API (for cloning and exporting)
type DriveApiType = {
  files: {
    get: (options: { fileId: string; fields?: string }) => Promise<{ data: { owners?: Array<{ emailAddress?: string }> } }>;
    copy: (options: {
      fileId: string;
      requestBody: { name?: string; parents?: string[] };
    }) => Promise<{ data: { id?: string; name?: string } }>;
    update: (options: {
      fileId: string;
      addParents?: string;
      removeParents?: string;
    }) => Promise<unknown>;
    delete: (options: { fileId: string }) => Promise<void>;
    export: (options: {
      fileId: string;
      mimeType: string;
    }) => Promise<{ data: Buffer | Uint8Array }>;
  };
  permissions: {
    create: (options: {
      fileId: string;
      transferOwnership: boolean;
      requestBody: { role: string; type: string; emailAddress: string };
    }) => Promise<unknown>;
  };
};

/**
 * Get Google Docs client using OAuth authentication
 * OAuth account is required (same account as PDF uploads)
 */
async function getDocsClient() {
  const accessToken = process.env.GOOGLE_ACCESS_TOKEN;
  
  if (!accessToken) {
    throw new Error(
      'GOOGLE_ACCESS_TOKEN environment variable is required for Google Docs integration.\n' +
      'Please complete the OAuth flow at /api/google/oauth/init and set GOOGLE_ACCESS_TOKEN.'
    );
  }

  try {
    const { getOAuthClient, getTokensFromEnv } = await import('@/utils/google-drive');
    const oauth2Client = getOAuthClient();
    const tokens = getTokensFromEnv();
    
    if (!tokens) {
      throw new Error('Failed to get OAuth tokens from environment variables');
    }

    oauth2Client.setCredentials(tokens);
    
    return google.docs({ version: 'v1', auth: oauth2Client });
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    throw new Error(
      `Failed to initialize OAuth client for Google Docs: ${errorMsg}\n` +
      'Please ensure GOOGLE_ACCESS_TOKEN and GOOGLE_REFRESH_TOKEN are set correctly.'
    );
  }
}

/**
 * Get Google Drive client using OAuth tokens only
 * OAuth account is required (same account as PDF uploads)
 */
async function getDriveClient() {
  const accessToken = process.env.GOOGLE_ACCESS_TOKEN;
  const refreshToken = process.env.GOOGLE_REFRESH_TOKEN;
  
  if (!accessToken) {
    throw new Error(
      'GOOGLE_ACCESS_TOKEN environment variable is required for Google Drive integration.\n' +
      'Please complete the OAuth flow at /api/google/oauth/init and set GOOGLE_ACCESS_TOKEN.'
    );
  }

  try {
    const { getOAuthClient, getTokensFromEnv } = await import('@/utils/google-drive');
    const oauth2Client = getOAuthClient();
    const tokens = getTokensFromEnv();
    
    if (!tokens) {
      throw new Error('Failed to get OAuth tokens from environment variables');
    }

    oauth2Client.setCredentials(tokens);
    
    return {
      drive: google.drive({ version: 'v3', auth: oauth2Client }),
      isOAuth: true,
      tokens,
      refreshToken,
    };
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    throw new Error(
      `Failed to initialize OAuth client for Google Drive: ${errorMsg}\n` +
      'Please ensure GOOGLE_ACCESS_TOKEN and GOOGLE_REFRESH_TOKEN are set correctly.'
    );
  }
}

/**
 * Read a Google Docs document
 * @param documentId - The ID of the document to read
 * @returns Promise with document content
 */
export async function readGoogleDoc(documentId: string): Promise<{
  documentId: string;
  title: string;
  content: string;
}> {
  const docs = await getDocsClient();
  const docsApi = docs as unknown as DocsApiType;

  try {
    const document = await docsApi.documents.get({ documentId });
    
    // Extract text content from the document
    const content: string[] = [];
    const body = document.data.body?.content || [];
    
    for (const element of body) {
      if (element.paragraph?.elements) {
        for (const paraElement of element.paragraph.elements) {
          if (paraElement.textRun?.content) {
            content.push(paraElement.textRun.content);
          }
        }
      }
    }

    return {
      documentId: document.data.documentId || documentId,
      title: document.data.title || 'Untitled Document',
      content: content.join(''),
    };
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    console.error('[Google Docs] Failed to read document:', {
      documentId,
      error: errorMsg,
    });
    throw error;
  }
}

/**
 * Clone a Google Docs document
 * @param documentId - The ID of the document to clone
 * @param newName - Optional name for the cloned document
 * @param folderId - Optional folder ID to place the cloned document in
 * @returns Promise with the new document ID and name
 */
export async function cloneGoogleDoc(
  documentId: string,
  newName?: string,
  folderId?: string
): Promise<{ documentId: string; name: string }> {
  const driveClient = await getDriveClient();
  const drive = driveClient.drive;
  const driveApi = drive as unknown as DriveApiType;

  // Refresh OAuth token if needed
  if (driveClient.tokens && driveClient.refreshToken) {
    if (driveClient.tokens.expiry_date && driveClient.tokens.expiry_date < Date.now()) {
      try {
        const { getOAuthClient } = await import('@/utils/google-drive');
        const oauth2Client = getOAuthClient();
        oauth2Client.setCredentials(driveClient.tokens);
        await oauth2Client.refreshAccessToken();
      } catch {
        console.warn('[Google Docs] Failed to refresh OAuth token, continuing anyway');
      }
    }
  }

  const copyRequest: { 
    fileId: string; 
    requestBody: { name?: string; parents?: string[] } 
  } = {
    fileId: documentId,
    requestBody: {},
  };

  if (newName) {
    copyRequest.requestBody.name = newName;
  }

  if (folderId) {
    copyRequest.requestBody.parents = [folderId];
  }

  try {
    const copiedFile = await driveApi.files.copy(copyRequest);

    if (!copiedFile.data.id) {
      throw new Error('Failed to clone document: no ID returned');
    }

    return {
      documentId: copiedFile.data.id,
      name: copiedFile.data.name || newName || 'Copy of Document',
    };
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    const is404 = errorMsg.includes('404') || errorMsg.includes('not found') || errorMsg.includes('File not found');
    const is403 = errorMsg.includes('403') || errorMsg.includes('permission') || errorMsg.includes('Forbidden');
    const isQuotaExceeded = errorMsg.includes('quota') || errorMsg.includes('storage');
    
    if (isQuotaExceeded) {
      throw new Error(
        `Google Drive storage quota exceeded for OAuth account.\n` +
        `Please free up space in Google Drive (the account used for PDF uploads).`
      );
    }
    
    if (is404 || is403) {
      throw new Error(
        `Cannot access template document or folder.\n\n` +
        `Please ensure:\n` +
        `1. The template document (ID: ${documentId}) is shared with the OAuth account with "Editor" permissions\n` +
        `2. The destination folder (ID: ${folderId || 'not specified'}) is shared with the OAuth account with "Editor" permissions\n` +
        `3. The Google Drive API is enabled\n` +
        `4. GOOGLE_ACCESS_TOKEN and GOOGLE_REFRESH_TOKEN are set correctly`
      );
    }
    
    console.error('[Google Docs] Failed to clone document:', {
      documentId,
      newName,
      folderId,
      error: errorMsg,
    });
    throw error;
  }
}

/**
 * Modify a Google Docs document using batch update
 * @param documentId - The ID of the document to modify
 * @param requests - Array of modification requests
 * @returns Promise with success status
 */
export async function modifyGoogleDoc(
  documentId: string,
  requests: Array<{
    insertText?: { location: { index: number }; text: string };
    deleteContentRange?: { range: { startIndex: number; endIndex: number } };
    replaceAllText?: { containsText: { text: string; matchCase?: boolean }; replaceText: string };
  }>
): Promise<{ success: boolean; documentId: string }> {
  const docs = await getDocsClient();
  const docsApi = docs as unknown as DocsApiType;

  try {
    await docsApi.documents.batchUpdate({
      documentId,
      requestBody: {
        requests,
      },
    });

    return {
      success: true,
      documentId,
    };
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    console.error('[Google Docs] Failed to modify document:', {
      documentId,
      error: errorMsg,
    });
    throw error;
  }
}

/**
 * Replace all occurrences of text in a Google Docs document
 * @param documentId - The ID of the document to modify
 * @param findText - Text to find
 * @param replaceText - Text to replace with
 * @param matchCase - Whether to match case (default: false)
 * @returns Promise with success status
 */
export async function replaceTextInGoogleDoc(
  documentId: string,
  findText: string,
  replaceText: string,
  matchCase: boolean = false
): Promise<{ success: boolean; documentId: string }> {
  return modifyGoogleDoc(documentId, [
    {
      replaceAllText: {
        containsText: { text: findText, matchCase },
        replaceText,
      },
    },
  ]);
}

/**
 * Export a Google Docs document as PDF
 * @param documentId - The ID of the document to export
 * @returns Promise with PDF buffer
 */
export async function exportGoogleDocAsPdf(documentId: string): Promise<Buffer> {
  const driveClient = await getDriveClient();

  // Refresh OAuth token if needed
  if (driveClient.tokens && driveClient.refreshToken) {
    if (driveClient.tokens.expiry_date && driveClient.tokens.expiry_date < Date.now()) {
      try {
        const { getOAuthClient } = await import('@/utils/google-drive');
        const oauth2Client = getOAuthClient();
        oauth2Client.setCredentials(driveClient.tokens);
        await oauth2Client.refreshAccessToken();
      } catch {
        console.warn('[Google Docs] Failed to refresh OAuth token, continuing anyway');
      }
    }
  }

  try {
    // Export as PDF using Drive API
    // Use the actual drive client directly to get proper stream handling
    const drive = driveClient.drive;
    const response = await (drive as unknown as {
      files: {
        export: (params: {
          fileId: string;
          mimeType: string;
        }, options?: { responseType?: string }) => Promise<{ data: NodeJS.ReadableStream }>;
      };
    }).files.export({
      fileId: documentId,
      mimeType: 'application/pdf',
    }, { responseType: 'stream' });

    // Collect stream into buffer
    const chunks: Buffer[] = [];
    const stream = response.data;
    
    return new Promise<Buffer>((resolve, reject) => {
      stream.on('data', (chunk: Buffer) => {
        chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
      });
      stream.on('end', () => {
        resolve(Buffer.concat(chunks));
      });
      stream.on('error', (err: Error) => {
        reject(err);
      });
    });
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    console.error('[Google Docs] Failed to export document as PDF:', {
      documentId,
      error: errorMsg,
    });
    throw error;
  }
}

/**
 * Export a Google Docs document as DOCX
 * @param documentId - The ID of the document to export
 * @returns Promise with DOCX buffer
 */
export async function exportGoogleDocAsDocx(documentId: string): Promise<Buffer> {
  const driveClient = await getDriveClient();

  // Refresh OAuth token if needed
  if (driveClient.tokens && driveClient.refreshToken) {
    if (driveClient.tokens.expiry_date && driveClient.tokens.expiry_date < Date.now()) {
      try {
        const { getOAuthClient } = await import('@/utils/google-drive');
        const oauth2Client = getOAuthClient();
        oauth2Client.setCredentials(driveClient.tokens);
        await oauth2Client.refreshAccessToken();
      } catch {
        console.warn('[Google Docs] Failed to refresh OAuth token, continuing anyway');
      }
    }
  }

  try {
    // Export as DOCX using Drive API
    // Use the actual drive client directly to get proper stream handling
    const drive = driveClient.drive;
    const response = await (drive as unknown as {
      files: {
        export: (params: {
          fileId: string;
          mimeType: string;
        }, options?: { responseType?: string }) => Promise<{ data: NodeJS.ReadableStream }>;
      };
    }).files.export({
      fileId: documentId,
      mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    }, { responseType: 'stream' });

    // Collect stream into buffer
    const chunks: Buffer[] = [];
    const stream = response.data;
    
    return new Promise<Buffer>((resolve, reject) => {
      stream.on('data', (chunk: Buffer) => {
        chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
      });
      stream.on('end', () => {
        resolve(Buffer.concat(chunks));
      });
      stream.on('error', (err: Error) => {
        reject(err);
      });
    });
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    console.error('[Google Docs] Failed to export document as DOCX:', {
      documentId,
      error: errorMsg,
    });
    throw error;
  }
}

/**
 * Process conditional blocks in a Google Docs document
 * Supports {{#if variable}}...{{/if}} syntax
 * @param documentId - The ID of the document to modify
 * @param variables - Map of variable names to their values (for condition evaluation)
 * @returns Promise with success status
 */
export async function processConditionalBlocks(
  documentId: string,
  variables: Record<string, string | number | boolean | undefined>
): Promise<{ success: boolean; documentId: string }> {
  // First, read the document to find all conditional blocks
  const doc = await readGoogleDoc(documentId);
  const content = doc.content;

  // Find all {{#if variable}}...{{/if}} blocks
  // Using [\s\S]*? for non-greedy matching to handle multiline content
  const ifBlockRegex = /\{\{#if\s+(\w+)\}\}([\s\S]*?)\{\{\/if\}\}/g;
  const matches: Array<{ condition: string; content: string; fullMatch: string }> = [];
  
  let match;
  while ((match = ifBlockRegex.exec(content)) !== null) {
    matches.push({
      condition: match[1].trim(),
      content: match[2],
      fullMatch: match[0],
    });
  }
  
  // Sort matches by length (longest first) to avoid partial replacements
  matches.sort((a, b) => b.fullMatch.length - a.fullMatch.length);

  if (matches.length === 0) {
    // No conditional blocks found, nothing to do
    return { success: true, documentId };
  }

  // Prepare batch update requests
  const requests: Array<{
    replaceAllText?: {
      containsText: { text: string; matchCase?: boolean };
      replaceText: string;
    };
  }> = [];

  // Process each conditional block
  for (const block of matches) {
    // Evaluate condition: check if variable exists and is truthy
    const variableValue = variables[block.condition];
    const isTruthy = variableValue !== undefined && 
                     variableValue !== null && 
                     variableValue !== '' && 
                     variableValue !== 0 && 
                     variableValue !== false;

    if (isTruthy) {
      // Condition is true: replace the entire block with just the content
      requests.push({
        replaceAllText: {
          containsText: { text: block.fullMatch, matchCase: false },
          replaceText: block.content,
        },
      });
    } else {
      // Condition is false: remove the entire block
      requests.push({
        replaceAllText: {
          containsText: { text: block.fullMatch, matchCase: false },
          replaceText: '',
        },
      });
    }
  }

  if (requests.length === 0) {
    return { success: true, documentId };
  }

  // Apply all replacements
  return modifyGoogleDoc(documentId, requests);
}


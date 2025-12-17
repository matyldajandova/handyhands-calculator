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

/**
 * Format cleaning services list with proper bullets and bold headings
 * Finds the inserted text by searching for the first category heading, then formats it.
 * Category headings: bold, no bullet
 * Standard services: 1st level bullets
 * Optional heading ("Příplatkové služby:"): bold, 1st level bullet
 * Optional services: 2nd level bullets (nested using indentation)
 */
export async function formatCleaningServicesListInDoc(
  documentId: string,
  categoryHeadings: string[],
  optionalHeadings: string[]
): Promise<{ success: boolean; documentId: string }> {
  const docs = await getDocsClient();
  const docsApi = docs as unknown as DocsApiType;

  try {
    const doc = await docsApi.documents.get({ documentId });
    const requests: Array<{
      updateTextStyle?: {
        range: { startIndex: number; endIndex: number };
        textStyle: { bold?: boolean };
        fields: string;
      };
      createParagraphBullets?: {
        range: { startIndex: number; endIndex: number };
        bulletPreset?: string;
      };
      updateParagraphStyle?: {
        range: { startIndex: number; endIndex: number };
        paragraphStyle: {
          indentFirstLine?: { magnitude: number; unit: string };
          indentStart?: { magnitude: number; unit: string };
        };
        fields: string;
      };
    }> = [];

    // Parse all paragraphs and find the ones that match our headings (the inserted content)
    let currentIndex = 1;
    const paragraphInfo: Array<{
      startIndex: number;
      endIndex: number;
      text: string;
      isCategoryHeading: boolean;
      isOptionalHeading: boolean;
      isService: boolean;
      paragraphIndex: number;
    }> = [];
    
    const bodyContent = doc.data.body?.content || [];
    let paragraphIndex = 0;
    let foundServicesSection = false;
    const firstHeading = categoryHeadings[0];
    
    for (const element of bodyContent) {
      if (element.paragraph?.elements) {
        const paraStart = currentIndex;
        let paraText = '';
        
        for (const paraElement of element.paragraph.elements) {
          if (paraElement.textRun?.content) {
            paraText += paraElement.textRun.content;
            currentIndex += paraElement.textRun.content.length;
          }
        }
        
        const paraTextEnd = currentIndex; // Index after last character of text (before separator)
        const trimmedText = paraText.trim();
        
        // Check if we've reached the services section (first category heading)
        if (!foundServicesSection && trimmedText === firstHeading) {
          foundServicesSection = true;
        }
        
        // Only process paragraphs in the services section
        if (foundServicesSection) {
          const isCategoryHeading = categoryHeadings.some(h => trimmedText === h);
          const isOptionalHeading = optionalHeadings.some(h => trimmedText === h || trimmedText.includes(h));
          const isService = !isCategoryHeading && !isOptionalHeading && trimmedText !== '';
          
          // Store both the text end (before separator) and the separator position
          paragraphInfo.push({
            startIndex: paraStart,
            endIndex: paraTextEnd, // Index at the END of the paragraph text (before separator)
            text: trimmedText,
            isCategoryHeading,
            isOptionalHeading,
            isService,
            paragraphIndex: paragraphIndex++,
          });
          
          // Stop when we've found all expected headings and processed a reasonable number of paragraphs
          const foundHeadings = paragraphInfo.filter(p => p.isCategoryHeading).length;
          if (foundHeadings >= categoryHeadings.length) {
            // Check if we've gone past the last service (empty paragraphs or non-service content)
            const lastFewParas = paragraphInfo.slice(-3);
            if (lastFewParas.length === 3 && lastFewParas.every(p => p.text === '' || (!p.isCategoryHeading && !p.isOptionalHeading && !p.isService))) {
              break;
            }
          }
        }
        
        currentIndex += 1; // Add paragraph separator (now currentIndex points AFTER the separator)
      } else {
        currentIndex += 1;
      }
    }
    
    console.log('[formatCleaningServicesListInDoc] Found', paragraphInfo.length, 'paragraphs in services section');

    // Find services section range
    let firstHeadingIndex = -1;
    let lastServiceIndex = -1;
    
    for (let i = 0; i < paragraphInfo.length; i++) {
      if (paragraphInfo[i].isCategoryHeading && firstHeadingIndex === -1) {
        firstHeadingIndex = i;
      }
      if (paragraphInfo[i].isService || paragraphInfo[i].isOptionalHeading) {
        lastServiceIndex = i;
      }
    }
    
    if (firstHeadingIndex === -1 || lastServiceIndex === -1) {
      console.log('[formatCleaningServicesListInDoc] Could not find services section');
      return { success: false, documentId };
    }

    // Format category headings as bold (no bullets)
    for (let i = firstHeadingIndex; i <= lastServiceIndex; i++) {
      const para = paragraphInfo[i];
      if (para.isCategoryHeading) {
        // For updateTextStyle, use endIndex directly (it's at the end of text, before separator)
        if (para.endIndex > para.startIndex) {
          requests.push({
            updateTextStyle: {
              range: { startIndex: para.startIndex, endIndex: para.endIndex },
              textStyle: { bold: true },
              fields: 'bold',
            },
          });
        }
      }
    }

    // Group services by category
    const serviceGroups: Array<{
      standardServices: typeof paragraphInfo;
      optionalHeading: typeof paragraphInfo[0] | null;
      optionalServices: typeof paragraphInfo;
    }> = [];
    
    let currentGroup = {
      standardServices: [] as typeof paragraphInfo,
      optionalHeading: null as typeof paragraphInfo[0] | null,
      optionalServices: [] as typeof paragraphInfo,
    };
    
    for (let i = firstHeadingIndex; i <= lastServiceIndex; i++) {
      const para = paragraphInfo[i];
      if (para.isCategoryHeading) {
        if (currentGroup.standardServices.length > 0 || currentGroup.optionalServices.length > 0) {
          serviceGroups.push(currentGroup);
        }
        currentGroup = {
          standardServices: [],
          optionalHeading: null,
          optionalServices: [],
        };
      } else if (para.isOptionalHeading) {
        currentGroup.optionalHeading = para;
      } else if (para.isService) {
        if (currentGroup.optionalHeading) {
          currentGroup.optionalServices.push(para);
        } else {
          currentGroup.standardServices.push(para);
        }
      }
    }
    if (currentGroup.standardServices.length > 0 || currentGroup.optionalServices.length > 0) {
      serviceGroups.push(currentGroup);
    }

    // Apply bullets and formatting
    for (const group of serviceGroups) {
      // Standard services + optional heading: 1st level bullets
      const allFirstLevel: typeof paragraphInfo = [...group.standardServices];
      if (group.optionalHeading) {
        allFirstLevel.push(group.optionalHeading);
      }
      
      if (allFirstLevel.length > 0) {
        const firstPara = allFirstLevel[0];
        const lastPara = allFirstLevel[allFirstLevel.length - 1];
        // For createParagraphBullets, endIndex should be the start of the paragraph AFTER the last one
        // Since lastPara.endIndex is before the separator, we add 1 to include the separator
        // But we need to make sure we don't exceed document bounds
        // Actually, let's find the next paragraph's startIndex if it exists
        let bulletsEndIndex = lastPara.endIndex + 1; // Include the separator
        
        // Check if there's a next paragraph in paragraphInfo
        const lastParaIndex = paragraphInfo.findIndex(p => p === lastPara);
        if (lastParaIndex !== -1 && lastParaIndex < paragraphInfo.length - 1) {
          // Use the startIndex of the next paragraph as the end
          bulletsEndIndex = paragraphInfo[lastParaIndex + 1].startIndex;
        }
        
        // Validate range
        if (bulletsEndIndex > firstPara.startIndex) {
          requests.push({
            createParagraphBullets: {
              range: {
                startIndex: firstPara.startIndex,
                endIndex: bulletsEndIndex,
              },
              bulletPreset: 'BULLET_DISC_CIRCLE_SQUARE',
            },
          });
        }
      }
      
      // Optional services: 2nd level (indent + bullets)
      if (group.optionalServices.length > 0) {
        const firstPara = group.optionalServices[0];
        const lastPara = group.optionalServices[group.optionalServices.length - 1];
        
        // First apply bullets - endIndex should exclude the paragraph separator
        const bulletsEndIndex = lastPara.endIndex - 1;
        // Make sure endIndex is valid (greater than startIndex)
        if (bulletsEndIndex > firstPara.startIndex) {
          requests.push({
            createParagraphBullets: {
              range: {
                startIndex: firstPara.startIndex,
                endIndex: bulletsEndIndex,
              },
              bulletPreset: 'BULLET_DISC_CIRCLE_SQUARE',
            },
          });
        }
        
        // Then indent for nesting (36pt = 0.5 inch standard indent)
        for (const para of group.optionalServices) {
          // endIndex should exclude the paragraph separator
          const paraEnd = para.endIndex - 1;
          // Make sure endIndex is valid
          if (paraEnd > para.startIndex) {
            requests.push({
              updateParagraphStyle: {
                range: {
                  startIndex: para.startIndex,
                  endIndex: paraEnd,
                },
                paragraphStyle: {
                  indentFirstLine: { magnitude: 36, unit: 'PT' },
                  indentStart: { magnitude: 36, unit: 'PT' },
                },
                fields: 'indentFirstLine,indentStart',
              },
            });
          }
        }
      }
    }

    if (requests.length === 0) {
      return { success: true, documentId };
    }

    await (docsApi.documents.batchUpdate as any)({
      documentId,
      requestBody: { requests },
    });

    console.log('[formatCleaningServicesListInDoc] Applied', requests.length, 'formatting requests');
    return { success: true, documentId };
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    console.error('[formatCleaningServicesListInDoc] Error:', errorMsg);
    return { success: false, documentId };
  }
}


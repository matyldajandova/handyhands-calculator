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

// Type definitions for Google Drive API (for cloning)
type DriveApiType = {
  files: {
    copy: (options: {
      fileId: string;
      requestBody: { name?: string; parents?: string[] };
    }) => Promise<{ data: { id?: string; name?: string } }>;
  };
};

/**
 * Get Google Docs client using Service Account authentication
 * This is more reliable than OAuth for server-side operations
 */
function getDocsClient() {
  const clientEmail = process.env.GOOGLE_CLIENT_EMAIL;
  const privateKey = process.env.GOOGLE_PRIVATE_KEY;

  if (!clientEmail || !privateKey) {
    throw new Error('GOOGLE_CLIENT_EMAIL and GOOGLE_PRIVATE_KEY environment variables are required for Google Docs integration');
  }

  // Use type assertion to work with GoogleAuth
  const GoogleAuth = (google.auth as { GoogleAuth: new (options: {
    credentials?: {
      client_email?: string;
      private_key?: string;
    };
    scopes?: string[];
  }) => unknown }).GoogleAuth;

  const auth = new GoogleAuth({
    credentials: {
      client_email: clientEmail,
      private_key: privateKey.replace(/\\n/g, '\n'), // Handle escaped newlines
    },
    scopes: [
      'https://www.googleapis.com/auth/documents',
      'https://www.googleapis.com/auth/drive.file',
    ],
  });

  return google.docs({ version: 'v1', auth: auth as { getClient(): Promise<unknown> } });
}

/**
 * Get Google Drive client using Service Account authentication
 * Used for cloning documents
 */
function getDriveClient() {
  const clientEmail = process.env.GOOGLE_CLIENT_EMAIL;
  const privateKey = process.env.GOOGLE_PRIVATE_KEY;

  if (!clientEmail || !privateKey) {
    throw new Error('GOOGLE_CLIENT_EMAIL and GOOGLE_PRIVATE_KEY environment variables are required for Google Drive integration');
  }

  const GoogleAuth = (google.auth as { GoogleAuth: new (options: {
    credentials?: {
      client_email?: string;
      private_key?: string;
    };
    scopes?: string[];
  }) => unknown }).GoogleAuth;

  const auth = new GoogleAuth({
    credentials: {
      client_email: clientEmail,
      private_key: privateKey.replace(/\\n/g, '\n'),
    },
    scopes: ['https://www.googleapis.com/auth/drive.file'],
  });

  return google.drive({ version: 'v3', auth: auth as { getClient(): Promise<unknown> } });
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
  const docs = getDocsClient();
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
 * @returns Promise with the new document ID and name
 */
export async function cloneGoogleDoc(
  documentId: string,
  newName?: string
): Promise<{ documentId: string; name: string }> {
  const drive = getDriveClient();
  const driveApi = drive as unknown as DriveApiType;

  try {
    const copyRequest: { fileId: string; requestBody: { name?: string } } = {
      fileId: documentId,
      requestBody: {},
    };

    if (newName) {
      copyRequest.requestBody.name = newName;
    }

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
    console.error('[Google Docs] Failed to clone document:', {
      documentId,
      newName,
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
  const docs = getDocsClient();
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


import { google } from "googleapis";
import { Readable } from "node:stream";

type OAuthTokens = {
  access_token: string;
  refresh_token?: string;
  scope?: string;
  expiry_date?: number;
  token_type?: string;
};

type DriveFilesApi = {
  list: (options: { q: string; fields: string; pageSize: number }) => Promise<{ data: { files?: Array<{ id?: string; name?: string }> } }>;
  create: (options: {
    requestBody: { name: string; mimeType?: string; parents?: string[] };
    media?: { mimeType?: string; body?: Readable };
    fields?: string;
  }) => Promise<{ data: { id?: string } }>;
};

export function getOAuthClient() {
  const clientId = process.env.GOOGLE_CLIENT_ID!;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET!;
  const redirectUri = process.env.GOOGLE_REDIRECT_URI!;

  const oauth2Client = new google.auth.OAuth2(clientId, clientSecret, redirectUri);
  return oauth2Client;
}

/**
 * Get OAuth tokens from environment variables (server-side) or return null
 * Constructs token object from individual env vars: GOOGLE_ACCESS_TOKEN, GOOGLE_REFRESH_TOKEN
 * Token type is always "Bearer", expiry date is read from refreshed tokens, scope is not needed
 */
export function getTokensFromEnv(): OAuthTokens | null {
  const accessToken = process.env.GOOGLE_ACCESS_TOKEN;
  if (!accessToken) {
    return null;
  }

  const tokens: OAuthTokens = {
    access_token: accessToken,
    token_type: "Bearer", // Always Bearer for OAuth 2.0
  };

  // Optional refresh token
  if (process.env.GOOGLE_REFRESH_TOKEN) {
    tokens.refresh_token = process.env.GOOGLE_REFRESH_TOKEN;
  }

  return tokens;
}

export function generateAuthUrl() {
  const oauth2Client = getOAuthClient();
  return oauth2Client.generateAuthUrl({
    access_type: "offline",
    prompt: "consent",
    scope: [
      "openid",
      "email",
      "profile",
      "https://www.googleapis.com/auth/drive.file",
      "https://www.googleapis.com/auth/drive", // Full Drive access for copying files
      "https://www.googleapis.com/auth/documents", // Google Docs API access
      "https://www.googleapis.com/auth/spreadsheets",
    ],
  });
}

export async function exchangeCodeForTokens(code: string): Promise<OAuthTokens> {
  const oauth2Client = getOAuthClient();
  const { tokens } = await oauth2Client.getToken(code);
  return tokens as OAuthTokens;
}

export async function uploadPdfToDrive(params: {
  tokens: OAuthTokens;
  parentFolderId: string; // root folder id provided by user
  subfolderName: string; // cleaning type (cs human label)
  filename: string; // without extension
  pdfBuffer: Buffer | Uint8Array;
}): Promise<{ fileId: string }> {
  const { tokens, parentFolderId, subfolderName, filename, pdfBuffer } = params;

  const oauth2Client = getOAuthClient();
  oauth2Client.setCredentials(tokens);

  const drive = google.drive({ version: "v3", auth: oauth2Client });

  // 1) Ensure subfolder exists under parentFolderId
  const folderList = await (drive as unknown as { files: DriveFilesApi }).files.list({
    q: `name = '${subfolderName.replace(/'/g, "\\'")}' and mimeType = 'application/vnd.google-apps.folder' and '${parentFolderId}' in parents and trashed = false`,
    fields: "files(id, name)",
    pageSize: 1,
  });
  let subfolderId = folderList.data.files?.[0]?.id;

  if (!subfolderId) {
    const created = await (drive as unknown as { files: DriveFilesApi }).files.create({
      requestBody: {
        name: subfolderName,
        mimeType: "application/vnd.google-apps.folder",
        parents: [parentFolderId],
      },
      fields: "id",
    });
    subfolderId = created.data.id!;
  }

  // 2) Upload the PDF into the subfolder
  const fileMetadata = {
    name: `${filename}.pdf`,
    parents: [subfolderId!],
  } as { name: string; parents: string[] };

  const buffer: Buffer = Buffer.isBuffer(pdfBuffer) ? pdfBuffer : Buffer.from(pdfBuffer);
  const stream = new Readable();
  stream.push(buffer);
  stream.push(null);

  const media = {
    mimeType: "application/pdf",
    body: stream,
  } as { mimeType: string; body: Readable };

  const upload = await (drive as unknown as { files: DriveFilesApi }).files.create({
    requestBody: fileMetadata,
    media,
    fields: "id",
  });

  return { fileId: upload.data.id! };
}



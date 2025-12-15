declare module '@sparticuz/chromium' {
  type Viewport = Record<string, unknown> | null;
  const chromium: {
    args: string[];
    defaultViewport: Viewport;
    executablePath: () => Promise<string | null>;
    headless: boolean;
  };
  export default chromium;
}

// Minimal types for googleapis to satisfy TypeScript in our usage (no 'any')
declare module 'googleapis' {
  export interface OAuth2ClientLike {
    setCredentials(tokens: unknown): void;
    generateAuthUrl(options: { access_type: string; prompt: string; scope: string[] }): string;
    getToken(code: string): Promise<{ tokens: unknown }>;
    refreshAccessToken(): Promise<{ credentials: { access_token?: string; refresh_token?: string; expiry_date?: number; token_type?: string; scope?: string } }>;
  }

  export interface DriveFilesListResponse {
    files?: Array<{ id?: string; name?: string }>;
  }

  export interface DriveFilesCopyResponse {
    id?: string;
    name?: string;
  }

  export interface DriveLike {
    files: {
      list(options: { q: string; fields: string; pageSize: number }): Promise<{ data: DriveFilesListResponse }>;
      create(options: {
        requestBody: { name: string; mimeType?: string; parents?: string[] };
        media?: { mimeType?: string; body?: unknown };
        fields?: string;
      }): Promise<{ data: { id?: string } }>;
      copy(options: {
        fileId: string;
        requestBody: { name?: string; parents?: string[] };
      }): Promise<{ data: DriveFilesCopyResponse }>;
    };
  }

  export interface SheetsLike {
    spreadsheets: {
      values: {
        append(options: {
          spreadsheetId: string;
          range: string;
          valueInputOption: string;
          requestBody: { values: unknown[][] };
        }): Promise<{ data: { updates?: { updatedRows?: number } } }>;
      };
    };
  }

  export interface DocsLike {
    documents: {
      get(options: { documentId: string }): Promise<{
        data: {
          documentId?: string;
          title?: string;
          body?: {
            content?: Array<{
              paragraph?: {
                elements?: Array<{
                  textRun?: { content?: string };
                }>;
              };
            }>;
          };
        };
      }>;
      batchUpdate(options: {
        documentId: string;
        requestBody: {
          requests: Array<{
            insertText?: {
              location: { index: number };
              text: string;
            };
            deleteContentRange?: {
              range: {
                startIndex: number;
                endIndex: number;
              };
            };
            replaceAllText?: {
              containsText: { text: string; matchCase?: boolean };
              replaceText: string;
            };
          }>;
        };
      }): Promise<{ data: { documentId?: string } }>;
    };
  }

  export interface GoogleAuthLike {
    getClient(): Promise<OAuth2ClientLike>;
  }

  export interface GoogleAuthConstructor {
    new (options: {
      credentials?: {
        client_email?: string;
        private_key?: string;
      };
      scopes?: string[];
    }): GoogleAuthLike;
  }

  export const google: {
    auth: { 
      OAuth2: new (clientId: string, clientSecret: string, redirectUri: string) => OAuth2ClientLike;
      GoogleAuth: GoogleAuthConstructor;
    };
    drive: (opts: { version: 'v3'; auth: OAuth2ClientLike | GoogleAuthLike | unknown }) => DriveLike;
    sheets: (opts: { version: 'v4'; auth: OAuth2ClientLike | GoogleAuthLike | unknown }) => SheetsLike;
    docs: (opts: { version: 'v1'; auth: OAuth2ClientLike | GoogleAuthLike | unknown }) => DocsLike;
  };
}


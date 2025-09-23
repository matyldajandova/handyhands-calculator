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
  }

  export interface DriveFilesListResponse {
    files?: Array<{ id?: string; name?: string }>;
  }

  export interface DriveLike {
    files: {
      list(options: { q: string; fields: string; pageSize: number }): Promise<{ data: DriveFilesListResponse }>;
      create(options: {
        requestBody: { name: string; mimeType?: string; parents?: string[] };
        media?: { mimeType?: string; body?: unknown };
        fields?: string;
      }): Promise<{ data: { id?: string } }>;
    };
  }

  export const google: {
    auth: { OAuth2: new (clientId: string, clientSecret: string, redirectUri: string) => OAuth2ClientLike };
    drive: (opts: { version: 'v3'; auth: OAuth2ClientLike }) => DriveLike;
  };
}


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



/**
 * Logger utility for Vercel serverless functions
 * 
 * In Vercel, console.log output appears in Runtime Logs.
 * To view these logs:
 * 1. Go to your Vercel project dashboard → Logs tab
 * 2. Filter by Function, Resource, or use the search bar
 * 3. Runtime logs show console.log, console.warn, console.error output
 * 
 * According to Vercel docs:
 * - console.log, console.info → Info level
 * - console.warn → Warning level
 * - console.error, stderr → Error level
 * 
 * Alternatively, use CLI: vercel logs --follow
 */

type LogLevel = 'log' | 'info' | 'warn' | 'error' | 'debug';

interface LogOptions {
  level?: LogLevel;
  prefix?: string;
  timestamp?: boolean;
}

function formatTimestamp(): string {
  return new Date().toISOString();
}

function formatMessage(message: string, prefix?: string, timestamp?: boolean): string {
  const parts: string[] = [];
  if (timestamp) {
    parts.push(`[${formatTimestamp()}]`);
  }
  if (prefix) {
    parts.push(`[${prefix}]`);
  }
  parts.push(message);
  return parts.join(' ');
}

/**
 * Enhanced logger that ensures logs are visible in Vercel Function Logs
 */
export const logger = {
  /**
   * Log a message with optional prefix and timestamp
   */
  log(message: string, data?: unknown, options?: LogOptions): void {
    const { prefix = 'LOG', timestamp = true } = options || {};
    const formattedMessage = formatMessage(message, prefix, timestamp);
    
    // Ensure logs are written - Vercel captures console.log output
    if (data !== undefined) {
      console.log(formattedMessage, JSON.stringify(data, null, 2));
    } else {
      console.log(formattedMessage);
    }
  },

  /**
   * Log an info message
   */
  info(message: string, data?: unknown, options?: Omit<LogOptions, 'level'>): void {
    const { prefix = 'INFO', timestamp = true } = options || {};
    const formattedMessage = formatMessage(message, prefix, timestamp);
    
    // Use console.log for info level (Vercel maps this to Info level)
    if (data !== undefined) {
      console.log(formattedMessage, typeof data === 'object' ? JSON.stringify(data, null, 2) : data);
    } else {
      console.log(formattedMessage);
    }
  },

  /**
   * Log a warning message
   */
  warn(message: string, data?: unknown, options?: Omit<LogOptions, 'level'>): void {
    const { prefix = 'WARN', timestamp = true } = options || {};
    const formattedMessage = formatMessage(message, prefix, timestamp);
    
    if (data !== undefined) {
      console.warn(formattedMessage, data);
    } else {
      console.warn(formattedMessage);
    }
  },

  /**
   * Log an error message
   */
  error(message: string, error?: unknown, options?: Omit<LogOptions, 'level'>): void {
    const { prefix = 'ERROR', timestamp = true } = options || {};
    const formattedMessage = formatMessage(message, prefix, timestamp);
    
    if (error !== undefined) {
      console.error(formattedMessage, error);
      if (error instanceof Error && error.stack) {
        console.error('Stack trace:', error.stack);
      }
    } else {
      console.error(formattedMessage);
    }
  },

  /**
   * Log a debug message (only in development)
   */
  debug(message: string, data?: unknown, options?: Omit<LogOptions, 'level'>): void {
    if (process.env.NODE_ENV === 'development') {
      const { prefix = 'DEBUG', timestamp = true } = options || {};
      const formattedMessage = formatMessage(message, prefix, timestamp);
      
      if (data !== undefined) {
        console.log(formattedMessage, data);
      } else {
        console.log(formattedMessage);
      }
    }
  },

  /**
   * Log API request details
   */
  apiRequest(method: string, path: string, data?: unknown): void {
    logger.info(`API ${method} ${path}`, data, { prefix: 'API' });
  },

  /**
   * Log API response details
   */
  apiResponse(method: string, path: string, status: number, data?: unknown): void {
    const level = status >= 400 ? 'error' : 'info';
    const message = `API ${method} ${path} → ${status}`;
    
    if (level === 'error') {
      logger.error(message, data, { prefix: 'API' });
    } else {
      logger.info(message, data, { prefix: 'API' });
    }
  },
};


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
}

function formatMessage(message: string, prefix?: string): string {
  // Vercel adds its own timestamps, so we just use a simple prefix
  if (prefix) {
    return `[${prefix}] ${message}`;
  }
  return message;
}

/**
 * Enhanced logger that ensures logs are visible in Vercel Function Logs
 */
export const logger = {
  /**
   * Log a message with optional prefix
   */
  log(message: string, data?: unknown, options?: LogOptions): void {
    const { prefix = 'LOG' } = options || {};
    const formattedMessage = formatMessage(message, prefix);
    
    // Simple console.log - Vercel will add its own timestamp
    if (data !== undefined) {
      console.log(formattedMessage, data);
    } else {
      console.log(formattedMessage);
    }
  },

  /**
   * Log an info message
   */
  info(message: string, data?: unknown, options?: Omit<LogOptions, 'level'>): void {
    const { prefix = 'INFO' } = options || {};
    const formattedMessage = formatMessage(message, prefix);
    
    // Use console.log for info level (Vercel maps this to Info level)
    if (data !== undefined) {
      console.log(formattedMessage, data);
    } else {
      console.log(formattedMessage);
    }
  },

  /**
   * Log a warning message
   */
  warn(message: string, data?: unknown, options?: Omit<LogOptions, 'level'>): void {
    const { prefix = 'WARN' } = options || {};
    const formattedMessage = formatMessage(message, prefix);
    
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
    const { prefix = 'ERROR' } = options || {};
    const formattedMessage = formatMessage(message, prefix);
    
    if (error !== undefined) {
      console.error(formattedMessage, error);
      if (error instanceof Error && error.stack) {
        console.error(`${formattedMessage} Stack trace:`, error.stack);
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
      const { prefix = 'DEBUG' } = options || {};
      const formattedMessage = formatMessage(message, prefix);
      
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


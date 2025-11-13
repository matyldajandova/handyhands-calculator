/**
 * Logger utility for Vercel serverless functions
 * 
 * In Vercel, console.log output appears in Function Logs, not the main deployment logs.
 * To view these logs:
 * 1. Go to your Vercel project dashboard
 * 2. Click on a deployment
 * 3. Go to the "Functions" tab (or "Runtime Logs")
 * 4. Click on a specific function to see its console.log output
 * 
 * Alternatively, use: vercel logs [deployment-url] --follow
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
    const { prefix = 'INFO', timestamp = true } = options || {};
    const formattedMessage = formatMessage(message, prefix, timestamp);
    
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


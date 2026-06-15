/**
 * Structured logging utility for Hermes Agent OS.
 * Replaces bare console.log/error with consistent, parseable log entries.
 *
 * Log levels: debug, info, warn, error, fatal
 * Output format: [TIMESTAMP] [LEVEL] [CONTEXT] message {metadata}
 *
 * In production: Only info+ levels are emitted.
 * In development: All levels including debug are emitted.
 */

export type LogLevel = 'debug' | 'info' | 'warn' | 'error' | 'fatal';

const LOG_LEVELS: Record<LogLevel, number> = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3,
  fatal: 4,
};

const LEVEL_STYLES: Record<LogLevel, string> = {
  debug: '\x1b[36m', // cyan
  info: '\x1b[32m',  // green
  warn: '\x1b[33m',  // yellow
  error: '\x1b[31m', // red
  fatal: '\x1b[35m', // magenta
};

const RESET = '\x1b[0m';

interface LogMeta {
  [key: string]: string | number | boolean | null | undefined;
}

function getMinLevel(): LogLevel {
  if (process.env.LOG_LEVEL) {
    const configured = process.env.LOG_LEVEL.toLowerCase() as LogLevel;
    if (configured in LOG_LEVELS) return configured;
  }
  return process.env.NODE_ENV === 'production' ? 'info' : 'debug';
}

function shouldLog(level: LogLevel): boolean {
  return LOG_LEVELS[level] >= LOG_LEVELS[getMinLevel()];
}

function formatTimestamp(): string {
  return new Date().toISOString();
}

function formatMessage(level: LogLevel, context: string, message: string, meta?: LogMeta): string {
  const timestamp = formatTimestamp();
  const style = process.env.NODE_ENV !== 'production' ? LEVEL_STYLES[level] : '';
  const reset = process.env.NODE_ENV !== 'production' ? RESET : '';
  const levelTag = `${style}[${level.toUpperCase().padEnd(5)}]${reset}`;
  const contextTag = `[${context}]`;
  const metaStr = meta && Object.keys(meta).length > 0
    ? ' ' + Object.entries(meta)
        .filter(([, v]) => v !== undefined)
        .map(([k, v]) => `${k}=${v}`)
        .join(' ')
    : '';

  return `${timestamp} ${levelTag} ${contextTag} ${message}${metaStr}`;
}

// ─── Public API ─────────────────────────────────────────────────────────────

export const logger = {
  debug(message: string, context = 'app', meta?: LogMeta) {
    if (shouldLog('debug')) {
      console.log(formatMessage('debug', context, message, meta));
    }
  },

  info(message: string, context = 'app', meta?: LogMeta) {
    if (shouldLog('info')) {
      console.log(formatMessage('info', context, message, meta));
    }
  },

  warn(message: string, context = 'app', meta?: LogMeta) {
    if (shouldLog('warn')) {
      console.warn(formatMessage('warn', context, message, meta));
    }
  },

  error(message: string, context = 'app', meta?: LogMeta) {
    if (shouldLog('error')) {
      console.error(formatMessage('error', context, message, meta));
    }
  },

  fatal(message: string, context = 'app', meta?: LogMeta) {
    if (shouldLog('fatal')) {
      console.error(formatMessage('fatal', context, message, meta));
    }
  },

  /** Create a child logger with a fixed context */
  withContext(context: string) {
    return {
      debug: (message: string, meta?: LogMeta) => logger.debug(message, context, meta),
      info: (message: string, meta?: LogMeta) => logger.info(message, context, meta),
      warn: (message: string, meta?: LogMeta) => logger.warn(message, context, meta),
      error: (message: string, meta?: LogMeta) => logger.error(message, context, meta),
      fatal: (message: string, meta?: LogMeta) => logger.fatal(message, context, meta),
    };
  },
};

// ─── Convenience pre-made loggers ───────────────────────────────────────────

export const apiLogger = logger.withContext('api');
export const dbLogger = logger.withContext('db');
export const aiLogger = logger.withContext('ai');
export const sseLogger = logger.withContext('sse');
export const authLogger = logger.withContext('auth');
export const middlewareLogger = logger.withContext('middleware');

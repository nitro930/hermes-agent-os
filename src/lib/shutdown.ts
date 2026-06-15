/**
 * Graceful shutdown handler for Hermes Agent OS.
 * Ensures database connections are closed and in-flight requests complete
 * before the process exits.
 */

import { db } from './db';
import { logger } from './logger';

const shutdownLogger = logger.withContext('shutdown');

let isShuttingDown = false;

function gracefulShutdown(signal: string) {
  if (isShuttingDown) {
    shutdownLogger.warn('Already shutting down, ignoring duplicate signal', { signal });
    return;
  }
  isShuttingDown = true;

  shutdownLogger.info('Received shutdown signal, starting graceful shutdown', { signal });

  // Set a hard timeout — if cleanup takes too long, force exit
  const forceExitTimeout = setTimeout(() => {
    shutdownLogger.error('Forced shutdown after timeout');
    process.exit(1);
  }, 10000); // 10 seconds max

  // Close database connection
  db.$disconnect()
    .then(() => {
      shutdownLogger.info('Database connection closed successfully');
    })
    .catch((err: Error) => {
      shutdownLogger.error('Error closing database connection', { error: err.message });
    })
    .finally(() => {
      clearTimeout(forceExitTimeout);
      shutdownLogger.info('Graceful shutdown complete');
      process.exit(0);
    });
}

function handleUncaughtException(error: Error) {
  logger.fatal('Uncaught exception', 'process', {
    error: error.message,
    stack: error.stack?.slice(0, 500),
  });
  // Give logger time to flush, then shutdown
  setTimeout(() => gracefulShutdown('uncaughtException'), 100);
}

function handleUnhandledRejection(reason: unknown) {
  const message = reason instanceof Error ? reason.message : String(reason);
  logger.fatal('Unhandled promise rejection', 'process', { reason: message });
  // Give logger time to flush, then shutdown
  setTimeout(() => gracefulShutdown('unhandledRejection'), 100);
}

/**
 * Register process-level shutdown handlers.
 * Call this once at application startup.
 */
export function registerShutdownHandlers() {
  process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
  process.on('SIGINT', () => gracefulShutdown('SIGINT'));
  process.on('uncaughtException', handleUncaughtException);
  process.on('unhandledRejection', handleUnhandledRejection);

  shutdownLogger.info('Shutdown handlers registered');
}

/**
 * Check if the process is currently shutting down.
 * Useful for SSE streams and long-running operations to know when to stop.
 */
export function isShuttingDownState(): boolean {
  return isShuttingDown;
}

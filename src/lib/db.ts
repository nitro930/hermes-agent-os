import { PrismaClient } from '@prisma/client'
import { validateEnv } from './env'
import { registerShutdownHandlers } from './shutdown'

// Validate environment before connecting to DB
validateEnv()

// Register graceful shutdown handlers (idempotent)
if (process.env.NODE_ENV === 'production') {
  registerShutdownHandlers()
}

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

export const db =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
  })

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = db

// ─── Auto-start Cron Scheduler ──────────────────────────────────────────────
// Lazy-imported to avoid circular deps. Starts on first DB connection.
let schedulerStarted = false;

export async function ensureSchedulerStarted(): Promise<void> {
  if (schedulerStarted) return;
  schedulerStarted = true;

  try {
    const { initializeJobSchedules, startScheduler } = await import('./cron-scheduler');
    await initializeJobSchedules();
    startScheduler();
  } catch (err) {
    console.error('[cron] Failed to start scheduler:', err);
  }
}

// Auto-start in production (non-blocking)
if (process.env.NODE_ENV === 'production') {
  // Defer to allow the rest of the module graph to initialize
  setImmediate(() => ensureSchedulerStarted());
}

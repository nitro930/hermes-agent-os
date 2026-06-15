import { db } from '@/lib/db';
import { NextResponse } from 'next/server';
import { logger } from '@/lib/logger';

export const dynamic = 'force-dynamic';

const healthLogger = logger.withContext('health');

/**
 * Production health check endpoint.
 * Verifies database connectivity, checks system memory, and returns system status.
 * Used by Docker HEALTHCHECK, load balancers, and monitoring systems.
 */
export async function GET() {
  const start = Date.now();
  const checks: Record<string, { status: string; latency?: number; error?: string; details?: Record<string, unknown> }> = {};

  // Database check
  try {
    const dbStart = Date.now();
    await db.$queryRaw`SELECT 1`;
    checks.database = {
      status: 'healthy',
      latency: Date.now() - dbStart,
    };
  } catch (error) {
    healthLogger.error('Database health check failed', { error: error instanceof Error ? error.message : 'Unknown' });
    checks.database = {
      status: 'unhealthy',
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }

  // Memory check (warn if using >90% of allocated heap)
  const memUsage = process.memoryUsage();
  const heapUsedMB = Math.round(memUsage.heapUsed / 1024 / 1024);
  const heapTotalMB = Math.round(memUsage.heapTotal / 1024 / 1024);
  const heapPercent = Math.round((memUsage.heapUsed / memUsage.heapTotal) * 100);
  const memoryStatus = heapPercent > 95 ? 'critical' : heapPercent > 85 ? 'warning' : 'healthy';

  checks.memory = {
    status: memoryStatus,
    details: {
      heapUsedMB,
      heapTotalMB,
      heapPercent,
      rssMB: Math.round(memUsage.rss / 1024 / 1024),
      externalMB: Math.round(memUsage.external / 1024 / 1024),
    },
  };

  // Uptime check (warn if recently started — might still be warming up)
  const uptimeSeconds = Math.floor(process.uptime());
  checks.uptime = {
    status: uptimeSeconds < 10 ? 'warning' : 'healthy',
    details: {
      seconds: uptimeSeconds,
      formatted: `${Math.floor(uptimeSeconds / 3600)}h ${Math.floor((uptimeSeconds % 3600) / 60)}m ${uptimeSeconds % 60}s`,
    },
  };

  // Compute overall status
  const allHealthy = Object.values(checks).every(c => c.status === 'healthy');
  const hasCritical = Object.values(checks).some(c => c.status === 'critical');
  const status = hasCritical ? 'unhealthy' : allHealthy ? 'healthy' : 'degraded';
  const statusCode = status === 'unhealthy' ? 503 : 200;

  if (status !== 'healthy') {
    healthLogger.warn('Health check not fully healthy', { status, checks: Object.keys(checks).filter(k => checks[k].status !== 'healthy').join(',') });
  }

  return NextResponse.json(
    {
      status,
      timestamp: new Date().toISOString(),
      uptime: uptimeSeconds,
      version: process.env.npm_package_version || '1.0.0',
      environment: process.env.NODE_ENV || 'unknown',
      checks,
      responseTime: Date.now() - start,
    },
    {
      status: statusCode,
      headers: {
        'Cache-Control': 'no-store, no-cache, must-revalidate',
      },
    }
  );
}

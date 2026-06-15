import { getSchedulerStatus } from '@/lib/cron-scheduler';
import { db } from '@/lib/db';
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

/**
 * Cron scheduler status endpoint.
 * Shows scheduler state, job counts, and recent execution stats.
 */
export async function GET() {
  try {
    const scheduler = getSchedulerStatus();

    const [totalJobs, activeJobs, recentExecutions, failedToday] = await Promise.all([
      db.cronJob.count(),
      db.cronJob.count({ where: { isActive: true } }),
      db.cronExecution.count({
        where: {
          startedAt: { gte: new Date(Date.now() - 24 * 60 * 60 * 1000) },
        },
      }),
      db.cronExecution.count({
        where: {
          status: 'failed',
          startedAt: { gte: new Date(Date.now() - 24 * 60 * 60 * 1000) },
        },
      }),
    ]);

    const nextDue = await db.cronJob.findFirst({
      where: { isActive: true, nextRunAt: { not: null } },
      orderBy: { nextRunAt: 'asc' },
      select: { id: true, name: true, nextRunAt: true, action: true },
    });

    return NextResponse.json({
      scheduler,
      stats: {
        totalJobs,
        activeJobs,
        recentExecutions,
        failedToday,
      },
      nextDue,
    });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to get cron status' }, { status: 500 });
  }
}

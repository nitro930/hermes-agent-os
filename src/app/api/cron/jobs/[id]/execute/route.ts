import { NextRequest, NextResponse } from 'next/server';
import { executeJob } from '@/lib/cron-scheduler';
import { logger } from '@/lib/logger';

const cronLogger = logger.withContext('api:cron');

export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    cronLogger.info('Manual cron job trigger', { jobId: id });

    const result = await executeJob(id, 'manual');

    if (result.success) {
      return NextResponse.json({
        success: true,
        executionId: result.executionId,
        duration: result.duration,
      });
    } else {
      return NextResponse.json({
        success: false,
        executionId: result.executionId,
        duration: result.duration,
        error: result.error,
      }, { status: 500 });
    }
  } catch (error) {
    cronLogger.error('Manual cron execution failed', { error: String(error) });
    return NextResponse.json({ error: 'Failed to execute cron job' }, { status: 500 });
  }
}

import { db } from '@/lib/db';
import { NextRequest, NextResponse } from 'next/server';
import { parseCronExpression, getNextRun, validateCronExpression, describeCron } from '@/lib/cron-parser';
import { logger } from '@/lib/logger';
import { z } from 'zod';

const cronLogger = logger.withContext('api:cron');

const updateCronJobSchema = z.object({
  name: z.string().min(1).max(200).optional(),
  description: z.string().max(2000).optional(),
  schedule: z.string().min(1).max(100).optional(),
  timezone: z.string().max(50).optional(),
  action: z.enum(['run_agent', 'create_task', 'send_message', 'notify', 'webhook']).optional(),
  config: z.string().max(50000).optional(),
  isActive: z.boolean().optional(),
  agentId: z.string().nullable().optional(),
});

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const job = await db.cronJob.findUnique({
      where: { id },
      include: {
        agent: { select: { id: true, name: true, avatar: true } },
        _count: { select: { executions: true } },
      },
    });

    if (!job) {
      return NextResponse.json({ error: 'Cron job not found' }, { status: 404 });
    }

    return NextResponse.json({
      ...job,
      scheduleDescription: describeCron(job.schedule),
    });
  } catch (error) {
    cronLogger.error('Failed to fetch cron job', { error: String(error) });
    return NextResponse.json({ error: 'Failed to fetch cron job' }, { status: 500 });
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const data = updateCronJobSchema.parse(body);

    // Validate schedule if changed
    if (data.schedule) {
      const cronError = validateCronExpression(data.schedule);
      if (cronError) {
        return NextResponse.json(
          { error: 'Invalid schedule', details: cronError },
          { status: 400 }
        );
      }
    }

    // Validate config if changed
    if (data.config) {
      try {
        JSON.parse(data.config);
      } catch {
        return NextResponse.json(
          { error: 'Invalid config: must be valid JSON' },
          { status: 400 }
        );
      }
    }

    // Recalculate nextRunAt if schedule or isActive changed
    const updateData: Record<string, unknown> = { ...data };
    if (data.schedule !== undefined || data.isActive !== undefined) {
      const current = await db.cronJob.findUnique({ where: { id } });
      if (current) {
        const schedule = data.schedule || current.schedule;
        const isActive = data.isActive !== undefined ? data.isActive : current.isActive;
        if (isActive) {
          const fields = parseCronExpression(schedule);
          updateData.nextRunAt = getNextRun(fields);
        } else {
          updateData.nextRunAt = null;
        }
      }
    }

    const job = await db.cronJob.update({
      where: { id },
      data: updateData,
    });

    cronLogger.info('Cron job updated', { jobId: id, changes: Object.keys(data).join(',') });

    return NextResponse.json({
      ...job,
      scheduleDescription: describeCron(job.schedule),
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation failed', details: error.flatten().fieldErrors },
        { status: 400 }
      );
    }
    cronLogger.error('Failed to update cron job', { error: String(error) });
    return NextResponse.json({ error: 'Failed to update cron job' }, { status: 500 });
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const job = await db.cronJob.findUnique({ where: { id } });
    if (!job) {
      return NextResponse.json({ error: 'Cron job not found' }, { status: 404 });
    }

    if (job.isSystem) {
      return NextResponse.json({ error: 'System jobs cannot be deleted' }, { status: 403 });
    }

    await db.cronJob.delete({ where: { id } });

    cronLogger.info('Cron job deleted', { jobId: id, name: job.name });

    return NextResponse.json({ success: true });
  } catch (error) {
    cronLogger.error('Failed to delete cron job', { error: String(error) });
    return NextResponse.json({ error: 'Failed to delete cron job' }, { status: 500 });
  }
}

import { db } from '@/lib/db';
import { paginationSchema } from '@/lib/validations';
import { NextRequest, NextResponse } from 'next/server';
import { parseCronExpression, getNextRun, validateCronExpression, describeCron } from '@/lib/cron-parser';
import { logger } from '@/lib/logger';
import { z } from 'zod';

const cronLogger = logger.withContext('api:cron');

const createCronJobSchema = z.object({
  name: z.string().min(1).max(200),
  description: z.string().max(2000).optional(),
  schedule: z.string().min(1).max(100),
  timezone: z.string().max(50).default('UTC'),
  action: z.enum(['run_agent', 'create_task', 'send_message', 'notify', 'webhook']),
  config: z.string().max(50000), // JSON string
  isActive: z.boolean().default(true),
  agentId: z.string().optional(),
});

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const { take, skip } = paginationSchema.parse({
      take: searchParams.get('take') ?? undefined,
      skip: searchParams.get('skip') ?? undefined,
    });

    const actionFilter = searchParams.get('action');
    const activeOnly = searchParams.get('active') === 'true';

    const where: Record<string, unknown> = {};
    if (actionFilter) where.action = actionFilter;
    if (activeOnly) where.isActive = true;

    const jobs = await db.cronJob.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take,
      skip,
      include: {
        agent: { select: { id: true, name: true, avatar: true } },
        _count: { select: { executions: true } },
      },
    });

    // Add human-readable schedule descriptions
    const enriched = jobs.map(job => ({
      ...job,
      scheduleDescription: describeCron(job.schedule),
    }));

    const total = await db.cronJob.count({ where });

    return NextResponse.json({ jobs: enriched, total });
  } catch (error) {
    cronLogger.error('Failed to fetch cron jobs', { error: String(error) });
    return NextResponse.json({ error: 'Failed to fetch cron jobs' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const data = createCronJobSchema.parse(body);

    // Validate cron expression
    const cronError = validateCronExpression(data.schedule);
    if (cronError) {
      return NextResponse.json(
        { error: 'Invalid schedule', details: cronError },
        { status: 400 }
      );
    }

    // Validate config is valid JSON
    try {
      JSON.parse(data.config);
    } catch {
      return NextResponse.json(
        { error: 'Invalid config: must be valid JSON' },
        { status: 400 }
      );
    }

    // Calculate next run time
    const fields = parseCronExpression(data.schedule);
    const nextRunAt = getNextRun(fields);

    const job = await db.cronJob.create({
      data: {
        name: data.name,
        description: data.description ?? null,
        schedule: data.schedule,
        timezone: data.timezone,
        action: data.action,
        config: data.config,
        isActive: data.isActive,
        agentId: data.agentId ?? null,
        nextRunAt: data.isActive ? nextRunAt : null,
      },
    });

    await db.activityLog.create({
      data: {
        agentName: 'Cron Scheduler',
        action: 'Cron Job Created',
        details: `"${job.name}" (${job.schedule} → ${job.action})`,
        type: 'success',
      },
    });

    cronLogger.info('Cron job created', { jobId: job.id, name: job.name, schedule: job.schedule });

    return NextResponse.json({
      ...job,
      scheduleDescription: describeCron(job.schedule),
    }, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation failed', details: error.flatten().fieldErrors },
        { status: 400 }
      );
    }
    cronLogger.error('Failed to create cron job', { error: String(error) });
    return NextResponse.json({ error: 'Failed to create cron job' }, { status: 500 });
  }
}

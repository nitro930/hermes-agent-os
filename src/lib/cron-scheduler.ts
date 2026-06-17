/**
 * Cron Scheduler Engine for Hermes Agent OS.
 *
 * Runs in the server process and fires scheduled jobs at their designated times.
 * Uses a 60-second tick interval to check for due jobs.
 *
 * Features:
 * - Parses standard cron expressions and shorthand aliases
 * - Tracks nextRunAt for each job in the database
 * - Logs every execution (success/failure) with duration
 * - Respects graceful shutdown
 * - Timeout protection (max 5 min per job)
 * - Manual trigger support
 */

import { db } from './db';
import { logger } from './logger';
import { parseCronExpression, getNextRun } from './cron-parser';
import { isShuttingDownState } from './shutdown';

const schedulerLogger = logger.withContext('cron-scheduler');

const TICK_INTERVAL_MS = 60_000; // Check every 60 seconds
const JOB_TIMEOUT_MS = 5 * 60_000; // 5 minute timeout per job
let tickTimer: ReturnType<typeof setInterval> | null = null;
let isRunning = false;

/**
 * Start the cron scheduler. Idempotent — calling multiple times is safe.
 */
export function startScheduler(): void {
  if (isRunning) return;
  isRunning = true;

  schedulerLogger.info('Starting cron scheduler');

  // Run first tick immediately
  tick();

  // Then tick every 60 seconds
  tickTimer = setInterval(() => {
    if (isShuttingDownState()) {
      stopScheduler();
      return;
    }
    tick();
  }, TICK_INTERVAL_MS);
}

/**
 * Stop the cron scheduler. Called during graceful shutdown.
 */
export function stopScheduler(): void {
  if (!isRunning) return;
  isRunning = false;

  if (tickTimer) {
    clearInterval(tickTimer);
    tickTimer = null;
  }

  schedulerLogger.info('Cron scheduler stopped');
}

/**
 * Check for and execute due jobs.
 */
async function tick(): Promise<void> {
  try {
    const now = new Date();

    // Find all active jobs that are due
    const dueJobs = await db.cronJob.findMany({
      where: {
        isActive: true,
        nextRunAt: { lte: now },
      },
    });

    if (dueJobs.length > 0) {
      schedulerLogger.info(`Found ${dueJobs.length} due job(s)`, { now: now.toISOString() });
    }

    for (const job of dueJobs) {
      if (isShuttingDownState()) break;

      // Execute in background — don't block other jobs
      executeJob(job.id, 'scheduled').catch((err) => {
        schedulerLogger.error('Job execution failed', { jobId: job.id, error: String(err) });
      });
    }
  } catch (err) {
    schedulerLogger.error('Scheduler tick failed', { error: String(err) });
  }
}

/**
 * Execute a single cron job.
 */
export async function executeJob(jobId: string, triggerType: 'scheduled' | 'manual'): Promise<{
  success: boolean;
  executionId: string;
  duration: number;
  error?: string;
}> {
  const startTime = Date.now();

  // Create execution record
  const execution = await db.cronExecution.create({
    data: {
      cronJobId: jobId,
      status: 'running',
      triggerType,
    },
  });

  try {
    // Fetch the job
    const job = await db.cronJob.findUnique({ where: { id: jobId } });
    if (!job) {
      throw new Error('Job not found');
    }
    if (!job.isActive && triggerType === 'scheduled') {
      throw new Error('Job is not active');
    }

    // Parse config
    const config = JSON.parse(job.config || '{}');
    let result: Record<string, unknown> = {};

    // Execute based on action type
    const timeoutPromise = new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error('Job timed out')), JOB_TIMEOUT_MS)
    );

    result = await Promise.race([
      executeAction(job.action, config),
      timeoutPromise,
    ]);

    const duration = Date.now() - startTime;

    // Update execution record
    await db.cronExecution.update({
      where: { id: execution.id },
      data: {
        status: 'success',
        completedAt: new Date(),
        duration,
        result: JSON.stringify(result).slice(0, 10000), // Cap result size
      },
    });

    // Calculate next run time and update job stats
    const nextRun = calculateNextRun(job.schedule);
    await db.cronJob.update({
      where: { id: jobId },
      data: {
        lastRunAt: new Date(),
        nextRunAt: nextRun,
        runCount: { increment: 1 },
        lastDuration: duration,
        lastError: null,
      },
    });

    schedulerLogger.info('Job executed successfully', {
      jobId,
      name: job.name,
      action: job.action,
      duration,
      triggerType,
    });

    // Log to activity
    await db.activityLog.create({
      data: {
        agentName: 'Cron Scheduler',
        action: 'Cron Job Executed',
        details: `"${job.name}" (${job.action}) completed in ${duration}ms`,
        type: 'success',
      },
    });

    return { success: true, executionId: execution.id, duration };
  } catch (err) {
    const duration = Date.now() - startTime;
    const errorMsg = err instanceof Error ? err.message : String(err);

    // Update execution record
    await db.cronExecution.update({
      where: { id: execution.id },
      data: {
        status: 'failed',
        completedAt: new Date(),
        duration,
        error: errorMsg,
      },
    });

    // Update job stats
    const job = await db.cronJob.findUnique({ where: { id: jobId } });
    if (job) {
      const nextRun = calculateNextRun(job.schedule);
      await db.cronJob.update({
        where: { id: jobId },
        data: {
          lastRunAt: new Date(),
          nextRunAt: nextRun,
          runCount: { increment: 1 },
          failCount: { increment: 1 },
          lastError: errorMsg,
          lastDuration: duration,
        },
      });
    }

    schedulerLogger.error('Job execution failed', { jobId, error: errorMsg, duration });

    // Log to activity
    await db.activityLog.create({
      data: {
        agentName: 'Cron Scheduler',
        action: 'Cron Job Failed',
        details: `"${job?.name || jobId}" failed: ${errorMsg}`,
        type: 'error',
      },
    });

    return { success: false, executionId: execution.id, duration, error: errorMsg };
  }
}

/**
 * Execute a specific action. Returns a result object.
 */
async function executeAction(action: string, config: Record<string, unknown>): Promise<Record<string, unknown>> {
  switch (action) {
    case 'run_agent': {
      const agentId = config.agentId as string;
      if (!agentId) throw new Error('agentId is required for run_agent action');

      const agent = await db.agent.findUnique({ where: { id: agentId } });
      if (!agent) throw new Error(`Agent ${agentId} not found`);

      // Set agent running
      await db.agent.update({ where: { id: agentId }, data: { status: 'running' } });

      let aiResponse: string;
      try {
        const ZAI = (await import('z-ai-web-dev-sdk')).default;
        const zai = await ZAI.create();
        const completion = await zai.chat.completions.create({
          messages: [
            { role: 'system', content: agent.systemPrompt || 'You are a helpful assistant.' },
            { role: 'user', content: (config.prompt as string) || 'Execute your current tasks and report status.' },
          ],
        });
        aiResponse = completion.choices[0]?.message?.content || 'Agent executed successfully.';
      } catch {
        aiResponse = `Agent ${agent.name} was activated by cron job. AI call failed — agent set to running state.`;
      }

      // Save response as memory
      await db.memory.create({
        data: {
          title: `Cron: ${agent.name}`,
          content: aiResponse,
          type: 'log',
          folder: 'Cron Logs',
          agentId: agent.id,
          tags: 'cron,auto-run',
        },
      });

      // Auto-idle agent after 30 seconds
      setTimeout(async () => {
        try {
          await db.agent.update({
            where: { id: agentId, status: 'running' },
            data: { status: 'idle' },
          });
        } catch { /* ignore */ }
      }, 30_000);

      return { agentId, agentName: agent.name, response: aiResponse.slice(0, 500) };
    }

    case 'create_task': {
      const task = await db.task.create({
        data: {
          title: (config.taskTitle as string) || 'Scheduled Task',
          description: (config.taskDescription as string) || 'Created by cron job',
          status: 'todo',
          priority: (config.priority as string) || 'medium',
          column: 'todo',
          order: await db.task.count({ where: { column: 'todo' } }),
          tags: 'cron,automated',
          agentId: (config.agentId as string) || null,
        },
      });
      return { taskId: task.id, title: task.title };
    }

    case 'send_message': {
      const agentId = config.agentId as string;
      if (!agentId) throw new Error('agentId is required for send_message action');

      const conversation = await db.conversation.create({
        data: {
          title: `Cron: ${(config.messageTitle as string) || 'Scheduled Message'}`,
          agentId,
        },
      });
      await db.message.create({
        data: {
          conversationId: conversation.id,
          role: 'system',
          content: (config.message as string) || 'Scheduled message from cron job',
        },
      });
      return { conversationId: conversation.id, agentId };
    }

    case 'notify': {
      await db.activityLog.create({
        data: {
          action: (config.notificationTitle as string) || 'Cron Notification',
          details: (config.notificationMessage as string) || 'Scheduled notification fired',
          type: 'info',
          agentName: 'Cron Scheduler',
        },
      });
      return { notification: 'sent' };
    }

    case 'webhook': {
      const url = config.url as string;
      if (!url) throw new Error('url is required for webhook action');

      const response = await fetch(url, {
        method: (config.method as string) || 'POST',
        headers: {
          'Content-Type': 'application/json',
          'User-Agent': 'Hermes-Cron/1.0',
          ...(config.headers as Record<string, string> || {}),
        },
        body: config.body ? JSON.stringify(config.body) : JSON.stringify({
          source: 'hermes-cron',
          timestamp: new Date().toISOString(),
          jobName: config.jobName || 'unnamed',
        }),
        signal: AbortSignal.timeout(30_000), // 30s timeout
      });

      return {
        status: response.status,
        statusText: response.statusText,
        url,
      };
    }

    case 'fusion': {
      // Cron-triggered OpenRouter Fusion deliberation.
      // Config: { prompt: string, preset?: 'general-high' | 'general-budget',
      //           analysisModels?: string[], judgeModel?: string,
      //           finalModel?: string, maxToolCalls?: number,
      //           agentId?: string, saveMemory?: boolean }
      const prompt = config.prompt as string;
      if (!prompt) throw new Error('prompt is required for fusion action');

      // Lazy import to avoid pulling OpenRouter client into the scheduler hot path.
      const { runFusion } = await import('./openrouter');
      const fusionConfig: any = {};
      if (config.preset) fusionConfig.preset = config.preset;
      if (Array.isArray(config.analysisModels)) fusionConfig.analysisModels = config.analysisModels;
      if (config.judgeModel) fusionConfig.judgeModel = config.judgeModel;
      if (config.finalModel) fusionConfig.finalModel = config.finalModel;
      if (config.maxToolCalls) fusionConfig.maxToolCalls = Number(config.maxToolCalls);

      // Optional agent context — pull system prompt + recent memories
      let systemPrompt: string | undefined;
      if (config.agentId) {
        const agent = await db.agent.findUnique({
          where: { id: config.agentId as string },
          include: { memories: { take: 5, orderBy: { updatedAt: 'desc' }, where: { isPinned: true } } },
        });
        if (agent) {
          const memoryContext = agent.memories.length > 0
            ? `\n\n## Pinned Memories\n${agent.memories.map((m) => `- ${m.title}: ${m.content.slice(0, 200)}`).join('\n')}`
            : '';
          systemPrompt = (agent.systemPrompt || `You are ${agent.name}.`) + memoryContext;
        }
      }

      const result = await runFusion(prompt, fusionConfig, { systemPrompt });

      // Persist the Fusion run (linked to the agent if provided)
      const fusionRun = await db.fusionRun.create({
        data: {
          prompt,
          status: 'success',
          preset: (config.preset as string) || null,
          analysisModels: Array.isArray(config.analysisModels) ? JSON.stringify(config.analysisModels) : null,
          judgeModel: (config.judgeModel as string) || null,
          finalModel: fusionConfig.finalModel || 'openrouter/fusion',
          finalAnswer: result.finalAnswer,
          judgeAnalysis: result.judgeAnalysis ? JSON.stringify(result.judgeAnalysis) : null,
          totalTokens: result.totalTokens ?? null,
          totalCost: result.totalCost ?? null,
          latencyMs: result.latencyMs,
          agentId: (config.agentId as string) || null,
        },
      });

      // Optionally save the result as a memory entry
      if (config.saveMemory && config.agentId) {
        const title = `Fusion: ${prompt.slice(0, 60)}${prompt.length > 60 ? '...' : ''}`;
        await db.memory.create({
          data: {
            title,
            content: result.finalAnswer,
            type: 'reference',
            folder: 'Fusion',
            tags: 'fusion,cron,auto-saved',
            agentId: config.agentId as string,
          },
        });
      }

      // Audit log
      await db.activityLog.create({
        data: {
          action: 'Fusion Run (cron)',
          details: `Fusion deliberation completed in ${result.latencyMs}ms · ${result.totalTokens ?? 0} tokens`,
          type: 'success',
          agentId: (config.agentId as string) || null,
          agentName: 'Cron Scheduler',
        },
      });

      return {
        fusionRunId: fusionRun.id,
        tokens: result.totalTokens,
        cost: result.totalCost,
        latencyMs: result.latencyMs,
        answer: result.finalAnswer.slice(0, 500),
      };
    }

    default:
      throw new Error(`Unknown action: ${action}`);
  }
}

/**
 * Calculate the next run time for a given schedule expression.
 */
function calculateNextRun(schedule: string): Date {
  try {
    const fields = parseCronExpression(schedule);
    return getNextRun(fields);
  } catch {
    // If parsing fails, schedule for 1 hour from now
    return new Date(Date.now() + 60 * 60 * 1000);
  }
}

/**
 * Initialize nextRunAt for all active jobs that don't have one.
 * Called on server startup.
 */
export async function initializeJobSchedules(): Promise<void> {
  const jobs = await db.cronJob.findMany({
    where: {
      isActive: true,
      nextRunAt: null,
    },
  });

  for (const job of jobs) {
    const nextRun = calculateNextRun(job.schedule);
    await db.cronJob.update({
      where: { id: job.id },
      data: { nextRunAt: nextRun },
    });
    schedulerLogger.info('Initialized schedule', { jobId: job.id, name: job.name, nextRun: nextRun.toISOString() });
  }

  if (jobs.length > 0) {
    schedulerLogger.info(`Initialized ${jobs.length} job schedule(s)`);
  }
}

/**
 * Get scheduler status for monitoring.
 */
export function getSchedulerStatus(): {
  isRunning: boolean;
  tickInterval: number;
  jobTimeout: number;
} {
  return {
    isRunning,
    tickInterval: TICK_INTERVAL_MS,
    jobTimeout: JOB_TIMEOUT_MS,
  };
}

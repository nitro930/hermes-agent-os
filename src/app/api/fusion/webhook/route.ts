import { db } from '@/lib/db';
import { NextRequest, NextResponse } from 'next/server';
import { runFusion, FusionConfig } from '@/lib/openrouter';
import { checkRateLimit, rateLimitResponse, getClientIP } from '@/lib/rate-limit';

/**
 * External webhook trigger for Fusion.
 *
 * Authentication: Bearer token in `Authorization` header must match the
 * `FUSION_WEBHOOK_SECRET` env var (or, if unset, the `fusion_webhook_secret`
 * Setting row). If neither is set, the webhook is open — strongly discouraged
 * in production.
 *
 * POST body: same as /api/fusion/run plus an optional `async` flag.
 *
 * Response: 200 + the run record on success, or 202 + `{ runId }` if
 * `async: true` was passed (caller can poll /api/fusion/runs/[id]).
 */
async function getWebhookSecret(): Promise<string | null> {
  if (process.env.FUSION_WEBHOOK_SECRET) return process.env.FUSION_WEBHOOK_SECRET;
  const row = await db.setting.findUnique({ where: { id: 'fusion_webhook_secret' } });
  return row?.value || null;
}

export async function POST(request: NextRequest) {
  try {
    // Rate limit: 30 webhook calls per minute per IP
    const ip = getClientIP(request);
    const rl = checkRateLimit(ip, 'webhook');
    if (!rl.allowed) {
      const blocked = rateLimitResponse(rl);
      if (blocked) return new NextResponse(blocked.body, { status: 429, headers: blocked.headers });
    }

    // Auth check
    const auth = request.headers.get('authorization') || '';
    const token = auth.startsWith('Bearer ') ? auth.slice(7) : '';
    const secret = await getWebhookSecret();
    if (secret) {
      if (token !== secret) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
      }
    } else if (process.env.NODE_ENV === 'production') {
      return NextResponse.json(
        { error: 'Webhook secret not configured. Set FUSION_WEBHOOK_SECRET env var.' },
        { status: 500 },
      );
    }

    const body = await request.json();
    const {
      prompt,
      preset,
      analysisModels,
      judgeModel,
      finalModel,
      maxToolCalls,
      agentId,
      systemPrompt,
      previousMessages,
      async: asyncMode = false,
      source = 'webhook',
    } = body;

    if (!prompt || typeof prompt !== 'string') {
      return NextResponse.json({ error: 'prompt is required' }, { status: 400 });
    }

    // Create the run record (in running state) immediately so callers have an ID.
    const run = await db.fusionRun.create({
      data: {
        prompt: `[${source}] ${prompt}`,
        status: 'running',
        preset: preset || null,
        analysisModels: analysisModels ? JSON.stringify(analysisModels) : null,
        judgeModel: judgeModel || null,
        finalModel: finalModel || 'openrouter/fusion',
        agentId: agentId || null,
      },
    });

    if (asyncMode) {
      // Fire-and-forget — caller polls /api/fusion/runs/[id]
      (async () => {
        const config: FusionConfig = {};
        if (preset) config.preset = preset;
        if (Array.isArray(analysisModels) && analysisModels.length > 0) config.analysisModels = analysisModels;
        if (judgeModel) config.judgeModel = judgeModel;
        if (finalModel) config.finalModel = finalModel;
        if (maxToolCalls) config.maxToolCalls = maxToolCalls;
        try {
          const result = await runFusion(prompt, config, { systemPrompt, previousMessages });
          await db.fusionRun.update({
            where: { id: run.id },
            data: {
              status: 'success',
              finalAnswer: result.finalAnswer,
              judgeAnalysis: result.judgeAnalysis ? JSON.stringify(result.judgeAnalysis) : null,
              totalTokens: result.totalTokens ?? null,
              totalCost: result.totalCost ?? null,
              latencyMs: result.latencyMs,
            },
          });
        } catch (err: any) {
          await db.fusionRun.update({
            where: { id: run.id },
            data: { status: 'failed', errorMessage: err?.message || 'Unknown error' },
          });
        }
      })();
      return NextResponse.json({ runId: run.id, status: 'running' }, { status: 202 });
    }

    // Synchronous mode
    const config: FusionConfig = {};
    if (preset) config.preset = preset;
    if (Array.isArray(analysisModels) && analysisModels.length > 0) config.analysisModels = analysisModels;
    if (judgeModel) config.judgeModel = judgeModel;
    if (finalModel) config.finalModel = finalModel;
    if (maxToolCalls) config.maxToolCalls = maxToolCalls;
    try {
      const result = await runFusion(prompt, config, { systemPrompt, previousMessages });
      const updated = await db.fusionRun.update({
        where: { id: run.id },
        data: {
          status: 'success',
          finalAnswer: result.finalAnswer,
          judgeAnalysis: result.judgeAnalysis ? JSON.stringify(result.judgeAnalysis) : null,
          totalTokens: result.totalTokens ?? null,
          totalCost: result.totalCost ?? null,
          latencyMs: result.latencyMs,
        },
      });
      return NextResponse.json({ run: updated });
    } catch (err: any) {
      await db.fusionRun.update({
        where: { id: run.id },
        data: { status: 'failed', errorMessage: err?.message || 'Unknown error' },
      });
      return NextResponse.json({ error: err?.message, runId: run.id }, { status: 500 });
    }
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || 'Webhook failed' }, { status: 500 });
  }
}

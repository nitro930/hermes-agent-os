import { db } from '@/lib/db';
import { NextRequest, NextResponse } from 'next/server';
import { runFusion, FusionConfig } from '@/lib/openrouter';

/**
 * Run the same prompt through two presets (or two panel configs) in parallel
 * and return both results side-by-side. Useful for cost/quality tradeoff
 * analysis ("general-high" vs "general-budget").
 *
 * POST body:
 *   { prompt: string,
 *     a: { preset?, analysisModels?, judgeModel?, finalModel?, maxToolCalls? },
 *     b: { preset?, analysisModels?, judgeModel?, finalModel?, maxToolCalls? },
 *     agentId?: string,
 *     systemPrompt?: string,
 *     previousMessages?: [{ role, content }] }
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { prompt, a, b, agentId, systemPrompt, previousMessages } = body;
    if (!prompt || typeof prompt !== 'string') {
      return NextResponse.json({ error: 'prompt is required' }, { status: 400 });
    }
    if (!a || !b) {
      return NextResponse.json({ error: 'Both "a" and "b" configs are required' }, { status: 400 });
    }

    const toConfig = (cfg: any): FusionConfig => {
      const c: FusionConfig = {};
      if (cfg.preset) c.preset = cfg.preset;
      if (Array.isArray(cfg.analysisModels) && cfg.analysisModels.length > 0) c.analysisModels = cfg.analysisModels;
      if (cfg.judgeModel) c.judgeModel = cfg.judgeModel;
      if (cfg.finalModel) c.finalModel = cfg.finalModel;
      if (cfg.maxToolCalls) c.maxToolCalls = Number(cfg.maxToolCalls);
      return c;
    };

    const [aResult, bResult] = await Promise.allSettled([
      runFusion(prompt, toConfig(a), { systemPrompt, previousMessages }),
      runFusion(prompt, toConfig(b), { systemPrompt, previousMessages }),
    ]);

    // Persist both runs (linked to the agent if provided)
    const persist = async (
      label: 'a' | 'b',
      cfg: any,
      result: PromiseSettledResult<Awaited<ReturnType<typeof runFusion>>>,
    ) => {
      if (result.status !== 'fulfilled') {
        return db.fusionRun.create({
          data: {
            prompt: `[A/B ${label}] ${prompt}`,
            status: 'failed',
            preset: cfg.preset || null,
            analysisModels: Array.isArray(cfg.analysisModels) ? JSON.stringify(cfg.analysisModels) : null,
            judgeModel: cfg.judgeModel || null,
            finalModel: cfg.finalModel || 'openrouter/fusion',
            errorMessage: result.reason?.message || 'Unknown error',
            agentId: agentId || null,
          },
        });
      }
      const r = result.value;
      const run = await db.fusionRun.create({
        data: {
          prompt: `[A/B ${label}] ${prompt}`,
          status: 'success',
          preset: cfg.preset || null,
          analysisModels: Array.isArray(cfg.analysisModels) ? JSON.stringify(cfg.analysisModels) : null,
          judgeModel: cfg.judgeModel || null,
          finalModel: cfg.finalModel || 'openrouter/fusion',
          finalAnswer: r.finalAnswer,
          judgeAnalysis: r.judgeAnalysis ? JSON.stringify(r.judgeAnalysis) : null,
          totalTokens: r.totalTokens ?? null,
          totalCost: r.totalCost ?? null,
          latencyMs: r.latencyMs,
          agentId: agentId || null,
        },
      });
      return { run, result: r };
    };

    const [aPersisted, bPersisted] = await Promise.all([
      persist('a', a, aResult),
      persist('b', b, bResult),
    ]);

    return NextResponse.json({
      a: aResult.status === 'fulfilled'
        ? {
            runId: (aPersisted as any).run?.id,
            finalAnswer: aResult.value.finalAnswer,
            judgeAnalysis: aResult.value.judgeAnalysis,
            totalTokens: aResult.value.totalTokens,
            totalCost: aResult.value.totalCost,
            latencyMs: aResult.value.latencyMs,
          }
        : { error: aResult.reason?.message || 'failed', runId: (aPersisted as any)?.id },
      b: bResult.status === 'fulfilled'
        ? {
            runId: (bPersisted as any).run?.id,
            finalAnswer: bResult.value.finalAnswer,
            judgeAnalysis: bResult.value.judgeAnalysis,
            totalTokens: bResult.value.totalTokens,
            totalCost: bResult.value.totalCost,
            latencyMs: bResult.value.latencyMs,
          }
        : { error: bResult.reason?.message || 'failed', runId: (bPersisted as any)?.id },
      comparison: {
        costDelta: (aResult.status === 'fulfilled' && bResult.status === 'fulfilled')
          ? (aResult.value.totalCost || 0) - (bResult.value.totalCost || 0)
          : null,
        tokenDelta: (aResult.status === 'fulfilled' && bResult.status === 'fulfilled')
          ? (aResult.value.totalTokens || 0) - (bResult.value.totalTokens || 0)
          : null,
        latencyDelta: (aResult.status === 'fulfilled' && bResult.status === 'fulfilled')
          ? aResult.value.latencyMs - bResult.value.latencyMs
          : null,
      },
    });
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || 'A/B failed' }, { status: 500 });
  }
}

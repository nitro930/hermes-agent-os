import { db } from '@/lib/db';
import { NextRequest, NextResponse } from 'next/server';
import { runFusion, FusionConfig } from '@/lib/openrouter';

export async function POST(request: NextRequest) {
  try {
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
    } = body;

    if (!prompt || typeof prompt !== 'string' || prompt.trim().length === 0) {
      return NextResponse.json({ error: 'prompt is required' }, { status: 400 });
    }

    // Create the run record
    const run = await db.fusionRun.create({
      data: {
        prompt,
        status: 'running',
        preset: preset || null,
        analysisModels: analysisModels ? JSON.stringify(analysisModels) : null,
        judgeModel: judgeModel || null,
        finalModel: finalModel || 'openrouter/fusion',
        agentId: agentId || null,
      },
    });

    const config: FusionConfig = {};
    if (preset) config.preset = preset;
    if (Array.isArray(analysisModels) && analysisModels.length > 0) config.analysisModels = analysisModels;
    if (judgeModel) config.judgeModel = judgeModel;
    if (finalModel) config.finalModel = finalModel;
    if (maxToolCalls) config.maxToolCalls = maxToolCalls;

    try {
      const result = await runFusion(prompt, config, { systemPrompt, previousMessages });

      // Persist panel responses
      if (result.panel.length > 0) {
        await db.fusionPanelResponse.createMany({
          data: result.panel.map((p) => ({
            fusionRunId: run.id,
            modelSlug: p.model,
            response: p.content,
            tokensUsed: p.tokens ?? null,
            latencyMs: p.latencyMs ?? null,
          })),
        });
      }

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
        include: { panelResponses: true, agent: true },
      });

      return NextResponse.json({ run: updated });
    } catch (err: any) {
      await db.fusionRun.update({
        where: { id: run.id },
        data: { status: 'failed', errorMessage: err?.message || 'Unknown error' },
      });
      return NextResponse.json(
        { error: err?.message || 'Fusion failed', runId: run.id },
        { status: 500 },
      );
    }
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || 'Invalid request' }, { status: 400 });
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const limit = Math.min(Number(searchParams.get('limit') || '20'), 100);
    const agentId = searchParams.get('agentId');

    const runs = await db.fusionRun.findMany({
      where: agentId ? { agentId } : undefined,
      include: { panelResponses: true, agent: true },
      orderBy: { createdAt: 'desc' },
      take: limit,
    });

    return NextResponse.json({ runs });
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || 'Failed to list runs' }, { status: 500 });
  }
}

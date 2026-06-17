import { db } from '@/lib/db';
import { NextRequest, NextResponse } from 'next/server';
import { runFusion, FusionConfig } from '@/lib/openrouter';
import { checkRateLimit, rateLimitResponse, getClientIP } from '@/lib/rate-limit';

export async function POST(request: NextRequest) {
  try {
    // Rate limit: 10 Fusion runs per minute per IP
    const ip = getClientIP(request);
    const rl = checkRateLimit(ip, 'fusion');
    if (!rl.allowed) {
      const blocked = rateLimitResponse(rl);
      if (blocked) return new NextResponse(blocked.body, { status: 429, headers: blocked.headers });
    }

    // Input size validation
    const contentLength = Number(request.headers.get('content-length') || '0');
    if (contentLength > 1024 * 1024) {
      return NextResponse.json({ error: 'Request body too large (max 1MB)' }, { status: 413 });
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
    } = body;

    if (!prompt || typeof prompt !== 'string' || prompt.trim().length === 0) {
      return NextResponse.json({ error: 'prompt is required' }, { status: 400 });
    }
    if (prompt.length > 32_000) {
      return NextResponse.json({ error: 'Prompt too long (max 32,000 chars)' }, { status: 400 });
    }
    if (analysisModels && (!Array.isArray(analysisModels) || analysisModels.length > 8)) {
      return NextResponse.json({ error: 'analysisModels must be an array of up to 8 models' }, { status: 400 });
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
      // RAG-grounded Fusion: pull pinned memories for the agent and inject as context
      let ragContext = '';
      if (agentId) {
        try {
          const pinnedMemories = await db.memory.findMany({
            where: { agentId, isPinned: true },
            take: 10,
            orderBy: { updatedAt: 'desc' },
            select: { title: true, content: true },
          });
          if (pinnedMemories.length > 0) {
            ragContext = `\n\n## Retrieved Memories (RAG context)\n${pinnedMemories
              .map((m) => `### ${m.title}\n${m.content.slice(0, 500)}`)
              .join('\n\n')}\n\nUse these memories to ground your deliberation. Cite them when relevant.`;
          }
        } catch {
          // ignore memory lookup failures
        }
      }
      const effectiveSystemPrompt = systemPrompt
        ? systemPrompt + ragContext
        : (ragContext ? `You are a helpful AI assistant deliberating via Fusion.${ragContext}` : undefined);
      const result = await runFusion(prompt, config, { systemPrompt: effectiveSystemPrompt, previousMessages, agentId: agentId || undefined });

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

      // Auto-save a memory entry if linked to an agent (Tier 2 #6)
      if (agentId) {
        try {
          const title = `Fusion: ${prompt.slice(0, 60)}${prompt.length > 60 ? '...' : ''}`;
          const content = result.finalAnswer + (result.judgeAnalysis
            ? `\n\n---\n## Judge Analysis\n${JSON.stringify(result.judgeAnalysis, null, 2)}`
            : '');
          await db.memory.create({
            data: {
              title,
              content,
              type: 'reference',
              folder: 'Fusion',
              tags: 'fusion,auto-saved',
              agentId,
            },
          });
        } catch {
          // Memory save failure should not break the response
        }
      }

      // Audit log entry (Tier 2 #9)
      try {
        await db.activityLog.create({
          data: {
            action: 'Fusion Run',
            details: `${prompt.slice(0, 80)} · ${result.totalTokens ?? 0} tok · $${(result.totalCost ?? 0).toFixed(4)} · ${(result.latencyMs / 1000).toFixed(1)}s`,
            type: 'success',
            agentId: agentId || null,
            agentName: updated.agent?.name || 'Fusion',
          },
        });
      } catch {
        // ignore
      }

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

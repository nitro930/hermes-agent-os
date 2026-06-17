import { db } from '@/lib/db';
import { NextRequest, NextResponse } from 'next/server';
import { runFusion } from '@/lib/openrouter';

/**
 * Team Debate — map each agent in a Team to a Fusion panel model.
 *
 * For each agent in the team that has a non-default `model` set, use that
 * model as a panel member. If fewer than 2 agents have models, fall back
 * to the `general-high` preset.
 *
 * The team's pinned memories (across all agents) are injected as RAG context.
 *
 * POST body: { prompt: string, judgeModel?: string, finalModel?: string, maxToolCalls?: number }
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { prompt, judgeModel, finalModel, maxToolCalls } = body;
    if (!prompt || typeof prompt !== 'string') {
      return NextResponse.json({ error: 'prompt is required' }, { status: 400 });
    }

    const team = await db.team.findUnique({
      where: { id },
      include: {
        agents: {
          select: {
            id: true,
            name: true,
            model: true,
            systemPrompt: true,
            memories: { where: { isPinned: true }, take: 3, orderBy: { updatedAt: 'desc' }, select: { title: true, content: true } },
          },
        },
      },
    });

    if (!team) {
      return NextResponse.json({ error: 'Team not found' }, { status: 404 });
    }

    // Collect unique non-default models from team members
    const panelModels = Array.from(
      new Set(
        team.agents
          .map((a) => a.model)
          .filter((m) => m && m !== 'default'),
      ),
    ) as string[];

    // Build per-agent context for the system prompt
    const agentContext = team.agents
      .map((a) => {
        const memos = a.memories.map((m) => `  - ${m.title}: ${m.content.slice(0, 150)}`).join('\n');
        return `### ${a.name} (model: ${a.model || 'default'})\nRole: ${a.systemPrompt?.slice(0, 200) || 'No system prompt'}\nPinned memories:\n${memos || '  (none)'}`;
      })
      .join('\n\n');

    const systemPrompt = `You are deliberating as the "${team.name}" team.

The team has the following members:
${agentContext}

When deliberating, represent each member's perspective. The panel should reflect the diversity of roles in this team.`;

    const config: any = {};
    if (panelModels.length >= 2) {
      config.analysisModels = panelModels.slice(0, 8);
    } else {
      // Fallback to preset if team members don't have models set
      config.preset = 'general-high';
    }
    if (judgeModel) config.judgeModel = judgeModel;
    if (finalModel) config.finalModel = finalModel;
    else config.finalModel = 'openrouter/fusion';
    if (maxToolCalls) config.maxToolCalls = Number(maxToolCalls);

    // Persist the run (link to the first agent for traceability)
    const primaryAgent = team.agents[0];
    const run = await db.fusionRun.create({
      data: {
        prompt: `[Team Debate: ${team.name}] ${prompt}`,
        status: 'running',
        preset: config.preset || null,
        analysisModels: config.analysisModels ? JSON.stringify(config.analysisModels) : null,
        judgeModel: judgeModel || null,
        finalModel: config.finalModel,
        agentId: primaryAgent?.id || null,
      },
    });

    try {
      const result = await runFusion(prompt, config, { systemPrompt, agentId: primaryAgent?.id });

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
        include: { agent: true, panelResponses: true },
      });

      // Audit log
      await db.activityLog.create({
        data: {
          action: `Team Debate: ${team.name}`,
          details: `${prompt.slice(0, 80)} · ${result.totalTokens ?? 0} tok · ${(result.latencyMs / 1000).toFixed(1)}s`,
          type: 'success',
          agentId: primaryAgent?.id || null,
          agentName: team.name,
        },
      }).catch(() => {});

      return NextResponse.json({ run: updated, panelModels: config.analysisModels || [], preset: config.preset });
    } catch (err: any) {
      await db.fusionRun.update({
        where: { id: run.id },
        data: { status: 'failed', errorMessage: err?.message || 'Unknown error' },
      });
      return NextResponse.json({ error: err?.message, runId: run.id }, { status: 500 });
    }
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || 'Debate failed' }, { status: 500 });
  }
}

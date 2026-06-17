import { db } from '@/lib/db';
import { NextRequest, NextResponse } from 'next/server';
import { runFusion } from '@/lib/openrouter';

/**
 * Execute a skill via Fusion deliberation.
 *
 * The skill's steps (JSON array or text) are formatted into a single
 * prompt and sent to Fusion. The agent's system prompt + pinned memories
 * provide context. The result is saved as a Memory entry tagged with the
 * skill name.
 *
 * POST body: { agentId?: string, input?: string, preset?, analysisModels?, judgeModel?, finalModel? }
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { agentId, input, preset, analysisModels, judgeModel, finalModel, maxToolCalls } = body;

    const skill = await db.skill.findUnique({
      where: { id },
      include: { agent: { include: { memories: { where: { isPinned: true }, take: 5, orderBy: { updatedAt: 'desc' } } } } },
    });
    if (!skill) {
      return NextResponse.json({ error: 'Skill not found' }, { status: 404 });
    }

    // Parse steps
    let steps: string[] = [];
    try {
      const parsed = JSON.parse(skill.steps);
      if (Array.isArray(parsed)) steps = parsed;
      else steps = [skill.steps];
    } catch {
      steps = skill.steps.split('\n').filter(Boolean);
    }

    const skillPrompt = `# Skill: ${skill.name}

${skill.description}

## Steps
${steps.map((s, i) => `${i + 1}. ${s}`).join('\n')}

${skill.triggers ? `## Triggers\n${skill.triggers}\n` : ''}
${input ? `## Input\n${input}\n` : ''}

Execute this skill thoroughly. Walk through each step, apply the relevant context, and produce the result.`;

    let systemPrompt: string | undefined;
    if (skill.agent) {
      const memoryContext = skill.agent.memories.length > 0
        ? `\n\n## Pinned Memories\n${skill.agent.memories.map((m) => `- ${m.title}: ${m.content.slice(0, 200)}`).join('\n')}`
        : '';
      systemPrompt = (skill.agent.systemPrompt || `You are ${skill.agent.name}.`) + memoryContext;
    }

    const config: any = {};
    if (preset) config.preset = preset;
    else if (Array.isArray(analysisModels) && analysisModels.length > 0) config.analysisModels = analysisModels;
    else config.preset = 'general-high';
    if (judgeModel) config.judgeModel = judgeModel;
    if (finalModel) config.finalModel = finalModel;
    else config.finalModel = 'openrouter/fusion';
    if (maxToolCalls) config.maxToolCalls = Number(maxToolCalls);

    const run = await db.fusionRun.create({
      data: {
        prompt: skillPrompt,
        status: 'running',
        preset: config.preset || null,
        analysisModels: config.analysisModels ? JSON.stringify(config.analysisModels) : null,
        judgeModel: judgeModel || null,
        finalModel: config.finalModel,
        agentId: agentId || skill.agentId || null,
      },
    });

    try {
      const result = await runFusion(skillPrompt, config, { systemPrompt, agentId: agentId || skill.agentId || undefined });

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
        include: { agent: true },
      });

      // Increment skill usage count
      await db.skill.update({
        where: { id },
        data: { usageCount: { increment: 1 } },
      }).catch(() => {});

      // Save result as memory tagged with skill name
      if (skill.agentId || agentId) {
        await db.memory.create({
          data: {
            title: `Skill: ${skill.name}`,
            content: result.finalAnswer,
            type: 'log',
            folder: 'Skill Executions',
            tags: `skill,${skill.name.toLowerCase().replace(/\s+/g, '-')},fusion`,
            agentId: agentId || skill.agentId,
          },
        }).catch(() => {});
      }

      // Audit log
      await db.activityLog.create({
        data: {
          action: `Skill Executed: ${skill.name}`,
          details: `${result.totalTokens ?? 0} tok · $${(result.totalCost ?? 0).toFixed(4)} · ${(result.latencyMs / 1000).toFixed(1)}s`,
          type: 'success',
          agentId: agentId || skill.agentId || null,
          agentName: skill.agent?.name || 'Skill',
        },
      }).catch(() => {});

      return NextResponse.json({ run: updated });
    } catch (err: any) {
      await db.fusionRun.update({
        where: { id: run.id },
        data: { status: 'failed', errorMessage: err?.message || 'Unknown error' },
      });
      return NextResponse.json({ error: err?.message, runId: run.id }, { status: 500 });
    }
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || 'Failed' }, { status: 500 });
  }
}

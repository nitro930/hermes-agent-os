import { db } from '@/lib/db';
import { NextRequest, NextResponse } from 'next/server';
import * as fs from 'fs/promises';
import * as path from 'path';

function parseJsonSafe<T>(raw: string | null, fallback: T): T {
  if (!raw) return fallback;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const { searchParams } = new URL(request.url);
    const format = (searchParams.get('format') || 'markdown').toLowerCase();

    const run = await db.fusionRun.findUnique({
      where: { id },
      include: { panelResponses: true, agent: true },
    });

    if (!run) {
      return NextResponse.json({ error: 'Run not found' }, { status: 404 });
    }

    const analysis = parseJsonSafe<any>(run.judgeAnalysis, null);
    const analysisModels = parseJsonSafe<string[]>(run.analysisModels, []);

    let content: string;
    let mimeType: string;
    let extension: string;

    if (format === 'json') {
      content = JSON.stringify({
        id: run.id,
        prompt: run.prompt,
        status: run.status,
        preset: run.preset,
        analysisModels,
        judgeModel: run.judgeModel,
        finalModel: run.finalModel,
        finalAnswer: run.finalAnswer,
        judgeAnalysis: analysis,
        panelResponses: run.panelResponses.map((p) => ({
          model: p.modelSlug,
          response: p.response,
          tokens: p.tokensUsed,
          latencyMs: p.latencyMs,
        })),
        totalTokens: run.totalTokens,
        totalCost: run.totalCost,
        latencyMs: run.latencyMs,
        agent: run.agent ? { id: run.agent.id, name: run.agent.name } : null,
        createdAt: run.createdAt,
        updatedAt: run.updatedAt,
      }, null, 2);
      mimeType = 'application/json';
      extension = 'json';
    } else if (format === 'txt') {
      content = renderPlainText(run, analysis, analysisModels);
      mimeType = 'text/plain';
      extension = 'txt';
    } else {
      content = renderMarkdown(run, analysis, analysisModels);
      mimeType = 'text/markdown';
      extension = 'md';
    }

    // Persist to /download/ so the user can grab it later
    const downloadDir = '/home/z/my-project/download/fusion';
    await fs.mkdir(downloadDir, { recursive: true });
    const safePrompt = run.prompt.slice(0, 40).replace(/[^a-z0-9]+/gi, '_').toLowerCase();
    const timestamp = run.createdAt.toISOString().replace(/[:.]/g, '-');
    const filename = `fusion-${safePrompt}-${timestamp}.${extension}`;
    const filePath = path.join(downloadDir, filename);
    await fs.writeFile(filePath, content, 'utf-8');

    return new NextResponse(content, {
      status: 200,
      headers: {
        'Content-Type': mimeType,
        'Content-Disposition': `attachment; filename="${filename}"`,
        'X-Export-Path': filePath,
      },
    });
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || 'Failed to export' }, { status: 500 });
  }
}

function renderMarkdown(
  run: any,
  analysis: any,
  analysisModels: string[],
): string {
  const lines: string[] = [];
  lines.push(`# Fusion Run Report`);
  lines.push('');
  lines.push(`**Run ID:** \`${run.id}\``);
  lines.push(`**Created:** ${run.createdAt.toISOString()}`);
  lines.push(`**Status:** ${run.status}`);
  if (run.agent) lines.push(`**Agent:** ${run.agent.name}`);
  if (run.preset) lines.push(`**Preset:** ${run.preset}`);
  if (analysisModels.length > 0) lines.push(`**Panel:** ${analysisModels.join(', ')}`);
  if (run.judgeModel) lines.push(`**Judge:** ${run.judgeModel}`);
  if (run.finalModel) lines.push(`**Final model:** ${run.finalModel}`);
  if (run.totalTokens != null) lines.push(`**Tokens:** ${run.totalTokens}`);
  if (run.totalCost != null) lines.push(`**Cost:** $${run.totalCost.toFixed(6)}`);
  if (run.latencyMs != null) lines.push(`**Latency:** ${(run.latencyMs / 1000).toFixed(2)}s`);
  if (run.errorMessage) lines.push(`**Error:** ${run.errorMessage}`);
  lines.push('');
  lines.push('---');
  lines.push('');
  lines.push('## Prompt');
  lines.push('');
  lines.push(run.prompt);
  lines.push('');
  if (run.finalAnswer) {
    lines.push('## Final Answer');
    lines.push('');
    lines.push(run.finalAnswer);
    lines.push('');
  }
  if (analysis) {
    lines.push('## Judge Analysis');
    lines.push('');
    const sections: { key: string; title: string }[] = [
      { key: 'consensus', title: 'Consensus' },
      { key: 'contradictions', title: 'Contradictions' },
      { key: 'partial_coverage', title: 'Partial Coverage' },
      { key: 'unique_insights', title: 'Unique Insights' },
      { key: 'blind_spots', title: 'Blind Spots' },
    ];
    for (const s of sections) {
      const items: string[] = analysis[s.key] || [];
      if (items.length > 0) {
        lines.push(`### ${s.title}`);
        lines.push('');
        for (const item of items) {
          lines.push(`- ${item}`);
        }
        lines.push('');
      }
    }
  }
  if (run.panelResponses && run.panelResponses.length > 0) {
    lines.push('## Panel Responses');
    lines.push('');
    for (const p of run.panelResponses) {
      lines.push(`### ${p.modelSlug}`);
      lines.push('');
      const meta: string[] = [];
      if (p.tokensUsed != null) meta.push(`Tokens: ${p.tokensUsed}`);
      if (p.latencyMs != null) meta.push(`Latency: ${(p.latencyMs / 1000).toFixed(2)}s`);
      if (meta.length > 0) lines.push(`*${meta.join(' · ')}*`);
      lines.push('');
      lines.push(p.response);
      lines.push('');
    }
  }
  lines.push('---');
  lines.push('');
  lines.push(`*Generated by Hermes Agent OS — Fusion*`);
  return lines.join('\n');
}

function renderPlainText(
  run: any,
  analysis: any,
  analysisModels: string[],
): string {
  // Strip markdown formatting for a plain text variant.
  const md = renderMarkdown(run, analysis, analysisModels);
  return md
    .replace(/^#+\s+/gm, '')
    .replace(/\*\*/g, '')
    .replace(/`/g, '')
    .replace(/^\s*-\s/gm, '  • ');
}

/**
 * OpenRouter client with Fusion plugin support.
 *
 * Fusion runs a panel of models in parallel (each with web_search), a judge
 * produces structured analysis (consensus / contradictions / blind spots),
 * and a final model writes the answer.
 *
 * Docs: https://openrouter.ai/docs/guides/features/plugins/fusion
 */

import { db } from './db';

const OPENROUTER_BASE = 'https://openrouter.ai/api/v1';

export interface FusionConfig {
  /** Curated preset, e.g. "general-high" or "general-budget". */
  preset?: 'general-high' | 'general-budget';
  /** 1-8 panel models. Overrides preset. */
  analysisModels?: string[];
  /** Judge model that produces structured analysis. */
  judgeModel?: string;
  /** Final-answer model (defaults to judgeModel or "openrouter/fusion" alias). */
  finalModel?: string;
  /** Max tool-calling steps per panel model. 1-16. Default 8. */
  maxToolCalls?: number;
}

export interface FusionPanelResult {
  model: string;
  content: string;
  tokens?: number;
  latencyMs?: number;
}

export interface FusionJudgeAnalysis {
  consensus?: string[];
  contradictions?: string[];
  partial_coverage?: string[];
  unique_insights?: string[];
  blind_spots?: string[];
  [key: string]: unknown;
}

export interface FusionResult {
  finalAnswer: string;
  judgeAnalysis: FusionJudgeAnalysis | null;
  panel: FusionPanelResult[];
  totalTokens?: number;
  totalCost?: number;
  latencyMs: number;
  raw?: unknown;
}

/** Get the user's OpenRouter API key from the Setting table. */
export async function getOpenRouterApiKey(): Promise<string | null> {
  const setting = await db.setting.findUnique({ where: { id: 'openrouter_api_key' } });
  return setting?.value || null;
}

/** Persist the OpenRouter API key. */
export async function setOpenRouterApiKey(key: string): Promise<void> {
  await db.setting.upsert({
    where: { id: 'openrouter_api_key' },
    update: { value: key },
    create: { id: 'openrouter_api_key', value: key },
  });
}

/**
 * Run a Fusion deliberation. Returns the final answer, structured judge
 * analysis, and (when available) per-panel-model responses.
 *
 * Uses the `openrouter/fusion` model alias + the `fusion` plugin. The alias
 * makes the final model decide for itself whether to invoke the panel —
 * so cheap/tactical prompts skip Fusion entirely.
 */
export async function runFusion(
  prompt: string,
  config: FusionConfig = {},
  options: { systemPrompt?: string; previousMessages?: { role: 'user' | 'assistant' | 'system'; content: string }[] } = {},
): Promise<FusionResult> {
  const apiKey = await getOpenRouterApiKey();
  if (!apiKey) {
    throw new Error('OpenRouter API key not configured. Set it in Settings → OpenRouter.');
  }

  const startedAt = Date.now();
  const plugin: Record<string, unknown> = { id: 'fusion' };
  if (config.preset) plugin.preset = config.preset;
  if (config.analysisModels && config.analysisModels.length > 0) plugin.analysis_models = config.analysisModels;
  if (config.judgeModel) plugin.model = config.judgeModel;
  if (config.maxToolCalls) plugin.max_tool_calls = config.maxToolCalls;

  const finalModel = config.finalModel || 'openrouter/fusion';

  const messages: { role: string; content: string }[] = [];
  if (options.systemPrompt) {
    messages.push({ role: 'system', content: options.systemPrompt });
  }
  if (options.previousMessages && options.previousMessages.length > 0) {
    for (const m of options.previousMessages) {
      messages.push({ role: m.role, content: m.content });
    }
  }
  messages.push({ role: 'user', content: prompt });

  const body: Record<string, unknown> = {
    model: finalModel,
    messages,
    plugins: [plugin],
  };

  const response = await fetch(`${OPENROUTER_BASE}/chat/completions`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
      'HTTP-Referer': 'https://hermes-agent-os.local',
      'X-Title': 'Hermes Agent OS',
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`OpenRouter API error ${response.status}: ${errorText}`);
  }

  const data = await response.json();
  const finalAnswer: string = data?.choices?.[0]?.message?.content || '';
  const usage = data?.usage || {};
  const totalTokens = usage.total_tokens ?? undefined;
  const totalCost = usage.cost ? Number(usage.cost) : undefined;

  // OpenRouter exposes per-model generation metadata via the `id` + ancillary
  // fields. The judge analysis is often embedded as a tool call result that
  // gets folded into the final message content. We attempt to extract it.
  const judgeAnalysis = extractJudgeAnalysis(data);

  // Panel responses: OpenRouter does not always surface these as separate
  // entries in the public response. We capture what's available via
  // `data.choices[0].message.tool_calls` annotations when present.
  const panel = extractPanelResponses(data);

  return {
    finalAnswer,
    judgeAnalysis,
    panel,
    totalTokens,
    totalCost,
    latencyMs: Date.now() - startedAt,
    raw: data,
  };
}

function extractJudgeAnalysis(data: any): FusionJudgeAnalysis | null {
  try {
    // Some providers embed structured JSON in the assistant message content
    // after the final answer (e.g. `<fusion_analysis>...</fusion_analysis>`).
    const content: string = data?.choices?.[0]?.message?.content || '';
    const match = content.match(/```json\s*([\s\S]*?)```/);
    if (match) {
      const parsed = JSON.parse(match[1]);
      if (parsed.consensus || parsed.contradictions || parsed.blind_spots) {
        return parsed;
      }
    }
    // OpenRouter may include plugin metadata under `data.plugins`
    const pluginData = data?.plugins?.find((p: any) => p.id === 'fusion');
    if (pluginData?.analysis) {
      return pluginData.analysis;
    }
  } catch {
    // ignore parse failures
  }
  return null;
}

function extractPanelResponses(data: any): FusionPanelResult[] {
  const panel: FusionPanelResult[] = [];
  try {
    const toolCalls = data?.choices?.[0]?.message?.tool_calls;
    if (Array.isArray(toolCalls)) {
      for (const tc of toolCalls) {
        if (tc?.function?.name === 'openrouter:fusion' && tc?.function?.arguments) {
          try {
            const args = JSON.parse(tc.function.arguments);
            if (Array.isArray(args?.panel)) {
              for (const p of args.panel) {
                panel.push({
                  model: p.model || 'unknown',
                  content: p.response || p.content || '',
                  tokens: p.tokens,
                  latencyMs: p.latency_ms,
                });
              }
            }
          } catch {
            // ignore
          }
        }
      }
    }
  } catch {
    // ignore
  }
  return panel;
}

/** Quick non-Fusion call to verify the API key works. */
export async function verifyOpenRouterApiKey(key: string): Promise<{ ok: boolean; error?: string }> {
  try {
    const response = await fetch(`${OPENROUTER_BASE}/auth/key`, {
      headers: { Authorization: `Bearer ${key}` },
    });
    if (!response.ok) {
      return { ok: false, error: `HTTP ${response.status}: ${await response.text()}` };
    }
    return { ok: true };
  } catch (e: any) {
    return { ok: false, error: e?.message || 'Network error' };
  }
}

/** Curated list of recommended models for the panel/judge pickers. */
// Re-exported from openrouter-constants.ts (client-safe).
export { RECOMMENDED_MODELS, FUSION_PRESETS } from './openrouter-constants';

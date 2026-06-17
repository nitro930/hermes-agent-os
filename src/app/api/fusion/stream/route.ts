import { db } from '@/lib/db';
import { NextRequest } from 'next/server';
import { getOpenRouterApiKey, FusionConfig } from '@/lib/openrouter';

/**
 * Stream a Fusion run via Server-Sent Events.
 *
 * Streams the final-answer model's output as it is generated. The panel +
 * judge phases happen server-side on OpenRouter and are not streamable —
 * we emit a `phase` event when they finish and a `delta` event for each
 * token chunk of the final answer.
 */
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
      return new Response('prompt is required', { status: 400 });
    }

    const apiKey = await getOpenRouterApiKey();
    if (!apiKey) {
      return new Response('OpenRouter API key not configured', { status: 401 });
    }

    const encoder = new TextEncoder();
    const stream = new ReadableStream({
      async start(controller) {
        const send = (event: string, data: any) => {
          controller.enqueue(encoder.encode(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`));
        };

        try {
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
          send('start', { runId: run.id });
          send('phase', { phase: 'deliberating', message: 'Panel + judge deliberating on OpenRouter...' });

          const startedAt = Date.now();
          const config: FusionConfig = {};
          if (preset) config.preset = preset;
          if (Array.isArray(analysisModels) && analysisModels.length > 0) config.analysisModels = analysisModels;
          if (judgeModel) config.judgeModel = judgeModel;
          if (maxToolCalls) config.maxToolCalls = maxToolCalls;
          const effectiveFinalModel = finalModel || 'openrouter/fusion';

          const plugin: Record<string, unknown> = { id: 'fusion' };
          if (config.preset) plugin.preset = config.preset;
          if (config.analysisModels) plugin.analysis_models = config.analysisModels;
          if (config.judgeModel) plugin.model = config.judgeModel;
          if (config.maxToolCalls) plugin.max_tool_calls = config.maxToolCalls;

          const messages: { role: string; content: string }[] = [];
          if (systemPrompt) messages.push({ role: 'system', content: systemPrompt });
          if (Array.isArray(previousMessages)) {
            for (const m of previousMessages) messages.push({ role: m.role, content: m.content });
          }
          messages.push({ role: 'user', content: prompt });

          // Stream from OpenRouter
          const orRes = await fetch('https://openrouter.ai/api/v1/chat/completions', {
            method: 'POST',
            headers: {
              Authorization: `Bearer ${apiKey}`,
              'Content-Type': 'application/json',
              'HTTP-Referer': 'https://hermes-agent-os.local',
              'X-Title': 'Hermes Agent OS',
            },
            body: JSON.stringify({
              model: effectiveFinalModel,
              messages,
              plugins: [plugin],
              stream: true,
            }),
          });

          if (!orRes.ok || !orRes.body) {
            const errText = await orRes.text().catch(() => 'unknown');
            throw new Error(`OpenRouter ${orRes.status}: ${errText}`);
          }

          send('phase', { phase: 'streaming', message: 'Final answer streaming...' });

          const reader = orRes.body.getReader();
          const decoder = new TextDecoder();
          let buffer = '';
          let fullContent = '';
          let totalTokens: number | undefined;
          let totalCost: number | undefined;

          while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            buffer += decoder.decode(value, { stream: true });

            // SSE lines are separated by \n\n
            const lines = buffer.split('\n');
            buffer = lines.pop() || '';

            for (const line of lines) {
              const trimmed = line.trim();
              if (!trimmed.startsWith('data: ')) continue;
              const payload = trimmed.slice(6);
              if (payload === '[DONE]') continue;
              try {
                const evt = JSON.parse(payload);
                const delta = evt?.choices?.[0]?.delta?.content;
                if (typeof delta === 'string' && delta.length > 0) {
                  fullContent += delta;
                  send('delta', { text: delta });
                }
                // Final usage info often arrives in the last chunk
                if (evt?.usage?.total_tokens) totalTokens = evt.usage.total_tokens;
                if (evt?.usage?.cost) totalCost = Number(evt.usage.cost);
              } catch {
                // ignore partial JSON
              }
            }
          }

          const latencyMs = Date.now() - startedAt;

          const updated = await db.fusionRun.update({
            where: { id: run.id },
            data: {
              status: 'success',
              finalAnswer: fullContent,
              totalTokens: totalTokens ?? null,
              totalCost: totalCost ?? null,
              latencyMs,
            },
          });

          send('complete', {
            runId: updated.id,
            totalTokens,
            totalCost,
            latencyMs,
            finalAnswer: fullContent,
          });
        } catch (err: any) {
          send('error', { message: err?.message || 'Fusion stream failed' });
        } finally {
          controller.close();
        }
      },
    });

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache, no-transform',
        Connection: 'keep-alive',
        'X-Accel-Buffering': 'no',
      },
    });
  } catch (err: any) {
    return new Response(err?.message || 'Failed', { status: 500 });
  }
}

import { db } from '@/lib/db';
import { NextResponse } from 'next/server';

/**
 * Fetch the live model list from OpenRouter and surface availability info
 * for the models we care about (RECOMMENDED_MODELS plus any custom slugs).
 *
 * Caches for 5 minutes in the Setting table to avoid hammering the API.
 */
const CACHE_TTL_MS = 5 * 60 * 1000;

const TRACKED_SLUGS = new Set([
  '~anthropic/claude-opus-latest',
  '~anthropic/claude-sonnet-latest',
  '~openai/gpt-latest',
  '~openai/gpt-4o',
  '~google/gemini-pro-latest',
  '~google/gemini-2.0-flash',
  '~meta-llama/llama-3.3-70b-instruct',
  '~mistral/mistral-large',
  '~deepseek/deepseek-chat',
  '~x-ai/grok-2',
  'openrouter/fusion',
]);

export async function GET() {
  try {
    // Check cache
    const cacheRow = await db.setting.findUnique({ where: { id: 'openrouter_models_cache' } });
    if (cacheRow) {
      try {
        const cached = JSON.parse(cacheRow.value);
        if (Date.now() - cached.timestamp < CACHE_TTL_MS) {
          return NextResponse.json(cached.payload);
        }
      } catch {
        // ignore cache parse errors
      }
    }

    const apiKeyRow = await db.setting.findUnique({ where: { id: 'openrouter_api_key' } });
    const apiKey = apiKeyRow?.value;

    const headers: Record<string, string> = {};
    if (apiKey) headers.Authorization = `Bearer ${apiKey}`;
    headers['User-Agent'] = 'Hermes-Agent-OS/1.0';

    const res = await fetch('https://openrouter.ai/api/v1/models', { headers });
    if (!res.ok) {
      return NextResponse.json(
        { error: `OpenRouter returned ${res.status}`, cached: false },
        { status: 502 },
      );
    }
    const data = await res.json();
    const allModels: any[] = Array.isArray(data?.data) ? data.data : [];

    const tracked = allModels
      .filter((m: any) => {
        const slug = m?.id;
        if (!slug) return false;
        // Match the tilde-prefixed slugs against the underlying IDs.
        return Array.from(TRACKED_SLUGS).some((t) => slug === t || slug === t.replace('~', ''));
      })
      .map((m: any) => ({
        id: m.id,
        name: m.name,
        contextLength: m.context_length,
        pricing: {
          prompt: m.pricing?.prompt,
          completion: m.pricing?.completion,
        },
        architecture: {
          modality: m.architecture?.modality,
          inputModalities: m.architecture?.input_modalities,
          outputModalities: m.architecture?.output_modalities,
        },
        supportedParameters: m.supported_parameters,
        description: m.description?.slice(0, 200),
      }));

    const payload = {
      tracked,
      totalAvailable: allModels.length,
      timestamp: new Date().toISOString(),
    };

    // Persist cache
    await db.setting.upsert({
      where: { id: 'openrouter_models_cache' },
      update: { value: JSON.stringify({ timestamp: Date.now(), payload }) },
      create: { id: 'openrouter_models_cache', value: JSON.stringify({ timestamp: Date.now(), payload }) },
    });

    return NextResponse.json(payload);
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || 'Failed' }, { status: 500 });
  }
}

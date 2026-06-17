import { db } from '@/lib/db';
import { NextRequest, NextResponse } from 'next/server';
import {
  getOpenRouterApiKey,
  setOpenRouterApiKey,
  verifyOpenRouterApiKey,
} from '@/lib/openrouter';

export async function GET() {
  try {
    const key = await getOpenRouterApiKey();
    return NextResponse.json({
      configured: !!key,
      // Never return the actual key — only whether one is set.
      masked: key ? `${key.slice(0, 4)}...${key.slice(-4)}` : null,
    });
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || 'Failed' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { apiKey, verify } = body;
    if (!apiKey || typeof apiKey !== 'string') {
      return NextResponse.json({ error: 'apiKey is required' }, { status: 400 });
    }

    if (verify) {
      const check = await verifyOpenRouterApiKey(apiKey);
      if (!check.ok) {
        return NextResponse.json(
          { error: `API key verification failed: ${check.error}`, verified: false },
          { status: 400 },
        );
      }
    }

    await setOpenRouterApiKey(apiKey);
    return NextResponse.json({ ok: true, verified: !!verify });
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || 'Failed' }, { status: 500 });
  }
}

export async function DELETE() {
  try {
    await db.setting.delete({ where: { id: 'openrouter_api_key' } }).catch(() => {});
    return NextResponse.json({ ok: true });
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || 'Failed' }, { status: 500 });
  }
}

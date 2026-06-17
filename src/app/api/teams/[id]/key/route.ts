import { db } from '@/lib/db';
import { NextRequest, NextResponse } from 'next/server';
import { verifyOpenRouterApiKey } from '@/lib/openrouter';

/**
 * Manage per-team OpenRouter API keys (multi-tenant cost attribution).
 * GET  /api/teams/[id]/key → { configured, masked }
 * POST /api/teams/[id]/key { apiKey, verify? } → { ok, verified }
 * DELETE /api/teams/[id]/key → { ok }
 */
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const team = await db.team.findUnique({
      where: { id },
      select: { openRouterApiKey: true },
    });
    if (!team) {
      return NextResponse.json({ error: 'Team not found' }, { status: 404 });
    }
    const key = team.openRouterApiKey;
    return NextResponse.json({
      configured: !!key,
      masked: key ? `${key.slice(0, 4)}...${key.slice(-4)}` : null,
    });
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || 'Failed' }, { status: 500 });
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { apiKey, verify } = body;
    if (!apiKey || typeof apiKey !== 'string') {
      return NextResponse.json({ error: 'apiKey required' }, { status: 400 });
    }

    if (verify) {
      const check = await verifyOpenRouterApiKey(apiKey);
      if (!check.ok) {
        return NextResponse.json(
          { error: `Verification failed: ${check.error}`, verified: false },
          { status: 400 },
        );
      }
    }

    await db.team.update({
      where: { id },
      data: { openRouterApiKey: apiKey },
    });
    return NextResponse.json({ ok: true, verified: !!verify });
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || 'Failed' }, { status: 500 });
  }
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    await db.team.update({
      where: { id },
      data: { openRouterApiKey: null },
    });
    return NextResponse.json({ ok: true });
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || 'Failed' }, { status: 500 });
  }
}

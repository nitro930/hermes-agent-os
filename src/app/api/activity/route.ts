import { db } from '@/lib/db';
import { NextRequest, NextResponse } from 'next/server';

export async function GET() {
  try {
    const logs = await db.activityLog.findMany({
      orderBy: { createdAt: 'desc' },
      take: 50,
    });
    return NextResponse.json(logs);
  } catch (error) {
    console.error('Failed to fetch activity logs:', error);
    return NextResponse.json({ error: 'Failed to fetch activity logs' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const log = await db.activityLog.create({
      data: {
        agentId: body.agentId || null,
        agentName: body.agentName || null,
        action: body.action,
        details: body.details || null,
        type: body.type || 'info',
      },
    });
    return NextResponse.json(log, { status: 201 });
  } catch (error) {
    console.error('Failed to create activity log:', error);
    return NextResponse.json({ error: 'Failed to create activity log' }, { status: 500 });
  }
}

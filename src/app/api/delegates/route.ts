import { db } from '@/lib/db';
import { NextResponse } from 'next/server';

export async function GET() {
  try {
    const delegates = await db.delegate.findMany({
      include: { parentAgent: { select: { id: true, name: true, avatar: true } } },
      orderBy: { createdAt: 'desc' },
    });
    return NextResponse.json(delegates);
  } catch (error) {
    console.error('Failed to fetch delegates:', error);
    return NextResponse.json({ error: 'Failed to fetch delegates' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const delegate = await db.delegate.create({
      data: {
        name: body.name,
        description: body.description || null,
        status: body.status || 'pending',
        task: body.task,
        result: body.result || null,
        parentAgentId: body.parentAgentId,
      },
      include: { parentAgent: { select: { id: true, name: true, avatar: true } } },
    });

    await db.activityLog.create({
      data: {
        agentId: body.parentAgentId,
        agentName: delegate.parentAgent?.name || 'System',
        action: 'Delegate Spawned',
        details: `Delegate "${delegate.name}" was spawned for task: ${delegate.task}`,
        type: 'info',
      },
    });

    return NextResponse.json(delegate, { status: 201 });
  } catch (error) {
    console.error('Failed to create delegate:', error);
    return NextResponse.json({ error: 'Failed to create delegate' }, { status: 500 });
  }
}

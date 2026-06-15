import { db } from '@/lib/db';
import { NextResponse } from 'next/server';

export async function GET() {
  try {
    const goals = await db.goal.findMany({
      include: { agent: { select: { id: true, name: true, avatar: true } } },
      orderBy: { createdAt: 'desc' },
    });
    return NextResponse.json(goals);
  } catch (error) {
    console.error('Failed to fetch goals:', error);
    return NextResponse.json({ error: 'Failed to fetch goals' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const goal = await db.goal.create({
      data: {
        title: body.title,
        description: body.description || null,
        status: body.status || 'active',
        priority: body.priority || 'medium',
        progress: body.progress || 0,
        agentId: body.agentId || null,
        dueDate: body.dueDate || null,
      },
      include: { agent: { select: { id: true, name: true, avatar: true } } },
    });

    await db.activityLog.create({
      data: {
        agentName: 'System',
        action: 'Goal Created',
        details: `Goal "${goal.title}" was created with ${goal.priority} priority`,
        type: 'success',
      },
    });

    return NextResponse.json(goal, { status: 201 });
  } catch (error) {
    console.error('Failed to create goal:', error);
    return NextResponse.json({ error: 'Failed to create goal' }, { status: 500 });
  }
}

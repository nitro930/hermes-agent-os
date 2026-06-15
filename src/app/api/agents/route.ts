import { db } from '@/lib/db';
import { NextRequest, NextResponse } from 'next/server';

export async function GET() {
  try {
    const agents = await db.agent.findMany({
      include: { team: true, tasks: true },
      orderBy: { createdAt: 'desc' },
    });
    return NextResponse.json(agents);
  } catch (error) {
    console.error('Failed to fetch agents:', error);
    return NextResponse.json({ error: 'Failed to fetch agents' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const agent = await db.agent.create({
      data: {
        name: body.name,
        description: body.description || '',
        type: body.type || 'general',
        status: body.status || 'idle',
        avatar: body.avatar || null,
        systemPrompt: body.systemPrompt || null,
        model: body.model || 'default',
        teamId: body.teamId || null,
      },
      include: { team: true },
    });

    await db.activityLog.create({
      data: {
        agentId: agent.id,
        agentName: agent.name,
        action: 'Agent Created',
        details: `Agent "${agent.name}" of type ${agent.type} was created`,
        type: 'success',
      },
    });

    return NextResponse.json(agent, { status: 201 });
  } catch (error) {
    console.error('Failed to create agent:', error);
    return NextResponse.json({ error: 'Failed to create agent' }, { status: 500 });
  }
}

import { db } from '@/lib/db';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const agent = await db.agent.findUnique({
      where: { id },
      include: {
        team: true,
        tasks: true,
        memories: true,
        conversations: true,
        skills: true,
        goals: true,
        delegates: true,
      },
    });
    if (!agent) {
      return NextResponse.json({ error: 'Agent not found' }, { status: 404 });
    }
    return NextResponse.json(agent);
  } catch (error) {
    console.error('Failed to fetch agent:', error);
    return NextResponse.json({ error: 'Failed to fetch agent' }, { status: 500 });
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const agent = await db.agent.update({
      where: { id },
      data: body,
      include: { team: true },
    });

    if (body.status) {
      await db.activityLog.create({
        data: {
          agentId: agent.id,
          agentName: agent.name,
          action: 'Status Changed',
          details: `Agent "${agent.name}" status changed to ${agent.status}`,
          type: agent.status === 'running' ? 'success' : agent.status === 'error' ? 'error' : 'info',
        },
      });
    }

    if (body.soulMd !== undefined) {
      await db.activityLog.create({
        data: {
          agentId: agent.id,
          agentName: agent.name,
          action: 'SOUL.md Updated',
          details: `Agent "${agent.name}" personality configuration was updated`,
          type: 'info',
        },
      });
    }

    return NextResponse.json(agent);
  } catch (error) {
    console.error('Failed to update agent:', error);
    return NextResponse.json({ error: 'Failed to update agent' }, { status: 500 });
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const agent = await db.agent.delete({ where: { id } });
    await db.activityLog.create({
      data: {
        agentId: id,
        agentName: agent.name,
        action: 'Agent Deleted',
        details: `Agent "${agent.name}" was deleted`,
        type: 'warning',
      },
    });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Failed to delete agent:', error);
    return NextResponse.json({ error: 'Failed to delete agent' }, { status: 500 });
  }
}

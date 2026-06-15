import { db } from '@/lib/db';
import { NextRequest, NextResponse } from 'next/server';

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const goal = await db.goal.update({
      where: { id },
      data: body,
      include: { agent: { select: { id: true, name: true, avatar: true } } },
    });

    if (body.status === 'completed') {
      await db.activityLog.create({
        data: {
          agentId: goal.agentId,
          agentName: goal.agent?.name || 'System',
          action: 'Goal Completed',
          details: `Goal "${goal.title}" was completed`,
          type: 'success',
        },
      });
    }

    return NextResponse.json(goal);
  } catch (error) {
    console.error('Failed to update goal:', error);
    return NextResponse.json({ error: 'Failed to update goal' }, { status: 500 });
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const goal = await db.goal.delete({ where: { id } });
    await db.activityLog.create({
      data: {
        agentName: 'System',
        action: 'Goal Deleted',
        details: `Goal "${goal.title}" was deleted`,
        type: 'warning',
      },
    });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Failed to delete goal:', error);
    return NextResponse.json({ error: 'Failed to delete goal' }, { status: 500 });
  }
}

import { db } from '@/lib/db';
import { NextRequest, NextResponse } from 'next/server';

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const task = await db.task.update({
      where: { id },
      data: body,
      include: { agent: true },
    });

    if (body.column && body.column !== task.column) {
      await db.activityLog.create({
        data: {
          agentId: task.agentId,
          agentName: task.agent?.name || 'System',
          action: 'Task Moved',
          details: `Task "${task.title}" moved to ${body.column}`,
          type: 'info',
        },
      });
    }

    return NextResponse.json(task);
  } catch (error) {
    console.error('Failed to update task:', error);
    return NextResponse.json({ error: 'Failed to update task' }, { status: 500 });
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const task = await db.task.delete({ where: { id } });
    await db.activityLog.create({
      data: {
        agentName: 'System',
        action: 'Task Deleted',
        details: `Task "${task.title}" was deleted`,
        type: 'warning',
      },
    });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Failed to delete task:', error);
    return NextResponse.json({ error: 'Failed to delete task' }, { status: 500 });
  }
}

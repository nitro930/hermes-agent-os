import { db } from '@/lib/db';
import { NextRequest, NextResponse } from 'next/server';
import { updateTaskSchema } from '@/lib/validations';
import { ZodError } from 'zod';

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const validated = updateTaskSchema.parse(body);

    // Fetch old task to detect column changes for activity logging
    const oldTask = await db.task.findUnique({ where: { id }, include: { agent: true } });

    const task = await db.task.update({
      where: { id },
      data: validated,
      include: { agent: true },
    });

    if (validated.column && oldTask && validated.column !== oldTask.column) {
      await db.activityLog.create({
        data: {
          agentId: task.agentId,
          agentName: task.agent?.name || 'System',
          action: 'Task Moved',
          details: `Task "${task.title}" moved to ${validated.column}`,
          type: 'info',
        },
      });
    }

    return NextResponse.json(task);
  } catch (error) {
    if (error instanceof ZodError) {
      return NextResponse.json(
        { error: 'Validation failed', details: error.issues },
        { status: 400 }
      );
    }
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

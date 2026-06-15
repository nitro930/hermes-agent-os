import { db } from '@/lib/db';
import { NextRequest, NextResponse } from 'next/server';

export async function GET() {
  try {
    const tasks = await db.task.findMany({
      include: { agent: true },
      orderBy: [{ column: 'asc' }, { order: 'asc' }],
    });
    return NextResponse.json(tasks);
  } catch (error) {
    console.error('Failed to fetch tasks:', error);
    return NextResponse.json({ error: 'Failed to fetch tasks' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const maxOrderTask = await db.task.findFirst({
      where: { column: body.column || 'todo' },
      orderBy: { order: 'desc' },
    });
    const order = (maxOrderTask?.order ?? -1) + 1;
    const task = await db.task.create({
      data: {
        title: body.title,
        description: body.description || null,
        status: body.status || 'todo',
        priority: body.priority || 'medium',
        column: body.column || 'todo',
        order,
        agentId: body.agentId || null,
        tags: body.tags || null,
        dueDate: body.dueDate || null,
      },
      include: { agent: true },
    });

    await db.activityLog.create({
      data: {
        agentId: body.agentId || null,
        agentName: body.agentId ? undefined : 'System',
        action: 'Task Created',
        details: `Task "${task.title}" created with ${task.priority} priority`,
        type: 'info',
      },
    });

    return NextResponse.json(task, { status: 201 });
  } catch (error) {
    console.error('Failed to create task:', error);
    return NextResponse.json({ error: 'Failed to create task' }, { status: 500 });
  }
}

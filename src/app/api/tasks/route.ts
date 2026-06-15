import { db } from '@/lib/db';
import { NextRequest, NextResponse } from 'next/server';
import { createTaskSchema, paginationSchema } from '@/lib/validations';
import { ZodError } from 'zod';

export async function GET(request: NextRequest) {
  try {
    const { take, skip } = paginationSchema.parse(
      Object.fromEntries(request.nextUrl.searchParams)
    );
    const tasks = await db.task.findMany({
      include: { agent: true },
      orderBy: [{ column: 'asc' }, { order: 'asc' }],
      take,
      skip,
    });
    return NextResponse.json(tasks);
  } catch (error) {
    if (error instanceof ZodError) {
      return NextResponse.json(
        { error: 'Validation failed', details: error.issues },
        { status: 400 }
      );
    }
    console.error('Failed to fetch tasks:', error);
    return NextResponse.json({ error: 'Failed to fetch tasks' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const validated = createTaskSchema.parse(body);

    const maxOrderTask = await db.task.findFirst({
      where: { column: validated.column },
      orderBy: { order: 'desc' },
    });
    const order = (maxOrderTask?.order ?? -1) + 1;

    const task = await db.task.create({
      data: {
        title: validated.title,
        description: validated.description ?? null,
        status: validated.status,
        priority: validated.priority,
        column: validated.column,
        order,
        agentId: validated.agentId ?? null,
        tags: validated.tags ?? null,
        dueDate: validated.dueDate ?? null,
      },
      include: { agent: true },
    });

    await db.activityLog.create({
      data: {
        agentId: validated.agentId ?? null,
        agentName: validated.agentId ? undefined : 'System',
        action: 'Task Created',
        details: `Task "${task.title}" created with ${task.priority} priority`,
        type: 'info',
      },
    });

    return NextResponse.json(task, { status: 201 });
  } catch (error) {
    if (error instanceof ZodError) {
      return NextResponse.json(
        { error: 'Validation failed', details: error.issues },
        { status: 400 }
      );
    }
    console.error('Failed to create task:', error);
    return NextResponse.json({ error: 'Failed to create task' }, { status: 500 });
  }
}

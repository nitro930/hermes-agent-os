import { db } from '@/lib/db';
import { createGoalSchema, paginationSchema } from '@/lib/validations';
import { ZodError } from 'zod';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const { take, skip } = paginationSchema.parse({
      take: searchParams.get('take') ?? undefined,
      skip: searchParams.get('skip') ?? undefined,
    });

    const goals = await db.goal.findMany({
      include: { agent: { select: { id: true, name: true, avatar: true } } },
      orderBy: { createdAt: 'desc' },
      take,
      skip,
    });
    return NextResponse.json(goals);
  } catch (error) {
    if (error instanceof ZodError) {
      return NextResponse.json(
        { error: 'Validation failed', details: error.flatten().fieldErrors },
        { status: 400 }
      );
    }
    console.error('Failed to fetch goals:', error);
    return NextResponse.json({ error: 'Failed to fetch goals' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const data = createGoalSchema.parse(body);

    const goal = await db.goal.create({
      data: {
        title: data.title,
        description: data.description ?? null,
        status: 'active',
        priority: data.priority,
        progress: 0,
        agentId: data.agentId ?? null,
        dueDate: data.dueDate ?? null,
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
    if (error instanceof ZodError) {
      return NextResponse.json(
        { error: 'Validation failed', details: error.flatten().fieldErrors },
        { status: 400 }
      );
    }
    console.error('Failed to create goal:', error);
    return NextResponse.json({ error: 'Failed to create goal' }, { status: 500 });
  }
}

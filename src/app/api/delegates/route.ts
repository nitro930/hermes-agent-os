import { db } from '@/lib/db';
import { createDelegateSchema, paginationSchema } from '@/lib/validations';
import { ZodError } from 'zod';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const { take, skip } = paginationSchema.parse({
      take: searchParams.get('take') ?? undefined,
      skip: searchParams.get('skip') ?? undefined,
    });

    const delegates = await db.delegate.findMany({
      include: { parentAgent: { select: { id: true, name: true, avatar: true } } },
      orderBy: { createdAt: 'desc' },
      take,
      skip,
    });
    return NextResponse.json(delegates);
  } catch (error) {
    if (error instanceof ZodError) {
      return NextResponse.json(
        { error: 'Validation failed', details: error.flatten().fieldErrors },
        { status: 400 }
      );
    }
    console.error('Failed to fetch delegates:', error);
    return NextResponse.json({ error: 'Failed to fetch delegates' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const data = createDelegateSchema.parse(body);

    const delegate = await db.delegate.create({
      data: {
        name: data.name,
        description: data.description ?? null,
        status: 'pending',
        task: data.task,
        result: null,
        parentAgentId: data.parentAgentId,
      },
      include: { parentAgent: { select: { id: true, name: true, avatar: true } } },
    });

    await db.activityLog.create({
      data: {
        agentId: data.parentAgentId,
        agentName: delegate.parentAgent?.name || 'System',
        action: 'Delegate Spawned',
        details: `Delegate "${delegate.name}" was spawned for task: ${delegate.task}`,
        type: 'info',
      },
    });

    return NextResponse.json(delegate, { status: 201 });
  } catch (error) {
    if (error instanceof ZodError) {
      return NextResponse.json(
        { error: 'Validation failed', details: error.flatten().fieldErrors },
        { status: 400 }
      );
    }
    console.error('Failed to create delegate:', error);
    return NextResponse.json({ error: 'Failed to create delegate' }, { status: 500 });
  }
}

import { db } from '@/lib/db';
import { createAgentSchema, paginationSchema } from '@/lib/validations';
import { NextRequest, NextResponse } from 'next/server';
import { ZodError } from 'zod';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const rawParams = Object.fromEntries(searchParams.entries());
    const parsed = paginationSchema.safeParse(rawParams);

    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Invalid pagination parameters', details: parsed.error.flatten().fieldErrors },
        { status: 400 },
      );
    }

    const { take, skip } = parsed.data;

    const [agents, total] = await Promise.all([
      db.agent.findMany({
        take,
        skip,
        include: { team: true, tasks: true },
        orderBy: { createdAt: 'desc' },
      }),
      db.agent.count(),
    ]);

    return NextResponse.json({ data: agents, pagination: { take, skip, total } });
  } catch (error) {
    console.error('Failed to fetch agents:', error);
    return NextResponse.json({ error: 'Failed to fetch agents' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const validated = createAgentSchema.parse(body);

    const agent = await db.agent.create({
      data: {
        name: validated.name,
        description: validated.description,
        type: validated.type,
        status: 'idle',
        avatar: validated.avatar ?? null,
        systemPrompt: validated.systemPrompt ?? null,
        soulMd: validated.soulMd ?? null,
        model: validated.model,
        teamId: validated.teamId ?? null,
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
    if (error instanceof ZodError) {
      return NextResponse.json(
        { error: 'Validation failed', details: error.flatten().fieldErrors },
        { status: 400 },
      );
    }
    console.error('Failed to create agent:', error);
    return NextResponse.json({ error: 'Failed to create agent' }, { status: 500 });
  }
}

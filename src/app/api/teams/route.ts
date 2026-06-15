import { db } from '@/lib/db';
import { createTeamSchema, paginationSchema } from '@/lib/validations';
import { ZodError } from 'zod';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const { take, skip } = paginationSchema.parse({
      take: searchParams.get('take') ?? undefined,
      skip: searchParams.get('skip') ?? undefined,
    });

    const teams = await db.team.findMany({
      include: { agents: true },
      orderBy: { createdAt: 'desc' },
      take,
      skip,
    });
    return NextResponse.json(teams);
  } catch (error) {
    if (error instanceof ZodError) {
      return NextResponse.json(
        { error: 'Validation failed', details: error.flatten().fieldErrors },
        { status: 400 }
      );
    }
    console.error('Failed to fetch teams:', error);
    return NextResponse.json({ error: 'Failed to fetch teams' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const data = createTeamSchema.parse(body);

    const team = await db.team.create({
      data: {
        name: data.name,
        description: data.description,
        color: data.color,
      },
      include: { agents: true },
    });

    await db.activityLog.create({
      data: {
        agentName: 'System',
        action: 'Team Created',
        details: `Team "${team.name}" was created`,
        type: 'success',
      },
    });

    return NextResponse.json(team, { status: 201 });
  } catch (error) {
    if (error instanceof ZodError) {
      return NextResponse.json(
        { error: 'Validation failed', details: error.flatten().fieldErrors },
        { status: 400 }
      );
    }
    console.error('Failed to create team:', error);
    return NextResponse.json({ error: 'Failed to create team' }, { status: 500 });
  }
}

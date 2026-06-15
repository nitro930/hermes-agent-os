import { db } from '@/lib/db';
import { NextRequest, NextResponse } from 'next/server';

export async function GET() {
  try {
    const teams = await db.team.findMany({
      include: { agents: true },
      orderBy: { createdAt: 'desc' },
    });
    return NextResponse.json(teams);
  } catch (error) {
    console.error('Failed to fetch teams:', error);
    return NextResponse.json({ error: 'Failed to fetch teams' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const team = await db.team.create({
      data: {
        name: body.name,
        description: body.description || '',
        color: body.color || '#6366f1',
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
    console.error('Failed to create team:', error);
    return NextResponse.json({ error: 'Failed to create team' }, { status: 500 });
  }
}

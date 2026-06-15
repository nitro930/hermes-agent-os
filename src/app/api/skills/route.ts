import { db } from '@/lib/db';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const category = searchParams.get('category');

    const where = category && category !== 'all' ? { category } : {};

    const skills = await db.skill.findMany({
      where,
      include: { agent: { select: { id: true, name: true, avatar: true } } },
      orderBy: { createdAt: 'desc' },
    });
    return NextResponse.json(skills);
  } catch (error) {
    console.error('Failed to fetch skills:', error);
    return NextResponse.json({ error: 'Failed to fetch skills' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const skill = await db.skill.create({
      data: {
        name: body.name,
        description: body.description || '',
        category: body.category || 'general',
        steps: body.steps || '[]',
        triggers: body.triggers || null,
        isAutoLearned: body.isAutoLearned || false,
        usageCount: body.usageCount || 0,
        agentId: body.agentId || null,
      },
      include: { agent: { select: { id: true, name: true, avatar: true } } },
    });

    await db.activityLog.create({
      data: {
        agentName: 'System',
        action: 'Skill Created',
        details: `Skill "${skill.name}" was created in category ${skill.category}`,
        type: 'success',
      },
    });

    return NextResponse.json(skill, { status: 201 });
  } catch (error) {
    console.error('Failed to create skill:', error);
    return NextResponse.json({ error: 'Failed to create skill' }, { status: 500 });
  }
}

import { db } from '@/lib/db';
import { createSkillSchema, paginationSchema } from '@/lib/validations';
import { ZodError } from 'zod';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const category = searchParams.get('category');
    const { take, skip } = paginationSchema.parse({
      take: searchParams.get('take') ?? undefined,
      skip: searchParams.get('skip') ?? undefined,
    });

    const where = category && category !== 'all' ? { category } : {};

    const skills = await db.skill.findMany({
      where,
      include: { agent: { select: { id: true, name: true, avatar: true } } },
      orderBy: { createdAt: 'desc' },
      take,
      skip,
    });
    return NextResponse.json(skills);
  } catch (error) {
    if (error instanceof ZodError) {
      return NextResponse.json(
        { error: 'Validation failed', details: error.flatten().fieldErrors },
        { status: 400 }
      );
    }
    console.error('Failed to fetch skills:', error);
    return NextResponse.json({ error: 'Failed to fetch skills' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const data = createSkillSchema.parse(body);

    const skill = await db.skill.create({
      data: {
        name: data.name,
        description: data.description,
        category: data.category,
        steps: data.steps,
        triggers: data.triggers ?? null,
        isAutoLearned: data.isAutoLearned,
        usageCount: 0,
        agentId: data.agentId ?? null,
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
    if (error instanceof ZodError) {
      return NextResponse.json(
        { error: 'Validation failed', details: error.flatten().fieldErrors },
        { status: 400 }
      );
    }
    console.error('Failed to create skill:', error);
    return NextResponse.json({ error: 'Failed to create skill' }, { status: 500 });
  }
}

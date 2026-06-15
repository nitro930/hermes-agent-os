import { db } from '@/lib/db';
import { createArtifactSchema, paginationSchema } from '@/lib/validations';
import { ZodError } from 'zod';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const type = searchParams.get('type');
    const agentId = searchParams.get('agentId');
    const status = searchParams.get('status');

    const { take, skip } = paginationSchema.parse({
      take: searchParams.get('take') ?? undefined,
      skip: searchParams.get('skip') ?? undefined,
    });

    const where: Record<string, unknown> = {};
    if (type && type !== 'all') where.type = type;
    if (agentId) where.agentId = agentId;
    if (status) where.status = status;

    const artifacts = await db.artifact.findMany({
      where,
      include: {
        agent: { select: { id: true, name: true, avatar: true } },
      },
      orderBy: { updatedAt: 'desc' },
      take,
      skip,
    });

    return NextResponse.json(artifacts);
  } catch (error) {
    if (error instanceof ZodError) {
      return NextResponse.json(
        { error: 'Validation failed', details: error.flatten().fieldErrors },
        { status: 400 }
      );
    }
    console.error('Failed to fetch artifacts:', error);
    return NextResponse.json({ error: 'Failed to fetch artifacts' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const data = createArtifactSchema.parse(body);

    const artifact = await db.artifact.create({
      data: {
        title: data.title,
        description: data.description ?? null,
        type: data.type,
        content: data.content,
        status: 'ready',
        agentId: data.agentId ?? null,
        taskId: data.taskId ?? null,
        tags: data.tags ?? null,
        isPublic: data.isPublic,
      },
      include: {
        agent: { select: { id: true, name: true, avatar: true } },
      },
    });

    // Log activity
    await db.activityLog.create({
      data: {
        agentId: data.agentId ?? null,
        agentName: data.agentId ? (await db.agent.findUnique({ where: { id: data.agentId } }))?.name : 'User',
        action: 'Artifact Created',
        details: `Created "${data.title}" (${data.type})`,
        type: 'success',
      },
    });

    return NextResponse.json(artifact, { status: 201 });
  } catch (error) {
    if (error instanceof ZodError) {
      return NextResponse.json(
        { error: 'Validation failed', details: error.flatten().fieldErrors },
        { status: 400 }
      );
    }
    console.error('Failed to create artifact:', error);
    return NextResponse.json({ error: 'Failed to create artifact' }, { status: 500 });
  }
}

import { db } from '@/lib/db';
import { NextRequest, NextResponse } from 'next/server';
import { createMemorySchema, paginationSchema } from '@/lib/validations';
import { ZodError } from 'zod';

export async function GET(request: NextRequest) {
  try {
    const { take, skip } = paginationSchema.parse(
      Object.fromEntries(request.nextUrl.searchParams)
    );
    const folder = request.nextUrl.searchParams.get('folder');
    const search = request.nextUrl.searchParams.get('search');
    const where: Record<string, unknown> = {};
    if (folder) where.folder = folder;
    if (search) {
      where.OR = [
        { title: { contains: search } },
        { content: { contains: search } },
        { tags: { contains: search } },
      ];
    }
    const memories = await db.memory.findMany({
      where,
      include: { agent: true },
      orderBy: [{ isPinned: 'desc' }, { updatedAt: 'desc' }],
      take,
      skip,
    });
    return NextResponse.json(memories);
  } catch (error) {
    if (error instanceof ZodError) {
      return NextResponse.json(
        { error: 'Validation failed', details: error.issues },
        { status: 400 }
      );
    }
    console.error('Failed to fetch memories:', error);
    return NextResponse.json({ error: 'Failed to fetch memories' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const validated = createMemorySchema.parse(body);

    const memory = await db.memory.create({
      data: {
        title: validated.title,
        content: validated.content,
        type: validated.type,
        tags: validated.tags ?? null,
        folder: validated.folder,
        agentId: validated.agentId ?? null,
        isPinned: validated.isPinned,
      },
      include: { agent: true },
    });

    await db.activityLog.create({
      data: {
        agentId: validated.agentId ?? null,
        agentName: 'System',
        action: 'Memory Created',
        details: `Memory "${memory.title}" created in ${memory.folder}`,
        type: 'success',
      },
    });

    return NextResponse.json(memory, { status: 201 });
  } catch (error) {
    if (error instanceof ZodError) {
      return NextResponse.json(
        { error: 'Validation failed', details: error.issues },
        { status: 400 }
      );
    }
    console.error('Failed to create memory:', error);
    return NextResponse.json({ error: 'Failed to create memory' }, { status: 500 });
  }
}

import { db } from '@/lib/db';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  try {
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
    });
    return NextResponse.json(memories);
  } catch (error) {
    console.error('Failed to fetch memories:', error);
    return NextResponse.json({ error: 'Failed to fetch memories' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const memory = await db.memory.create({
      data: {
        title: body.title,
        content: body.content || '',
        type: body.type || 'note',
        tags: body.tags || null,
        folder: body.folder || 'General',
        agentId: body.agentId || null,
        isPinned: body.isPinned || false,
      },
      include: { agent: true },
    });

    await db.activityLog.create({
      data: {
        agentId: body.agentId || null,
        agentName: 'System',
        action: 'Memory Created',
        details: `Memory "${memory.title}" created in ${memory.folder}`,
        type: 'success',
      },
    });

    return NextResponse.json(memory, { status: 201 });
  } catch (error) {
    console.error('Failed to create memory:', error);
    return NextResponse.json({ error: 'Failed to create memory' }, { status: 500 });
  }
}

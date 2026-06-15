import { db } from '@/lib/db';
import { NextRequest, NextResponse } from 'next/server';
import { createConversationSchema, paginationSchema } from '@/lib/validations';
import { ZodError } from 'zod';

export async function GET(request: NextRequest) {
  try {
    const { take, skip } = paginationSchema.parse(
      Object.fromEntries(request.nextUrl.searchParams)
    );
    const agentId = request.nextUrl.searchParams.get('agentId');
    const where = agentId ? { agentId } : {};
    const conversations = await db.conversation.findMany({
      where,
      include: { agent: true, messages: { orderBy: { createdAt: 'desc' }, take: 1 } },
      orderBy: { updatedAt: 'desc' },
      take,
      skip,
    });
    return NextResponse.json(conversations);
  } catch (error) {
    if (error instanceof ZodError) {
      return NextResponse.json(
        { error: 'Validation failed', details: error.issues },
        { status: 400 }
      );
    }
    console.error('Failed to fetch conversations:', error);
    return NextResponse.json({ error: 'Failed to fetch conversations' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const validated = createConversationSchema.parse(body);

    const conversation = await db.conversation.create({
      data: {
        title: validated.title,
        agentId: validated.agentId,
      },
      include: { agent: true },
    });
    return NextResponse.json(conversation, { status: 201 });
  } catch (error) {
    if (error instanceof ZodError) {
      return NextResponse.json(
        { error: 'Validation failed', details: error.issues },
        { status: 400 }
      );
    }
    console.error('Failed to create conversation:', error);
    return NextResponse.json({ error: 'Failed to create conversation' }, { status: 500 });
  }
}

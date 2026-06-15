import { db } from '@/lib/db';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    const agentId = request.nextUrl.searchParams.get('agentId');
    const where = agentId ? { agentId } : {};
    const conversations = await db.conversation.findMany({
      where,
      include: { agent: true, messages: { orderBy: { createdAt: 'desc' }, take: 1 } },
      orderBy: { updatedAt: 'desc' },
    });
    return NextResponse.json(conversations);
  } catch (error) {
    console.error('Failed to fetch conversations:', error);
    return NextResponse.json({ error: 'Failed to fetch conversations' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const conversation = await db.conversation.create({
      data: {
        title: body.title || 'New Conversation',
        agentId: body.agentId,
      },
      include: { agent: true },
    });
    return NextResponse.json(conversation, { status: 201 });
  } catch (error) {
    console.error('Failed to create conversation:', error);
    return NextResponse.json({ error: 'Failed to create conversation' }, { status: 500 });
  }
}

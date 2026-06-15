import { db } from '@/lib/db';
import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { agentId, message } = body;

    if (!agentId || !message) {
      return NextResponse.json({ error: 'agentId and message are required' }, { status: 400 });
    }

    const agent = await db.agent.findUnique({ where: { id: agentId } });
    if (!agent) {
      return NextResponse.json({ error: 'Agent not found' }, { status: 404 });
    }

    let conversationId = body.conversationId;
    let conversation;

    if (conversationId) {
      conversation = await db.conversation.findUnique({
        where: { id: conversationId },
        include: { messages: { orderBy: { createdAt: 'asc' } } },
      });
      if (!conversation) {
        return NextResponse.json({ error: 'Conversation not found' }, { status: 404 });
      }
    } else {
      conversation = await db.conversation.create({
        data: {
          title: message.slice(0, 50) + (message.length > 50 ? '...' : ''),
          agentId,
        },
        include: { messages: true },
      });
      conversationId = conversation.id;
    }

    await db.message.create({
      data: {
        conversationId,
        role: 'user',
        content: message,
      },
    });

    const previousMessages = (conversation.messages || []).map((m: { role: string; content: string }) => ({
      role: m.role as 'user' | 'assistant' | 'system',
      content: m.content,
    }));

    let assistantMessage: string;
    try {
      const ZAI = (await import('z-ai-web-dev-sdk')).default;
      const zai = await ZAI.create();
      const completion = await zai.chat.completions.create({
        messages: [
          { role: 'system', content: agent.systemPrompt || 'You are a helpful AI assistant.' },
          ...previousMessages,
          { role: 'user', content: message },
        ],
      });
      assistantMessage = completion.choices[0]?.message?.content || 'No response generated.';
    } catch {
      assistantMessage = `Hello! I'm ${agent.name}. I received your message but I'm currently operating in offline mode. How else can I help you?`;
    }

    const savedAssistantMessage = await db.message.create({
      data: {
        conversationId,
        role: 'assistant',
        content: assistantMessage,
      },
    });

    await db.agent.update({
      where: { id: agentId },
      data: { status: 'running' },
    });

    await db.activityLog.create({
      data: {
        agentId,
        agentName: agent.name,
        action: 'Chat Message',
        details: `User sent message to ${agent.name}`,
        type: 'info',
      },
    });

    return NextResponse.json({
      conversationId,
      message: savedAssistantMessage,
    });
  } catch (error) {
    console.error('Chat error:', error);
    return NextResponse.json({ error: 'Failed to process chat message' }, { status: 500 });
  }
}

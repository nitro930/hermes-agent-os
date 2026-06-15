import { db } from '@/lib/db';
import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { agentId, message } = body;

    if (!agentId || !message) {
      return NextResponse.json({ error: 'agentId and message are required' }, { status: 400 });
    }

    const agent = await db.agent.findUnique({
      where: { id: agentId },
      include: {
        memories: { take: 5, orderBy: { updatedAt: 'desc' }, where: { isPinned: true } },
        tasks: { where: { status: { not: 'done' } }, take: 3, orderBy: { priority: 'desc' } },
        goals: { where: { status: 'active' }, take: 3 },
      },
    });

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

    const previousMessages = (conversation.messages || []).slice(-10).map((m: { role: string; content: string }) => ({
      role: m.role as 'user' | 'assistant' | 'system',
      content: m.content,
    }));

    // Build enriched system prompt with agent context
    const memoryContext = agent.memories.length > 0
      ? `\n\n## Relevant Memories\n${agent.memories.map(m => `- **${m.title}**: ${m.content.slice(0, 200)}`).join('\n')}`
      : '';

    const taskContext = agent.tasks.length > 0
      ? `\n\n## Current Tasks\n${agent.tasks.map(t => `- "${t.title}" (${t.priority} priority, ${t.status})`).join('\n')}`
      : '';

    const goalContext = agent.goals.length > 0
      ? `\n\n## Active Goals\n${agent.goals.map(g => `- "${g.title}" (${g.progress}% complete)`).join('\n')}`
      : '';

    const enrichedSystemPrompt = (agent.systemPrompt || `You are ${agent.name}, a helpful AI assistant.`) +
      `\n\nYou are ${agent.name}, an AI agent in the Hermes Agent OS.` +
      memoryContext +
      taskContext +
      goalContext +
      `\n\nUse this context to provide informed, relevant responses. Reference your tasks, goals, and memories when relevant.`;

    let assistantMessage: string;
    try {
      const ZAI = (await import('z-ai-web-dev-sdk')).default;
      const zai = await ZAI.create();
      const completion = await zai.chat.completions.create({
        messages: [
          { role: 'system', content: enrichedSystemPrompt },
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

    // Set agent to running during chat, then auto-return to idle after delay
    await db.agent.update({
      where: { id: agentId },
      data: { status: 'running' },
    });

    // Auto-return agent to idle after 30 seconds of inactivity
    setTimeout(async () => {
      try {
        const currentAgent = await db.agent.findUnique({ where: { id: agentId } });
        if (currentAgent?.status === 'running') {
          await db.agent.update({ where: { id: agentId }, data: { status: 'idle' } });
        }
      } catch {}
    }, 30000);

    await db.activityLog.create({
      data: {
        agentId,
        agentName: agent.name,
        action: 'Chat Message',
        details: `User sent message to ${agent.name}`,
        type: 'info',
      },
    });

    // Check if the user is requesting a task-related action
    const lowerMessage = message.toLowerCase();
    if (lowerMessage.includes('create task') || lowerMessage.includes('add task') || lowerMessage.includes('new task')) {
      try {
        const taskTitle = message.replace(/create task|add task|new task/gi, '').trim().replace(/^[:\-]\s*/, '') || 'New task from chat';
        await db.task.create({
          data: {
            title: taskTitle.slice(0, 200),
            description: `Created via chat with ${agent.name}`,
            status: 'todo',
            priority: 'medium',
            column: 'todo',
            order: await db.task.count({ where: { column: 'todo' } }),
            agentId,
            tags: 'chat-created',
          },
        });
        await db.activityLog.create({
          data: {
            agentId,
            agentName: agent.name,
            action: 'Task Created',
            details: `Task "${taskTitle.slice(0, 50)}" created via chat`,
            type: 'success',
          },
        });
      } catch {}
    }

    return NextResponse.json({
      conversationId,
      message: savedAssistantMessage,
    });
  } catch (error) {
    console.error('Chat error:', error);
    return NextResponse.json({ error: 'Failed to process chat message' }, { status: 500 });
  }
}

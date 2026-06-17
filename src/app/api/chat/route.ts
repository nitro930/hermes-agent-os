import { db } from '@/lib/db';
import { chatSchema } from '@/lib/validations';
import { NextRequest, NextResponse } from 'next/server';
import { ZodError } from 'zod';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const validated = chatSchema.parse(body);

    const { agentId, message, conversationId: bodyConversationId } = validated;

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

    let conversationId: string = bodyConversationId || '';
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
        conversationId: conversationId!,
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
      // If the agent has a non-default model set, route through OpenRouter.
      // Otherwise fall back to the bundled ZAI SDK.
      if (agent.model && agent.model !== 'default') {
        const { getOpenRouterApiKey } = await import('@/lib/openrouter');
        const apiKey = await getOpenRouterApiKey();
        if (!apiKey) {
          throw new Error('OpenRouter API key not configured for agent model');
        }
        const orRes = await fetch('https://openrouter.ai/api/v1/chat/completions', {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${apiKey}`,
            'Content-Type': 'application/json',
            'HTTP-Referer': 'https://hermes-agent-os.local',
            'X-Title': 'Hermes Agent OS',
          },
          body: JSON.stringify({
            model: agent.model,
            messages: [
              { role: 'system', content: enrichedSystemPrompt },
              ...previousMessages,
              { role: 'user', content: message },
            ],
          }),
        });
        if (!orRes.ok) {
          throw new Error(`OpenRouter ${orRes.status}: ${await orRes.text()}`);
        }
        const orData = await orRes.json();
        assistantMessage = orData.choices?.[0]?.message?.content || 'No response generated.';
      } else {
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
      }
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

    // Check if the assistant's response contains code that should be saved as an artifact
    if (lowerMessage.includes('build') || lowerMessage.includes('create a page') || lowerMessage.includes('make a website') ||
        lowerMessage.includes('write code') || lowerMessage.includes('generate html') || lowerMessage.includes('create a component') ||
        lowerMessage.includes('build me') || lowerMessage.includes('make me')) {
      // Check if assistant responded with code-like content
      const codeBlockMatch = assistantMessage.match(/```(?:html|jsx|react|css|json|javascript|typescript)?\s*\n([\s\S]*?)```/i);
      if (codeBlockMatch) {
        const codeContent = codeBlockMatch[1].trim();
        let artifactType = 'code';
        if (codeContent.toLowerCase().includes('<!doctype') || codeContent.toLowerCase().includes('<html') || codeContent.toLowerCase().includes('<div')) artifactType = 'html';
        else if (codeContent.includes('React') || codeContent.includes('jsx') || codeContent.includes('useState')) artifactType = 'react';
        else if (codeContent.trim().startsWith('{') || codeContent.trim().startsWith('[')) artifactType = 'json';
        else if (codeContent.includes('{') && codeContent.includes(';') && !codeContent.includes('<')) artifactType = 'css';

        try {
          await db.artifact.create({
            data: {
              title: `Chat Artifact: ${message.slice(0, 50)}`,
              description: `Generated by ${agent.name} from chat conversation`,
              type: artifactType,
              content: codeContent,
              status: 'ready',
              agentId,
              tags: 'chat-generated,auto-created',
            },
          });
          await db.activityLog.create({
            data: {
              agentId,
              agentName: agent.name,
              action: 'Artifact Created',
              details: `Code artifact created from chat — view in Dev Server`,
              type: 'success',
            },
          });
        } catch {}
      }
    }

    return NextResponse.json({
      conversationId,
      message: savedAssistantMessage,
    });
  } catch (error) {
    if (error instanceof ZodError) {
      return NextResponse.json(
        { error: 'Validation failed', details: error.flatten().fieldErrors },
        { status: 400 },
      );
    }
    console.error('Chat error:', error);
    return NextResponse.json({ error: 'Failed to process chat message' }, { status: 500 });
  }
}

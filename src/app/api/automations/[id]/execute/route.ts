import { db } from '@/lib/db';
import { NextRequest, NextResponse } from 'next/server';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const automation = await db.automation.findUnique({ where: { id } });

    if (!automation) {
      return NextResponse.json({ error: 'Automation not found' }, { status: 404 });
    }

    if (!automation.isActive) {
      return NextResponse.json({ error: 'Automation is not active' }, { status: 400 });
    }

    const config = JSON.parse(automation.config || '{}');
    let result: Record<string, unknown> = { trigger: automation.trigger, action: automation.action };

    // Execute based on action type
    switch (automation.action) {
      case 'create_task': {
        const task = await db.task.create({
          data: {
            title: config.taskTitle || `Auto-task: ${automation.name}`,
            description: config.taskDescription || `Created by automation: ${automation.name}`,
            status: 'todo',
            priority: config.priority || 'medium',
            column: 'todo',
            order: await db.task.count({ where: { column: 'todo' } }),
            tags: config.tags || 'automated',
            agentId: config.agentId || null,
          },
        });
        result.createdTask = task;
        break;
      }
      case 'send_message': {
        if (config.agentId) {
          const agent = await db.agent.findUnique({ where: { id: config.agentId } });
          if (agent) {
            const conversation = await db.conversation.create({
              data: {
                title: `Automation: ${automation.name}`,
                agentId: agent.id,
              },
            });
            await db.message.create({
              data: {
                conversationId: conversation.id,
                role: 'system',
                content: config.message || `Automated message from ${automation.name}`,
              },
            });
            result.conversationId = conversation.id;
          }
        }
        break;
      }
      case 'run_agent': {
        if (config.agentId) {
          const agent = await db.agent.findUnique({ where: { id: config.agentId } });
          if (agent) {
            await db.agent.update({ where: { id: agent.id }, data: { status: 'running' } });
            
            let aiResponse: string;
            try {
              const ZAI = (await import('z-ai-web-dev-sdk')).default;
              const zai = await ZAI.create();
              const completion = await zai.chat.completions.create({
                messages: [
                  { role: 'system', content: agent.systemPrompt || 'You are a helpful assistant.' },
                  { role: 'user', content: config.prompt || 'Execute your current tasks and report status.' },
                ],
              });
              aiResponse = completion.choices[0]?.message?.content || 'Agent executed successfully.';
            } catch {
              aiResponse = `${agent.name} was activated by automation "${automation.name}".`;
            }

            await db.memory.create({
              data: {
                title: `Auto-run: ${agent.name}`,
                content: aiResponse,
                type: 'log',
                folder: 'General',
                agentId: agent.id,
                tags: 'automated,auto-run',
              },
            });
            result.agentResponse = aiResponse;
          }
        }
        break;
      }
      case 'notify': {
        // Log notification as activity
        await db.activityLog.create({
          data: {
            action: 'Automation Notification',
            details: config.notificationMessage || `Automation "${automation.name}" triggered a notification`,
            type: 'info',
            agentName: 'System',
          },
        });
        result.notification = config.notificationMessage || 'Notification sent';
        break;
      }
    }

    // Update last run time
    await db.automation.update({
      where: { id },
      data: { lastRunAt: new Date() },
    });

    // Log activity
    await db.activityLog.create({
      data: {
        action: 'Automation Executed',
        details: `"${automation.name}" executed: ${automation.trigger} → ${automation.action}`,
        type: 'success',
        agentName: 'System',
      },
    });

    return NextResponse.json({
      success: true,
      automationId: id,
      automationName: automation.name,
      result,
      executedAt: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Automation execute error:', error);
    return NextResponse.json({ error: 'Failed to execute automation' }, { status: 500 });
  }
}

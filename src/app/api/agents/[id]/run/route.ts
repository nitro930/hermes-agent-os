import { db } from '@/lib/db';
import { NextRequest, NextResponse } from 'next/server';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const agent = await db.agent.findUnique({
      where: { id },
      include: {
        tasks: { where: { status: { not: 'done' } }, orderBy: { priority: 'desc' }, take: 5 },
        goals: { where: { status: 'active' } },
        memories: { take: 10, orderBy: { updatedAt: 'desc' } },
      },
    });

    if (!agent) {
      return NextResponse.json({ error: 'Agent not found' }, { status: 404 });
    }

    // Set agent to running
    await db.agent.update({ where: { id }, data: { status: 'running' } });

    const taskSummaries = agent.tasks.map(t => `- "${t.title}" (Priority: ${t.priority}, Status: ${t.status})`).join('\n');
    const goalSummaries = agent.goals.map(g => `- "${g.title}" (Progress: ${g.progress}%)`).join('\n');
    const memoryContext = agent.memories.map(m => `- ${m.title}: ${m.content.slice(0, 100)}`).join('\n');

    // Use AI to plan task execution
    let executionPlan: string;
    try {
      const ZAI = (await import('z-ai-web-dev-sdk')).default;
      const zai = await ZAI.create();
      const completion = await zai.chat.completions.create({
        messages: [
          {
            role: 'system',
            content: agent.systemPrompt || `You are ${agent.name}, an AI agent. You analyze tasks and create execution plans. Be concise and actionable.`
          },
          {
            role: 'user',
            content: `I'm starting you up. Here's your current state:\n\nPending Tasks:\n${taskSummaries || 'No pending tasks'}\n\nActive Goals:\n${goalSummaries || 'No active goals'}\n\nRelevant Memory:\n${memoryContext || 'No relevant memories'}\n\nPlease provide a brief execution plan: which task to tackle first and what steps you'll take. Keep it under 200 words.`
          }
        ],
      });
      executionPlan = completion.choices[0]?.message?.content || 'No execution plan generated.';
    } catch {
      executionPlan = `I'm ${agent.name}. I've reviewed my tasks and I'm ready to work. I'll prioritize the highest-priority items first and report back with progress.`;
    }

    // Process the highest-priority task
    let taskResult = null;
    if (agent.tasks.length > 0) {
      const topTask = agent.tasks[0];
      
      // Move task to in-progress
      await db.task.update({
        where: { id: topTask.id },
        data: { status: 'in-progress', column: 'in-progress' },
      });

      let taskOutput: string;
      try {
        const ZAI = (await import('z-ai-web-dev-sdk')).default;
        const zai = await ZAI.create();
        const completion = await zai.chat.completions.create({
          messages: [
            {
              role: 'system',
              content: agent.systemPrompt || `You are ${agent.name}. Execute the given task and provide a result. Be thorough but concise.`
            },
            {
              role: 'user',
              content: `Execute this task: "${topTask.title}"\n\nDescription: ${topTask.description || 'No description'}\n\nProvide your work output.`
            }
          ],
        });
        taskOutput = completion.choices[0]?.message?.content || 'Task processing complete.';
      } catch {
        taskOutput = `Task "${topTask.title}" has been acknowledged. I'll work on this and update with results.`;
      }

      // Save result as a memory entry
      await db.memory.create({
        data: {
          title: `Task Result: ${topTask.title}`,
          content: taskOutput,
          type: 'log',
          folder: 'General',
          agentId: agent.id,
          tags: 'task-result,auto-generated',
        },
      });

      taskResult = { taskId: topTask.id, taskTitle: topTask.title, output: taskOutput };
    }

    // Log activity
    await db.activityLog.create({
      data: {
        agentId: agent.id,
        agentName: agent.name,
        action: 'Agent Started',
        details: `${agent.name} began execution with ${agent.tasks.length} pending tasks`,
        type: 'success',
      },
    });

    return NextResponse.json({
      agentId: agent.id,
      agentName: agent.name,
      status: 'running',
      executionPlan,
      taskResult,
      pendingTasks: agent.tasks.length,
      activeGoals: agent.goals.length,
    });
  } catch (error) {
    console.error('Agent run error:', error);
    return NextResponse.json({ error: 'Failed to run agent' }, { status: 500 });
  }
}

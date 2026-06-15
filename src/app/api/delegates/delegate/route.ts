import { db } from '@/lib/db';
import { delegateTaskSchema } from '@/lib/validations';
import { ZodError } from 'zod';
import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const data = delegateTaskSchema.parse(body);
    const parentAgentId = data.fromAgentId;
    const targetAgentId = data.toAgentId;

    const parentAgent = await db.agent.findUnique({ where: { id: parentAgentId } });
    const targetAgent = await db.agent.findUnique({ where: { id: targetAgentId } });

    if (!parentAgent || !targetAgent) {
      return NextResponse.json({ error: 'One or both agents not found' }, { status: 404 });
    }

    // Create the delegate
    const delegate = await db.delegate.create({
      data: {
        name: `Delegation: ${data.task.slice(0, 50)}`,
        description: `Delegated by ${parentAgent.name} to ${targetAgent.name}`,
        status: 'running',
        task: data.task,
        parentAgentId,
      },
    });

    // Create a task assigned to the target agent
    const newTask = await db.task.create({
      data: {
        title: `[From ${parentAgent.name}] ${data.task}`,
        description: `Delegated task from ${parentAgent.name}`,
        status: 'todo',
        priority: 'medium',
        column: 'todo',
        order: await db.task.count({ where: { column: 'todo' } }),
        agentId: targetAgentId,
        tags: 'delegated',
      },
    });

    // Set target agent to running
    await db.agent.update({
      where: { id: targetAgentId },
      data: { status: 'running' },
    });

    // Auto-return to idle after 60 seconds
    setTimeout(async () => {
      try {
        const current = await db.agent.findUnique({ where: { id: targetAgentId } });
        if (current?.status === 'running') {
          await db.agent.update({ where: { id: targetAgentId }, data: { status: 'idle' } });
          await db.delegate.update({ where: { id: delegate.id }, data: { status: 'completed', result: 'Task delegated and agent returned to idle' } });
        }
      } catch {}
    }, 60000);

    // Log activity
    await db.activityLog.create({
      data: {
        agentId: targetAgentId,
        agentName: targetAgent.name,
        action: 'Task Delegated',
        details: `${parentAgent.name} delegated "${data.task}" to ${targetAgent.name}`,
        type: 'info',
      },
    });

    return NextResponse.json({
      delegate,
      task: newTask,
      message: `${parentAgent.name} delegated task to ${targetAgent.name}`,
    });
  } catch (error) {
    if (error instanceof ZodError) {
      return NextResponse.json(
        { error: 'Validation failed', details: error.flatten().fieldErrors },
        { status: 400 }
      );
    }
    console.error('Delegation error:', error);
    return NextResponse.json({ error: 'Failed to delegate task' }, { status: 500 });
  }
}

import { db } from '@/lib/db';
import { idSchema, updateAgentSchema } from '@/lib/validations';
import { NextRequest, NextResponse } from 'next/server';
import { ZodError } from 'zod';

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const paramValidation = idSchema.safeParse({ id });
    if (!paramValidation.success) {
      return NextResponse.json(
        { error: 'Invalid agent ID', details: paramValidation.error.flatten().fieldErrors },
        { status: 400 },
      );
    }

    const agent = await db.agent.findUnique({
      where: { id },
      include: {
        team: true,
        tasks: true,
        memories: true,
        conversations: true,
        skills: true,
        goals: true,
        delegates: true,
      },
    });
    if (!agent) {
      return NextResponse.json({ error: 'Agent not found' }, { status: 404 });
    }
    return NextResponse.json(agent);
  } catch (error) {
    console.error('Failed to fetch agent:', error);
    return NextResponse.json({ error: 'Failed to fetch agent' }, { status: 500 });
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const paramValidation = idSchema.safeParse({ id });
    if (!paramValidation.success) {
      return NextResponse.json(
        { error: 'Invalid agent ID', details: paramValidation.error.flatten().fieldErrors },
        { status: 400 },
      );
    }

    const body = await request.json();
    const validated = updateAgentSchema.parse(body);

    // Build update data only from whitelisted fields present in validated schema
    const updateData: Record<string, unknown> = {};
    if (validated.name !== undefined) updateData.name = validated.name;
    if (validated.description !== undefined) updateData.description = validated.description;
    if (validated.type !== undefined) updateData.type = validated.type;
    if (validated.avatar !== undefined) updateData.avatar = validated.avatar;
    if (validated.status !== undefined) updateData.status = validated.status;
    if (validated.systemPrompt !== undefined) updateData.systemPrompt = validated.systemPrompt;
    if (validated.soulMd !== undefined) updateData.soulMd = validated.soulMd;
    if (validated.model !== undefined) updateData.model = validated.model;
    if (validated.teamId !== undefined) updateData.teamId = validated.teamId;

    const agent = await db.agent.update({
      where: { id },
      data: updateData,
      include: { team: true },
    });

    if (validated.status) {
      await db.activityLog.create({
        data: {
          agentId: agent.id,
          agentName: agent.name,
          action: 'Status Changed',
          details: `Agent "${agent.name}" status changed to ${agent.status}`,
          type: agent.status === 'running' ? 'success' : agent.status === 'error' ? 'error' : 'info',
        },
      });
    }

    if (validated.soulMd !== undefined) {
      await db.activityLog.create({
        data: {
          agentId: agent.id,
          agentName: agent.name,
          action: 'SOUL.md Updated',
          details: `Agent "${agent.name}" personality configuration was updated`,
          type: 'info',
        },
      });
    }

    return NextResponse.json(agent);
  } catch (error) {
    if (error instanceof ZodError) {
      return NextResponse.json(
        { error: 'Validation failed', details: error.flatten().fieldErrors },
        { status: 400 },
      );
    }
    console.error('Failed to update agent:', error);
    return NextResponse.json({ error: 'Failed to update agent' }, { status: 500 });
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const paramValidation = idSchema.safeParse({ id });
    if (!paramValidation.success) {
      return NextResponse.json(
        { error: 'Invalid agent ID', details: paramValidation.error.flatten().fieldErrors },
        { status: 400 },
      );
    }

    const agent = await db.agent.delete({ where: { id } });
    await db.activityLog.create({
      data: {
        agentId: id,
        agentName: agent.name,
        action: 'Agent Deleted',
        details: `Agent "${agent.name}" was deleted`,
        type: 'warning',
      },
    });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Failed to delete agent:', error);
    return NextResponse.json({ error: 'Failed to delete agent' }, { status: 500 });
  }
}

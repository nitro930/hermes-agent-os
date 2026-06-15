import { db } from '@/lib/db';
import { updateMcpSchema } from '@/lib/validations';
import { ZodError } from 'zod';
import { NextRequest, NextResponse } from 'next/server';

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const data = updateMcpSchema.parse(body);

    const server = await db.mcpServer.update({
      where: { id },
      data,
    });
    return NextResponse.json(server);
  } catch (error) {
    if (error instanceof ZodError) {
      return NextResponse.json(
        { error: 'Validation failed', details: error.flatten().fieldErrors },
        { status: 400 }
      );
    }
    console.error('Failed to update MCP server:', error);
    return NextResponse.json({ error: 'Failed to update MCP server' }, { status: 500 });
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const server = await db.mcpServer.delete({ where: { id } });
    await db.activityLog.create({
      data: {
        agentName: 'System',
        action: 'MCP Server Removed',
        details: `MCP server "${server.name}" was removed`,
        type: 'warning',
      },
    });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Failed to delete MCP server:', error);
    return NextResponse.json({ error: 'Failed to delete MCP server' }, { status: 500 });
  }
}

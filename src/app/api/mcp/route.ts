import { db } from '@/lib/db';
import { NextResponse } from 'next/server';

export async function GET() {
  try {
    const servers = await db.mcpServer.findMany({
      orderBy: { createdAt: 'desc' },
    });
    return NextResponse.json(servers);
  } catch (error) {
    console.error('Failed to fetch MCP servers:', error);
    return NextResponse.json({ error: 'Failed to fetch MCP servers' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const server = await db.mcpServer.create({
      data: {
        name: body.name,
        description: body.description || null,
        url: body.url,
        status: body.status || 'disconnected',
        toolsCount: body.toolsCount || 0,
      },
    });

    await db.activityLog.create({
      data: {
        agentName: 'System',
        action: 'MCP Server Added',
        details: `MCP server "${server.name}" added at ${server.url}`,
        type: 'success',
      },
    });

    return NextResponse.json(server, { status: 201 });
  } catch (error) {
    console.error('Failed to create MCP server:', error);
    return NextResponse.json({ error: 'Failed to create MCP server' }, { status: 500 });
  }
}

import { db } from '@/lib/db';
import { createMcpSchema, paginationSchema } from '@/lib/validations';
import { ZodError } from 'zod';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const { take, skip } = paginationSchema.parse({
      take: searchParams.get('take') ?? undefined,
      skip: searchParams.get('skip') ?? undefined,
    });

    const servers = await db.mcpServer.findMany({
      orderBy: { createdAt: 'desc' },
      take,
      skip,
    });
    return NextResponse.json(servers);
  } catch (error) {
    if (error instanceof ZodError) {
      return NextResponse.json(
        { error: 'Validation failed', details: error.flatten().fieldErrors },
        { status: 400 }
      );
    }
    console.error('Failed to fetch MCP servers:', error);
    return NextResponse.json({ error: 'Failed to fetch MCP servers' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const data = createMcpSchema.parse(body);

    const server = await db.mcpServer.create({
      data: {
        name: data.name,
        description: data.description ?? null,
        url: data.url,
        status: 'disconnected',
        toolsCount: data.toolsCount,
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
    if (error instanceof ZodError) {
      return NextResponse.json(
        { error: 'Validation failed', details: error.flatten().fieldErrors },
        { status: 400 }
      );
    }
    console.error('Failed to create MCP server:', error);
    return NextResponse.json({ error: 'Failed to create MCP server' }, { status: 500 });
  }
}

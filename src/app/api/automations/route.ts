import { db } from '@/lib/db';
import { createAutomationSchema, paginationSchema } from '@/lib/validations';
import { ZodError } from 'zod';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const { take, skip } = paginationSchema.parse({
      take: searchParams.get('take') ?? undefined,
      skip: searchParams.get('skip') ?? undefined,
    });

    const automations = await db.automation.findMany({
      orderBy: { createdAt: 'desc' },
      take,
      skip,
    });
    return NextResponse.json(automations);
  } catch (error) {
    if (error instanceof ZodError) {
      return NextResponse.json(
        { error: 'Validation failed', details: error.flatten().fieldErrors },
        { status: 400 }
      );
    }
    console.error('Failed to fetch automations:', error);
    return NextResponse.json({ error: 'Failed to fetch automations' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const data = createAutomationSchema.parse(body);

    const automation = await db.automation.create({
      data: {
        name: data.name,
        description: data.description ?? null,
        trigger: data.trigger,
        action: data.action,
        config: data.config,
        isActive: data.isActive,
      },
    });

    await db.activityLog.create({
      data: {
        agentName: 'System',
        action: 'Automation Created',
        details: `Automation "${automation.name}" created`,
        type: 'success',
      },
    });

    return NextResponse.json(automation, { status: 201 });
  } catch (error) {
    if (error instanceof ZodError) {
      return NextResponse.json(
        { error: 'Validation failed', details: error.flatten().fieldErrors },
        { status: 400 }
      );
    }
    console.error('Failed to create automation:', error);
    return NextResponse.json({ error: 'Failed to create automation' }, { status: 500 });
  }
}

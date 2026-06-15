import { db } from '@/lib/db';
import { NextRequest, NextResponse } from 'next/server';

export async function GET() {
  try {
    const automations = await db.automation.findMany({
      orderBy: { createdAt: 'desc' },
    });
    return NextResponse.json(automations);
  } catch (error) {
    console.error('Failed to fetch automations:', error);
    return NextResponse.json({ error: 'Failed to fetch automations' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const automation = await db.automation.create({
      data: {
        name: body.name,
        description: body.description || null,
        trigger: body.trigger,
        action: body.action,
        config: typeof body.config === 'string' ? body.config : JSON.stringify(body.config || {}),
        isActive: body.isActive ?? true,
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
    console.error('Failed to create automation:', error);
    return NextResponse.json({ error: 'Failed to create automation' }, { status: 500 });
  }
}

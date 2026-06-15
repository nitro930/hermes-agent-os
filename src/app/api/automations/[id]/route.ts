import { db } from '@/lib/db';
import { NextRequest, NextResponse } from 'next/server';

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    if (body.config && typeof body.config !== 'string') {
      body.config = JSON.stringify(body.config);
    }
    const automation = await db.automation.update({
      where: { id },
      data: body,
    });
    return NextResponse.json(automation);
  } catch (error) {
    console.error('Failed to update automation:', error);
    return NextResponse.json({ error: 'Failed to update automation' }, { status: 500 });
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    await db.automation.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Failed to delete automation:', error);
    return NextResponse.json({ error: 'Failed to delete automation' }, { status: 500 });
  }
}

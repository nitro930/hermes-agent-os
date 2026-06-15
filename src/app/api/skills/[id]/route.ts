import { db } from '@/lib/db';
import { NextRequest, NextResponse } from 'next/server';

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const skill = await db.skill.update({
      where: { id },
      data: body,
      include: { agent: { select: { id: true, name: true, avatar: true } } },
    });
    return NextResponse.json(skill);
  } catch (error) {
    console.error('Failed to update skill:', error);
    return NextResponse.json({ error: 'Failed to update skill' }, { status: 500 });
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const skill = await db.skill.delete({ where: { id } });
    await db.activityLog.create({
      data: {
        agentName: 'System',
        action: 'Skill Deleted',
        details: `Skill "${skill.name}" was deleted`,
        type: 'warning',
      },
    });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Failed to delete skill:', error);
    return NextResponse.json({ error: 'Failed to delete skill' }, { status: 500 });
  }
}

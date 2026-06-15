import { db } from '@/lib/db';
import { updateDelegateSchema } from '@/lib/validations';
import { ZodError } from 'zod';
import { NextRequest, NextResponse } from 'next/server';

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const data = updateDelegateSchema.parse(body);

    const delegate = await db.delegate.update({
      where: { id },
      data,
      include: { parentAgent: { select: { id: true, name: true, avatar: true } } },
    });
    return NextResponse.json(delegate);
  } catch (error) {
    if (error instanceof ZodError) {
      return NextResponse.json(
        { error: 'Validation failed', details: error.flatten().fieldErrors },
        { status: 400 }
      );
    }
    console.error('Failed to update delegate:', error);
    return NextResponse.json({ error: 'Failed to update delegate' }, { status: 500 });
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    await db.delegate.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Failed to delete delegate:', error);
    return NextResponse.json({ error: 'Failed to delete delegate' }, { status: 500 });
  }
}

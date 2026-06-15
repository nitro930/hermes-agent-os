import { db } from '@/lib/db';
import { updateArtifactSchema } from '@/lib/validations';
import { ZodError } from 'zod';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const artifact = await db.artifact.findUnique({
      where: { id },
      include: {
        agent: { select: { id: true, name: true, avatar: true } },
      },
    });

    if (!artifact) {
      return NextResponse.json({ error: 'Artifact not found' }, { status: 404 });
    }

    return NextResponse.json(artifact);
  } catch (error) {
    console.error('Failed to fetch artifact:', error);
    return NextResponse.json({ error: 'Failed to fetch artifact' }, { status: 500 });
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const data = updateArtifactSchema.parse(body);

    // If content changed, auto-increment version and create version snapshot
    let newVersion: number | undefined;
    if (data.content) {
      const existing = await db.artifact.findUnique({ where: { id } });
      if (existing && existing.content !== data.content) {
        newVersion = (existing.version || 1) + 1;

        // Create version snapshot of the old content before updating
        const existingVersion = await db.artifactVersion.findUnique({
          where: { artifactId_version: { artifactId: id, version: existing.version } },
        });
        if (!existingVersion) {
          await db.artifactVersion.create({
            data: {
              artifactId: id,
              version: existing.version,
              content: existing.content,
              title: existing.title,
              type: existing.type,
              changeNote: 'Auto-snapshot before update',
            },
          });
        }
      }
    }

    const updateData: Record<string, unknown> = { ...data };
    if (newVersion !== undefined) {
      updateData.version = newVersion;
    }

    const artifact = await db.artifact.update({
      where: { id },
      data: updateData,
      include: {
        agent: { select: { id: true, name: true, avatar: true } },
      },
    });

    return NextResponse.json(artifact);
  } catch (error) {
    if (error instanceof ZodError) {
      return NextResponse.json(
        { error: 'Validation failed', details: error.flatten().fieldErrors },
        { status: 400 }
      );
    }
    console.error('Failed to update artifact:', error);
    return NextResponse.json({ error: 'Failed to update artifact' }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    await db.artifact.delete({ where: { id } });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Failed to delete artifact:', error);
    return NextResponse.json({ error: 'Failed to delete artifact' }, { status: 500 });
  }
}

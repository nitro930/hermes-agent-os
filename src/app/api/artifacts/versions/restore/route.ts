import { db } from '@/lib/db';
import { restoreVersionSchema } from '@/lib/validations';
import { ZodError } from 'zod';
import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

/**
 * POST /api/artifacts/versions/restore
 * Restore an artifact to a specific version
 * Body: { artifactId, version }
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const data = restoreVersionSchema.parse(body);

    const versionSnapshot = await db.artifactVersion.findUnique({
      where: { artifactId_version: { artifactId: data.artifactId, version: data.version } },
    });

    if (!versionSnapshot) {
      return NextResponse.json({ error: 'Version not found' }, { status: 404 });
    }

    const artifact = await db.artifact.findUnique({ where: { id: data.artifactId } });
    if (!artifact) {
      return NextResponse.json({ error: 'Artifact not found' }, { status: 404 });
    }

    // Save current state as a version before restoring
    const currentVersionExists = await db.artifactVersion.findUnique({
      where: { artifactId_version: { artifactId: data.artifactId, version: artifact.version } },
    });
    if (!currentVersionExists) {
      await db.artifactVersion.create({
        data: {
          artifactId: data.artifactId,
          version: artifact.version,
          content: artifact.content,
          title: artifact.title,
          type: artifact.type,
          changeNote: `Auto-snapshot before restoring v${data.version}`,
        },
      });
    }

    // Restore: update artifact with version snapshot content, bump version
    const newVersion = artifact.version + 1;
    const updated = await db.artifact.update({
      where: { id: data.artifactId },
      data: {
        content: versionSnapshot.content,
        title: versionSnapshot.title,
        type: versionSnapshot.type,
        version: newVersion,
        status: 'ready',
      },
      include: {
        agent: { select: { id: true, name: true, avatar: true } },
      },
    });

    // Create version entry for the restore
    await db.artifactVersion.create({
      data: {
        artifactId: data.artifactId,
        version: newVersion,
        content: versionSnapshot.content,
        title: versionSnapshot.title,
        type: versionSnapshot.type,
        changeNote: `Restored from v${data.version}`,
      },
    });

    // Log activity
    await db.activityLog.create({
      data: {
        agentId: artifact.agentId,
        agentName: artifact.agentId
          ? (await db.agent.findUnique({ where: { id: artifact.agentId } }))?.name
          : 'User',
        action: 'Artifact Restored',
        details: `Restored "${artifact.title}" to v${data.version} (now v${newVersion})`,
        type: 'info',
      },
    });

    return NextResponse.json(updated);
  } catch (error) {
    if (error instanceof ZodError) {
      return NextResponse.json(
        { error: 'Validation failed', details: error.flatten().fieldErrors },
        { status: 400 }
      );
    }
    console.error('Failed to restore artifact version:', error);
    return NextResponse.json({ error: 'Failed to restore version' }, { status: 500 });
  }
}

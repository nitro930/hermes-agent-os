import { db } from '@/lib/db';
import { paginationSchema } from '@/lib/validations';
import { ZodError } from 'zod';
import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

/**
 * GET /api/artifacts/versions?artifactId=xxx
 * List all versions of an artifact
 */
export async function GET(request: NextRequest) {
  try {
    const artifactId = request.nextUrl.searchParams.get('artifactId');
    if (!artifactId) {
      return NextResponse.json({ error: 'artifactId is required' }, { status: 400 });
    }

    const { take, skip } = paginationSchema.parse({
      take: request.nextUrl.searchParams.get('take') ?? undefined,
      skip: request.nextUrl.searchParams.get('skip') ?? undefined,
    });

    const versions = await db.artifactVersion.findMany({
      where: { artifactId },
      orderBy: { version: 'desc' },
      take,
      skip,
    });

    return NextResponse.json(versions);
  } catch (error) {
    if (error instanceof ZodError) {
      return NextResponse.json(
        { error: 'Validation failed', details: error.flatten().fieldErrors },
        { status: 400 }
      );
    }
    console.error('Failed to fetch artifact versions:', error);
    return NextResponse.json({ error: 'Failed to fetch versions' }, { status: 500 });
  }
}

/**
 * POST /api/artifacts/versions
 * Create a version snapshot (called automatically when content changes)
 * Body: { artifactId, changeNote? }
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { artifactId, changeNote } = body;

    if (!artifactId) {
      return NextResponse.json({ error: 'artifactId is required' }, { status: 400 });
    }

    const artifact = await db.artifact.findUnique({ where: { id: artifactId } });
    if (!artifact) {
      return NextResponse.json({ error: 'Artifact not found' }, { status: 404 });
    }

    // Check if version already exists
    const existing = await db.artifactVersion.findUnique({
      where: { artifactId_version: { artifactId, version: artifact.version } },
    });

    if (existing) {
      return NextResponse.json(existing);
    }

    const version = await db.artifactVersion.create({
      data: {
        artifactId,
        version: artifact.version,
        content: artifact.content,
        title: artifact.title,
        type: artifact.type,
        changeNote: changeNote || null,
      },
    });

    return NextResponse.json(version, { status: 201 });
  } catch (error) {
    console.error('Failed to create artifact version:', error);
    return NextResponse.json({ error: 'Failed to create version' }, { status: 500 });
  }
}

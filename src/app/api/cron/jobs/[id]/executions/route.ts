import { db } from '@/lib/db';
import { paginationSchema } from '@/lib/validations';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const { searchParams } = new URL(request.url);
    const { take, skip } = paginationSchema.parse({
      take: searchParams.get('take') ?? '50',
      skip: searchParams.get('skip') ?? '0',
    });

    const statusFilter = searchParams.get('status');

    const where: Record<string, unknown> = { cronJobId: id };
    if (statusFilter) where.status = statusFilter;

    const executions = await db.cronExecution.findMany({
      where,
      orderBy: { startedAt: 'desc' },
      take,
      skip,
    });

    const total = await db.cronExecution.count({ where });

    return NextResponse.json({ executions, total });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to fetch executions' }, { status: 500 });
  }
}

import { db } from '@/lib/db';
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const activities = await db.activityLog.findMany({
      take: 20,
      orderBy: { createdAt: 'desc' },
    });

    // SSE stream
    const encoder = new TextEncoder();
    const stream = new ReadableStream({
      async start(controller) {
        // Send initial data
        const data = JSON.stringify({ type: 'init', activities });
        controller.enqueue(encoder.encode(`data: ${data}\n\n`));

        // Keep connection alive with periodic updates
        const interval = setInterval(async () => {
          try {
            const latest = await db.activityLog.findMany({
              take: 5,
              orderBy: { createdAt: 'desc' },
            });
            const update = JSON.stringify({ type: 'update', activities: latest });
            controller.enqueue(encoder.encode(`data: ${update}\n\n`));
          } catch {
            // Database might be busy, skip this update
          }
        }, 5000);

        // Clean up on close
        setTimeout(() => {
          clearInterval(interval);
          controller.close();
        }, 30000); // Close after 30 seconds
      },
    });

    return new NextResponse(stream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
      },
    });
  } catch (error) {
    console.error('Activity stream error:', error);
    return NextResponse.json({ error: 'Failed to stream activity' }, { status: 500 });
  }
}

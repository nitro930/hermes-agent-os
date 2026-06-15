import { db } from '@/lib/db';
import { NextRequest, NextResponse } from 'next/server';
import { isShuttingDownState } from '@/lib/shutdown';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const activities = await db.activityLog.findMany({
      take: 20,
      orderBy: { createdAt: 'desc' },
    });

    const encoder = new TextEncoder();

    const stream = new ReadableStream({
      async start(controller) {
        // Send initial data
        const initData = JSON.stringify({ type: 'init', activities });
        controller.enqueue(encoder.encode(`data: ${initData}\n\n`));

        // Track last sent ID to only send new activities
        let lastSentId = activities.length > 0 ? activities[0].id : '';
        let closed = false;

        function cleanup() {
          if (closed) return;
          closed = true;
          clearInterval(updateInterval);
          clearInterval(keepaliveInterval);
          clearTimeout(timeout);
        }

        // Send incremental updates every 5 seconds
        const updateInterval = setInterval(async () => {
          if (closed || isShuttingDownState()) {
            cleanup();
            try { controller.close(); } catch { /* already closed */ }
            return;
          }
          try {
            const latest = await db.activityLog.findMany({
              take: 5,
              orderBy: { createdAt: 'desc' },
            });

            // Only send if there are new activities
            if (latest.length > 0 && latest[0].id !== lastSentId) {
              lastSentId = latest[0].id;
              const update = JSON.stringify({ type: 'update', activities: latest });
              controller.enqueue(encoder.encode(`data: ${update}\n\n`));
            }
          } catch {
            // Database might be busy, skip this update
          }
        }, 5000);

        // Send keepalive comments every 15 seconds to prevent timeouts
        const keepaliveInterval = setInterval(() => {
          if (closed) return;
          try {
            controller.enqueue(encoder.encode(':keepalive\n\n'));
          } catch {
            cleanup();
          }
        }, 15000);

        // Close after 5 minutes (long-lived connection)
        const timeout = setTimeout(() => {
          cleanup();
          try { controller.close(); } catch { /* already closed */ }
        }, 300000);

        // Clean up when client disconnects
        request.signal.addEventListener('abort', () => {
          cleanup();
          try { controller.close(); } catch { /* already closed */ }
        });
      },
    });

    return new NextResponse(stream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache, no-transform',
        'Connection': 'keep-alive',
        'X-Accel-Buffering': 'no',
      },
    });
  } catch (error) {
    console.error('Activity stream error:', error);
    return NextResponse.json({ error: 'Failed to stream activity' }, { status: 500 });
  }
}

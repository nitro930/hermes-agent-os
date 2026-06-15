import { db } from '@/lib/db';
import { NextRequest } from 'next/server';
import { isShuttingDownState } from '@/lib/shutdown';

export const dynamic = 'force-dynamic';

/**
 * SSE endpoint that streams live artifact content changes for hot-reload preview.
 * Clients connect with EventSource and receive updated artifact content in real-time.
 */
export async function GET(request: NextRequest) {
  const artifactId = request.nextUrl.searchParams.get('artifactId');
  if (!artifactId) {
    return new Response('Missing artifactId', { status: 400 });
  }

  const encoder = new TextEncoder();
  let lastVersion = 0;
  let lastContent = '';
  let lastStatus = '';
  let closed = false;

  // Get initial state
  const initial = await db.artifact.findUnique({ where: { id: artifactId } });
  if (!initial) {
    return new Response('Artifact not found', { status: 404 });
  }
  lastVersion = initial.version;
  lastContent = initial.content;
  lastStatus = initial.status;

  const stream = new ReadableStream({
    async start(controller) {
      let pollInterval: ReturnType<typeof setInterval>;
      let keepaliveInterval: ReturnType<typeof setInterval>;
      let timeout: ReturnType<typeof setTimeout>;

      function send(event: string, data: unknown) {
        if (closed) return;
        try {
          controller.enqueue(
            encoder.encode(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`)
          );
        } catch {
          cleanup();
        }
      }

      function cleanup() {
        if (closed) return;
        closed = true;
        clearInterval(pollInterval);
        clearInterval(keepaliveInterval);
        clearTimeout(timeout);
      }

      // Send initial snapshot
      send('update', {
        content: initial.content,
        version: initial.version,
        title: initial.title,
        type: initial.type,
        status: initial.status,
      });

      // Polling loop for changes
      pollInterval = setInterval(async () => {
        if (closed || isShuttingDownState()) {
          cleanup();
          try { controller.close(); } catch { /* ignore */ }
          return;
        }
        try {
          const artifact = await db.artifact.findUnique({ where: { id: artifactId } });
          if (!artifact) {
            send('delete', { id: artifactId });
            cleanup();
            try { controller.close(); } catch { /* ignore */ }
            return;
          }

          if (artifact.version !== lastVersion || artifact.content !== lastContent) {
            lastVersion = artifact.version;
            lastContent = artifact.content;
            send('update', {
              content: artifact.content,
              version: artifact.version,
              title: artifact.title,
              type: artifact.type,
              status: artifact.status,
            });
          }

          if (artifact.status !== lastStatus) {
            lastStatus = artifact.status;
            send('status', { status: artifact.status, version: artifact.version });
          }
        } catch {
          cleanup();
          try { controller.close(); } catch { /* ignore */ }
        }
      }, 2000);

      // Keepalive every 15s
      keepaliveInterval = setInterval(() => {
        if (closed) return;
        try {
          controller.enqueue(encoder.encode(':keepalive\n\n'));
        } catch {
          cleanup();
        }
      }, 15000);

      // Close after 5 minutes
      timeout = setTimeout(() => {
        cleanup();
        try { controller.close(); } catch { /* ignore */ }
      }, 300000);

      // Clean up immediately when client disconnects
      request.signal.addEventListener('abort', () => {
        cleanup();
        try { controller.close(); } catch { /* ignore */ }
      });
    },

    cancel() {
      closed = true;
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      'Connection': 'keep-alive',
      'X-Accel-Buffering': 'no',
    },
  });
}

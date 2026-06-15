'use client';

import { useEffect, useRef } from 'react';
import { useAppStore } from '@/lib/store';

interface ActivityItem {
  id: string;
  agentName: string | null;
  action: string;
  details: string | null;
  type: string;
  createdAt: string;
}

const RECONNECT_DELAY = 3000; // 3 seconds
const MAX_RECONNECT_ATTEMPTS = 10;

export function useNotifications() {
  const { addNotification } = useAppStore();
  const lastActivityId = useRef<string>('');
  const eventSourceRef = useRef<EventSource | null>(null);
  const reconnectAttempts = useRef(0);
  const reconnectTimer = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    function connect() {
      // Close any existing connection
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
      }

      try {
        const es = new EventSource('/api/activity/stream');
        eventSourceRef.current = es;

        es.onmessage = (event) => {
          try {
            const data = JSON.parse(event.data);
            if (!data) return;

            // Reset reconnect counter on successful message
            reconnectAttempts.current = 0;

            // Handle initial batch of activities
            if (data.type === 'init' && Array.isArray(data.activities)) {
              const activities: ActivityItem[] = data.activities;
              if (activities.length > 0) {
                lastActivityId.current = activities[0].id;
              }
              return;
            }

            // Handle incremental updates
            if (data.type === 'update' && Array.isArray(data.activities)) {
              const activities: ActivityItem[] = data.activities;
              if (activities.length > 0) {
                const latest = activities[0];
                // Only notify on new activities
                if (latest.id !== lastActivityId.current && lastActivityId.current) {
                  const type = latest.type === 'error' ? 'error'
                    : latest.type === 'warning' ? 'warning'
                    : latest.type === 'success' ? 'success'
                    : 'info';
                  addNotification({
                    title: latest.action,
                    description: latest.details || `By ${latest.agentName || 'System'}`,
                    type,
                  });
                }
                lastActivityId.current = latest.id;
              }
            }
          } catch {
            // Ignore parse errors
          }
        };

        es.onerror = () => {
          es.close();
          eventSourceRef.current = null;

          // Auto-reconnect with exponential backoff
          if (reconnectAttempts.current < MAX_RECONNECT_ATTEMPTS) {
            const delay = RECONNECT_DELAY * Math.pow(1.5, reconnectAttempts.current);
            reconnectAttempts.current++;
            reconnectTimer.current = setTimeout(() => {
              connect();
            }, Math.min(delay, 30000)); // Cap at 30s
          }
        };
      } catch {
        // EventSource not available, fall back to polling
        startPolling();
      }
    }

    let pollInterval: NodeJS.Timeout | null = null;

    function startPolling() {
      // Fallback polling for environments where SSE is not available
      pollInterval = setInterval(async () => {
        try {
          const res = await fetch('/api/activity');
          if (res.ok) {
            const activities: ActivityItem[] = await res.json();
            if (activities.length > 0) {
              const latest = activities[0];
              if (latest.id !== lastActivityId.current && lastActivityId.current) {
                const type = latest.type === 'error' ? 'error'
                  : latest.type === 'warning' ? 'warning'
                  : latest.type === 'success' ? 'success'
                  : 'info';
                addNotification({
                  title: latest.action,
                  description: latest.details || `By ${latest.agentName || 'System'}`,
                  type,
                });
              }
              lastActivityId.current = latest.id;
            }
          }
        } catch {
          // Silently ignore polling errors
        }
      }, 10000);
    }

    // Initialize: first fetch the latest activity ID, then connect SSE
    fetch('/api/activity')
      .then(r => r.ok ? r.json() : [])
      .then((activities: ActivityItem[]) => {
        if (activities.length > 0) {
          lastActivityId.current = activities[0].id;
        }
        connect();
      })
      .catch(() => {
        // If initial fetch fails, still try to connect SSE
        connect();
      });

    return () => {
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
        eventSourceRef.current = null;
      }
      if (reconnectTimer.current) {
        clearTimeout(reconnectTimer.current);
      }
      if (pollInterval) {
        clearInterval(pollInterval);
      }
    };
  }, [addNotification]);
}

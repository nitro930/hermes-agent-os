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

export function useNotifications() {
  const { addNotification } = useAppStore();
  const lastActivityId = useRef<string>('');
  const pollInterval = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    // Poll for new activity every 10 seconds
    pollInterval.current = setInterval(async () => {
      try {
        const res = await fetch('/api/activity');
        if (res.ok) {
          const activities: ActivityItem[] = await res.json();
          if (activities.length > 0) {
            const latest = activities[0];
            // Only notify on new activities
            if (latest.id !== lastActivityId.current && lastActivityId.current) {
              const type = latest.type === 'error' ? 'error' : latest.type === 'warning' ? 'warning' : latest.type === 'success' ? 'success' : 'info';
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

    // Initialize with latest activity ID
    fetch('/api/activity')
      .then(r => r.ok ? r.json() : [])
      .then((activities: ActivityItem[]) => {
        if (activities.length > 0) {
          lastActivityId.current = activities[0].id;
        }
      })
      .catch(() => {});

    return () => {
      if (pollInterval.current) clearInterval(pollInterval.current);
    };
  }, [addNotification]);
}

'use client';

import { useEffect, useState, useCallback } from 'react';
import { useAppStore, VALID_VIEWS, ActiveView } from '@/lib/store';
import { Sidebar } from '@/components/agent-os/sidebar';
import { Dashboard } from '@/components/agent-os/dashboard';
import { AgentsView } from '@/components/agent-os/agents-view';
import { ChatView } from '@/components/agent-os/chat-view';
import { MemoryView } from '@/components/agent-os/memory-view';
import { TasksView } from '@/components/agent-os/tasks-view';
import { AutomationsView } from '@/components/agent-os/automations-view';
import { TeamsView } from '@/components/agent-os/teams-view';
import { SkillsView } from '@/components/agent-os/skills-view';
import { GoalsView } from '@/components/agent-os/goals-view';
import { VoiceView } from '@/components/agent-os/voice-view';
import { McpView } from '@/components/agent-os/mcp-view';
import { FusionView } from '@/components/agent-os/fusion-view';
import { UsageView } from '@/components/agent-os/usage-view';
import { DevView } from '@/components/agent-os/dev-view';
import { ErrorBoundary } from '@/components/agent-os/error-boundary';
import { CommandPalette } from '@/components/agent-os/command-palette';
import { useNotifications } from '@/hooks/use-notifications';

function ViewRenderer() {
  const { activeView } = useAppStore();

  switch (activeView) {
    case 'dashboard':
      return <Dashboard />;
    case 'agents':
      return <AgentsView />;
    case 'chat':
      return <ChatView />;
    case 'memory':
      return <MemoryView />;
    case 'tasks':
      return <TasksView />;
    case 'automations':
      return <AutomationsView />;
    case 'teams':
      return <TeamsView />;
    case 'skills':
      return <SkillsView />;
    case 'goals':
      return <GoalsView />;
    case 'voice':
      return <VoiceView />;
    case 'mcp':
      return <McpView />;
    case 'fusion':
      return <FusionView />;
    case 'usage':
      return <UsageView />;
    case 'dev':
      return <DevView />;
    default:
      return <Dashboard />;
  }
}

export default function Home() {
  const [seeded, setSeeded] = useState(false);
  const { setActiveView, activeView } = useAppStore();
  useNotifications(); // Enable real-time notifications

  // Seed database on first load
  useEffect(() => {
    async function seedData() {
      try {
        const statsRes = await fetch('/api/stats');
        if (statsRes.ok) {
          const stats = await statsRes.json();
          if (stats.totalAgents === 0) {
            await fetch('/api/seed', { method: 'POST' });
          }
        }
        setSeeded(true);
      } catch (error) {
        console.error('Seed check failed:', error);
        setSeeded(true);
      }
    }
    seedData();
  }, []);

  // Handle browser back/forward via popstate (hash changes)
  const handlePopState = useCallback(() => {
    const hash = window.location.hash.replace('#', '');
    if (VALID_VIEWS.includes(hash as ActiveView)) {
      setActiveView(hash as ActiveView);
    } else {
      setActiveView('dashboard');
    }
  }, [setActiveView]);

  useEffect(() => {
    window.addEventListener('popstate', handlePopState);
    // Set initial hash if not already set
    if (!window.location.hash) {
      window.history.replaceState(null, '', `#${activeView}`);
    }
    return () => window.removeEventListener('popstate', handlePopState);
  }, [handlePopState, activeView]);

  if (!seeded) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-background">
        <div className="flex flex-col items-center gap-4">
          <div className="flex items-center justify-center w-12 h-12 rounded-xl bg-emerald-500/20 text-emerald-400">
            <svg className="w-6 h-6 animate-spin" viewBox="0 0 24 24" fill="none">
              <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2" strokeDasharray="31.4" strokeDashoffset="10" />
            </svg>
          </div>
          <div className="text-center">
            <h2 className="text-lg font-bold text-foreground">Initializing Hermes Agent OS</h2>
            <p className="text-sm text-muted-foreground mt-1">Loading system components...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-background overflow-hidden">
      <Sidebar />
      <main className="flex-1 overflow-y-auto p-6">
        <ErrorBoundary>
          <ViewRenderer />
        </ErrorBoundary>
      </main>
      <CommandPalette />
    </div>
  );
}

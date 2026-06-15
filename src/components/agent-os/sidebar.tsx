'use client';

import { useAppStore, ActiveView } from '@/lib/store';
import {
  LayoutDashboard,
  Bot,
  MessageSquare,
  Brain,
  Kanban,
  Zap,
  Users,
  ChevronLeft,
  ChevronRight,
  Terminal,
  Wrench,
  Target,
  Mic,
  Plug,
  Sun,
  Moon,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { cn } from '@/lib/utils';
import { useTheme } from 'next-themes';
import { useEffect, useState } from 'react';

const navItems: { view: ActiveView; label: string; icon: React.ElementType }[] = [
  { view: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { view: 'agents', label: 'Agents', icon: Bot },
  { view: 'chat', label: 'Chat', icon: MessageSquare },
  { view: 'memory', label: 'Memory', icon: Brain },
  { view: 'tasks', label: 'Tasks', icon: Kanban },
  { view: 'automations', label: 'Automations', icon: Zap },
  { view: 'teams', label: 'Teams', icon: Users },
  { view: 'skills', label: 'Skills', icon: Wrench },
  { view: 'goals', label: 'Goals', icon: Target },
  { view: 'voice', label: 'Voice', icon: Mic },
  { view: 'mcp', label: 'MCP', icon: Plug },
];

export function Sidebar() {
  const { activeView, setActiveView, sidebarOpen, setSidebarOpen } = useAppStore();
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  return (
    <div
      className={cn(
        'flex flex-col h-screen bg-sidebar border-r border-sidebar-border transition-all duration-300 relative',
        sidebarOpen ? 'w-56' : 'w-16'
      )}
    >
      {/* Logo */}
      <div className="flex items-center gap-3 px-4 h-14 border-b border-sidebar-border">
        <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-emerald-500/20 text-emerald-400 shrink-0">
          <Terminal className="w-4 h-4" />
        </div>
        {sidebarOpen && (
          <div className="flex flex-col">
            <span className="text-sm font-bold text-emerald-400">Hermes Agent OS</span>
            <span className="text-[10px] text-muted-foreground">v2.0.0</span>
          </div>
        )}
      </div>

      {/* Navigation */}
      <nav className="flex-1 py-2 px-2 space-y-1 overflow-y-auto">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeView === item.view;
          return (
            <button
              key={item.view}
              onClick={() => setActiveView(item.view)}
              className={cn(
                'flex items-center gap-3 w-full px-3 py-2 rounded-lg text-sm transition-all duration-200',
                isActive
                  ? 'bg-emerald-500/15 text-emerald-400 glow-emerald'
                  : 'text-muted-foreground hover:text-foreground hover:bg-accent'
              )}
            >
              <Icon className="w-4 h-4 shrink-0" />
              {sidebarOpen && <span>{item.label}</span>}
            </button>
          );
        })}
      </nav>

      <Separator className="bg-sidebar-border" />

      {/* Theme toggle + System status */}
      <div className="px-4 py-3 flex items-center justify-between">
        {mounted && (
          <Button
            variant="ghost"
            size="icon"
            className="w-8 h-8 text-muted-foreground hover:text-foreground"
            onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
            title={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
          >
            {theme === 'dark' ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
          </Button>
        )}
        {sidebarOpen && (
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-emerald-500 pulse-emerald" />
            <span className="text-xs text-muted-foreground">System Online</span>
          </div>
        )}
      </div>

      {/* Collapse toggle */}
      <button
        onClick={() => setSidebarOpen(!sidebarOpen)}
        className="absolute -right-3 top-16 w-6 h-6 bg-card border border-border rounded-full flex items-center justify-center text-muted-foreground hover:text-foreground hover:border-emerald-500/50 transition-colors z-10"
      >
        {sidebarOpen ? <ChevronLeft className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
      </button>
    </div>
  );
}

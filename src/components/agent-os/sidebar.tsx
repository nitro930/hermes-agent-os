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
  Bell,
  Search,
  Globe,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
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
  { view: 'dev', label: 'Dev Server', icon: Globe },
  { view: 'teams', label: 'Teams', icon: Users },
  { view: 'skills', label: 'Skills', icon: Wrench },
  { view: 'goals', label: 'Goals', icon: Target },
  { view: 'voice', label: 'Voice', icon: Mic },
  { view: 'mcp', label: 'MCP', icon: Plug },
];

export function Sidebar() {
  const { activeView, setActiveView, sidebarOpen, setSidebarOpen, notifications, markNotificationRead, clearNotifications } = useAppStore();
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const unreadCount = notifications.filter(n => !n.read).length;

  const notifTypeColors: Record<string, string> = {
    info: 'text-blue-400',
    success: 'text-emerald-400',
    warning: 'text-yellow-400',
    error: 'text-red-400',
  };

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

      {/* Theme toggle + Notifications + System status */}
      <div className="px-4 py-3 space-y-2">
        <div className="flex items-center justify-between">
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
          <div className="relative">
            <Button
              variant="ghost"
              size="icon"
              className="w-8 h-8 text-muted-foreground hover:text-foreground"
              onClick={() => setShowNotifications(!showNotifications)}
            >
              <Bell className="w-4 h-4" />
              {unreadCount > 0 && (
                <span className="absolute -top-0.5 -right-0.5 w-4 h-4 rounded-full bg-red-500 text-[9px] text-white flex items-center justify-center font-bold">
                  {unreadCount > 9 ? '9+' : unreadCount}
                </span>
              )}
            </Button>
          </div>
          <Button
            variant="ghost"
            size="icon"
            className="w-8 h-8 text-muted-foreground hover:text-foreground"
            onClick={() => {
              // Trigger Cmd+K programmatically
              document.dispatchEvent(new KeyboardEvent('keydown', { key: 'k', metaKey: true, ctrlKey: true }));
            }}
            title="Search (Cmd+K)"
          >
            <Search className="w-4 h-4" />
          </Button>
        </div>
        {sidebarOpen && (
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-emerald-500 pulse-emerald" />
            <span className="text-xs text-muted-foreground">System Online</span>
          </div>
        )}
      </div>

      {/* Notification Panel */}
      {showNotifications && (
        <div className="absolute left-full bottom-16 ml-2 w-80 bg-card border border-border rounded-lg shadow-xl z-50">
          <div className="flex items-center justify-between p-3 border-b border-border">
            <span className="text-sm font-medium">Notifications</span>
            <div className="flex items-center gap-2">
              {notifications.length > 0 && (
                <Button variant="ghost" size="sm" className="text-xs h-6 text-muted-foreground" onClick={clearNotifications}>
                  Clear all
                </Button>
              )}
              <Button variant="ghost" size="icon" className="w-5 h-5" onClick={() => setShowNotifications(false)}>
                ×
              </Button>
            </div>
          </div>
          <ScrollArea className="h-64">
            {notifications.length === 0 ? (
              <div className="flex items-center justify-center h-20 text-xs text-muted-foreground">
                No notifications yet
              </div>
            ) : (
              <div className="p-2 space-y-1">
                {notifications.slice(0, 20).map((notif) => (
                  <div
                    key={notif.id}
                    className={`p-2.5 rounded-lg cursor-pointer transition-colors ${
                      notif.read ? 'opacity-60' : 'bg-secondary/50'
                    }`}
                    onClick={() => markNotificationRead(notif.id)}
                  >
                    <div className="flex items-start gap-2">
                      <div className={`mt-0.5 shrink-0 ${notifTypeColors[notif.type]}`}>
                        <Bell className="w-3 h-3" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-medium truncate">{notif.title}</p>
                        {notif.description && (
                          <p className="text-[10px] text-muted-foreground mt-0.5 truncate">{notif.description}</p>
                        )}
                        <p className="text-[9px] text-muted-foreground/50 mt-0.5">
                          {new Date(notif.timestamp).toLocaleTimeString()}
                        </p>
                      </div>
                      {!notif.read && (
                        <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0 mt-1" />
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </ScrollArea>
        </div>
      )}

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

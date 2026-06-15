'use client';

import { useEffect, useState } from 'react';
import { useAppStore, ActiveView } from '@/lib/store';
import {
  LayoutDashboard,
  Bot,
  MessageSquare,
  Brain,
  Kanban,
  Zap,
  Users,
  Wrench,
  Target,
  Mic,
  Plug,
  Search,
  Plus,
  ArrowRight,
  Hash,
} from 'lucide-react';
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from '@/components/ui/command';

interface CommandItemData {
  id: string;
  label: string;
  description?: string;
  icon: React.ElementType;
  action: () => void;
  keywords?: string[];
}

export function CommandPalette() {
  const { setActiveView } = useAppStore();
  const [open, setOpen] = useState(false);
  const [agents, setAgents] = useState<{ id: string; name: string; avatar: string | null; type: string }[]>([]);
  const [tasks, setTasks] = useState<{ id: string; title: string; status: string; priority: string }[]>([]);
  const [memories, setMemories] = useState<{ id: string; title: string; folder: string }[]>([]);

  // Toggle with Cmd+K / Ctrl+K
  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === 'k' && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setOpen((o) => !o);
      }
    };
    document.addEventListener('keydown', down);
    return () => document.removeEventListener('keydown', down);
  }, []);

  // Load data when palette opens
  useEffect(() => {
    if (open) {
      fetch('/api/agents').then(r => r.ok ? r.json() : []).then(setAgents).catch(() => {});
      fetch('/api/tasks').then(r => r.ok ? r.json() : []).then(setTasks).catch(() => {});
      fetch('/api/memory').then(r => r.ok ? r.json() : []).then(setMemories).catch(() => {});
    }
  }, [open]);

  const navigateTo: (view: ActiveView) => () => void = (view) => () => {
    setActiveView(view);
    setOpen(false);
  };

  const viewItems: CommandItemData[] = [
    { id: 'nav-dashboard', label: 'Dashboard', description: 'Overview of your Agent OS', icon: LayoutDashboard, action: navigateTo('dashboard'), keywords: ['home', 'overview'] },
    { id: 'nav-agents', label: 'Agents', description: 'Manage AI agents', icon: Bot, action: navigateTo('agents'), keywords: ['bot', 'ai'] },
    { id: 'nav-chat', label: 'Chat', description: 'Chat with agents', icon: MessageSquare, action: navigateTo('chat'), keywords: ['message', 'talk', 'conversation'] },
    { id: 'nav-memory', label: 'Memory', description: 'Knowledge base & notes', icon: Brain, action: navigateTo('memory'), keywords: ['notes', 'knowledge', 'obsidian'] },
    { id: 'nav-tasks', label: 'Tasks', description: 'Kanban task board', icon: Kanban, action: navigateTo('tasks'), keywords: ['todo', 'board', 'kanban'] },
    { id: 'nav-automations', label: 'Automations', description: 'Event-driven workflows', icon: Zap, action: navigateTo('automations'), keywords: ['workflow', 'trigger', 'rule'] },
    { id: 'nav-teams', label: 'Teams', description: 'Agent team management', icon: Users, action: navigateTo('teams'), keywords: ['group', 'organization'] },
    { id: 'nav-skills', label: 'Skills', description: 'Agent skills registry', icon: Wrench, action: navigateTo('skills'), keywords: ['abilities', 'capabilities'] },
    { id: 'nav-goals', label: 'Goals', description: 'Goal tracking & progress', icon: Target, action: navigateTo('goals'), keywords: ['objectives', 'targets'] },
    { id: 'nav-voice', label: 'Voice', description: 'Voice control & commands', icon: Mic, action: navigateTo('voice'), keywords: ['speech', 'jarvis', 'microphone'] },
    { id: 'nav-mcp', label: 'MCP', description: 'MCP server connections', icon: Plug, action: navigateTo('mcp'), keywords: ['servers', 'tools', 'connections'] },
  ];

  const quickActions: CommandItemData[] = [
    { id: 'action-new-agent', label: 'Create New Agent', icon: Plus, action: () => { setActiveView('agents'); setOpen(false); }, keywords: ['add', 'create agent'] },
    { id: 'action-new-task', label: 'Create New Task', icon: Plus, action: () => { setActiveView('tasks'); setOpen(false); }, keywords: ['add', 'create task'] },
    { id: 'action-new-memory', label: 'Create New Memory', icon: Plus, action: () => { setActiveView('memory'); setOpen(false); }, keywords: ['add', 'note'] },
    { id: 'action-new-skill', label: 'Create New Skill', icon: Plus, action: () => { setActiveView('skills'); setOpen(false); }, keywords: ['add', 'create skill'] },
    { id: 'action-new-goal', label: 'Create New Goal', icon: Plus, action: () => { setActiveView('goals'); setOpen(false); }, keywords: ['add', 'create goal'] },
  ];

  const agentItems: CommandItemData[] = agents.map((a) => ({
    id: `agent-${a.id}`,
    label: a.name,
    description: `${a.type} agent`,
    icon: Bot,
    action: () => { setActiveView('agents'); setOpen(false); },
    keywords: [a.type, 'agent'],
  }));

  const taskItems: CommandItemData[] = tasks.map((t) => ({
    id: `task-${t.id}`,
    label: t.title,
    description: `${t.priority} priority · ${t.status}`,
    icon: Kanban,
    action: () => { setActiveView('tasks'); setOpen(false); },
    keywords: [t.status, t.priority, 'task'],
  }));

  const memoryItems: CommandItemData[] = memories.map((m) => ({
    id: `memory-${m.id}`,
    label: m.title,
    description: `${m.folder} folder`,
    icon: Brain,
    action: () => { setActiveView('memory'); setOpen(false); },
    keywords: [m.folder, 'memory', 'note'],
  }));

  return (
    <CommandDialog open={open} onOpenChange={setOpen}>
      <CommandInput placeholder="Search agents, tasks, memories... (Cmd+K)" />
      <CommandList>
        <CommandEmpty>No results found.</CommandEmpty>

        <CommandGroup heading="Navigation">
          {viewItems.map((item) => {
            const Icon = item.icon;
            return (
              <CommandItem
                key={item.id}
                onSelect={item.action}
                keywords={item.keywords}
              >
                <Icon className="w-4 h-4 mr-2 text-muted-foreground" />
                <span>{item.label}</span>
                {item.description && (
                  <span className="ml-auto text-xs text-muted-foreground">{item.description}</span>
                )}
              </CommandItem>
            );
          })}
        </CommandGroup>

        <CommandSeparator />

        <CommandGroup heading="Quick Actions">
          {quickActions.map((item) => {
            const Icon = item.icon;
            return (
              <CommandItem
                key={item.id}
                onSelect={item.action}
                keywords={item.keywords}
              >
                <Icon className="w-4 h-4 mr-2 text-emerald-400" />
                <span>{item.label}</span>
                <ArrowRight className="ml-auto w-3 h-3 text-muted-foreground" />
              </CommandItem>
            );
          })}
        </CommandGroup>

        {agentItems.length > 0 && (
          <>
            <CommandSeparator />
            <CommandGroup heading="Agents">
              {agentItems.slice(0, 8).map((item) => {
                const Icon = item.icon;
                return (
                  <CommandItem
                    key={item.id}
                    onSelect={item.action}
                    keywords={item.keywords}
                  >
                    <Icon className="w-4 h-4 mr-2 text-emerald-400" />
                    <span>{item.label}</span>
                    {item.description && (
                      <span className="ml-auto text-xs text-muted-foreground">{item.description}</span>
                    )}
                  </CommandItem>
                );
              })}
            </CommandGroup>
          </>
        )}

        {taskItems.length > 0 && (
          <>
            <CommandSeparator />
            <CommandGroup heading="Tasks">
              {taskItems.slice(0, 6).map((item) => {
                const Icon = item.icon;
                return (
                  <CommandItem
                    key={item.id}
                    onSelect={item.action}
                    keywords={item.keywords}
                  >
                    <Icon className="w-4 h-4 mr-2 text-yellow-400" />
                    <span className="truncate max-w-[200px]">{item.label}</span>
                    {item.description && (
                      <span className="ml-auto text-xs text-muted-foreground shrink-0">{item.description}</span>
                    )}
                  </CommandItem>
                );
              })}
            </CommandGroup>
          </>
        )}

        {memoryItems.length > 0 && (
          <>
            <CommandSeparator />
            <CommandGroup heading="Memory">
              {memoryItems.slice(0, 6).map((item) => {
                const Icon = item.icon;
                return (
                  <CommandItem
                    key={item.id}
                    onSelect={item.action}
                    keywords={item.keywords}
                  >
                    <Icon className="w-4 h-4 mr-2 text-blue-400" />
                    <span className="truncate max-w-[200px]">{item.label}</span>
                    {item.description && (
                      <span className="ml-auto text-xs text-muted-foreground shrink-0">{item.description}</span>
                    )}
                  </CommandItem>
                );
              })}
            </CommandGroup>
          </>
        )}

        <CommandSeparator />
        <CommandGroup heading="Help">
          <CommandItem onSelect={() => setOpen(false)} keywords={['keyboard', 'shortcut']}>
            <Hash className="w-4 h-4 mr-2 text-muted-foreground" />
            <span>Keyboard Shortcuts</span>
            <span className="ml-auto text-xs text-muted-foreground">Cmd+K to toggle</span>
          </CommandItem>
        </CommandGroup>
      </CommandList>
    </CommandDialog>
  );
}

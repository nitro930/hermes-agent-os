'use client';

import { useEffect, useState, useCallback } from 'react';
import { useAppStore, ActiveView } from '@/lib/store';
import {
  LayoutDashboard, Bot, MessageSquare, Brain, Kanban, Zap, Users,
  Wrench, Target, Mic, Plug, Search, Plus, ArrowRight, Hash, Globe, Clock, Code,
} from 'lucide-react';
import {
  CommandDialog, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList, CommandSeparator,
} from '@/components/ui/command';

interface CommandItemData {
  id: string; label: string; description?: string; icon: React.ElementType; action: () => void; keywords?: string[];
}

interface SearchResult {
  agents?: { id: string; name: string; type: string; status: string; avatar: string | null }[];
  tasks?: { id: string; title: string; status: string; priority: string }[];
  memories?: { id: string; title: string; type: string; folder: string }[];
  skills?: { id: string; name: string; category: string; usageCount: number }[];
  goals?: { id: string; title: string; status: string; progress: number }[];
  artifacts?: { id: string; title: string; type: string; status: string; version: number }[];
  cronJobs?: { id: string; name: string; schedule: string; action: string; isActive: boolean }[];
  conversations?: { id: string; title: string; agentId: string }[];
}

export function CommandPalette() {
  const { setActiveView } = useAppStore();
  const [open, setOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<SearchResult | null>(null);
  const [searching, setSearching] = useState(false);

  // Toggle with Cmd+K / Ctrl+K
  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === 'k' && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setOpen(o => !o);
      }
    };
    document.addEventListener('keydown', down);
    return () => document.removeEventListener('keydown', down);
  }, []);

  // Debounced global search
  const searchTimeout = useCallback(() => {
    let timeout: ReturnType<typeof setTimeout>;
    return (query: string) => {
      clearTimeout(timeout);
      if (query.length < 2) {
        setSearchResults(null);
        setSearching(false);
        return;
      }
      setSearching(true);
      timeout = setTimeout(async () => {
        try {
          const res = await fetch(`/api/search?q=${encodeURIComponent(query)}&limit=3`);
          if (res.ok) {
            const data = await res.json();
            setSearchResults(data.results);
          }
        } catch { /* ignore */ }
        finally { setSearching(false); }
      }, 300);
    };
  }, []);

  const debouncedSearch = useCallback(searchTimeout(), [searchTimeout]);

  useEffect(() => {
    debouncedSearch(searchQuery);
  }, [searchQuery, debouncedSearch]);

  const navigateTo: (view: ActiveView) => () => void = (view) => () => {
    setActiveView(view);
    setOpen(false);
  };

  const viewItems: CommandItemData[] = [
    { id: 'nav-dashboard', label: 'Dashboard', description: 'Overview', icon: LayoutDashboard, action: navigateTo('dashboard'), keywords: ['home', 'overview'] },
    { id: 'nav-agents', label: 'Agents', description: 'Manage AI agents', icon: Bot, action: navigateTo('agents'), keywords: ['bot', 'ai'] },
    { id: 'nav-chat', label: 'Chat', description: 'Chat with agents', icon: MessageSquare, action: navigateTo('chat'), keywords: ['message', 'talk'] },
    { id: 'nav-memory', label: 'Memory', description: 'Knowledge base', icon: Brain, action: navigateTo('memory'), keywords: ['notes', 'knowledge'] },
    { id: 'nav-tasks', label: 'Tasks', description: 'Kanban board', icon: Kanban, action: navigateTo('tasks'), keywords: ['todo', 'board'] },
    { id: 'nav-automations', label: 'Automations & Cron', description: 'Workflows & scheduled jobs', icon: Zap, action: navigateTo('automations'), keywords: ['workflow', 'cron', 'schedule'] },
    { id: 'nav-teams', label: 'Teams', description: 'Team management', icon: Users, action: navigateTo('teams'), keywords: ['group'] },
    { id: 'nav-skills', label: 'Skills', description: 'Agent skills', icon: Wrench, action: navigateTo('skills'), keywords: ['abilities'] },
    { id: 'nav-goals', label: 'Goals', description: 'Goal tracking', icon: Target, action: navigateTo('goals'), keywords: ['objectives'] },
    { id: 'nav-voice', label: 'Voice', description: 'Voice control', icon: Mic, action: navigateTo('voice'), keywords: ['speech', 'jarvis'] },
    { id: 'nav-mcp', label: 'MCP', description: 'MCP connections', icon: Plug, action: navigateTo('mcp'), keywords: ['servers', 'tools'] },
    { id: 'nav-dev', label: 'Dev Server', description: 'Live preview', icon: Globe, action: navigateTo('dev'), keywords: ['preview', 'code', 'deploy'] },
  ];

  const quickActions: CommandItemData[] = [
    { id: 'action-new-agent', label: 'Create New Agent', icon: Plus, action: () => { setActiveView('agents'); setOpen(false); }, keywords: ['add'] },
    { id: 'action-new-task', label: 'Create New Task', icon: Plus, action: () => { setActiveView('tasks'); setOpen(false); }, keywords: ['add'] },
    { id: 'action-new-memory', label: 'Create New Memory', icon: Plus, action: () => { setActiveView('memory'); setOpen(false); }, keywords: ['add', 'note'] },
    { id: 'action-new-skill', label: 'Create New Skill', icon: Plus, action: () => { setActiveView('skills'); setOpen(false); }, keywords: ['add'] },
    { id: 'action-new-goal', label: 'Create New Goal', icon: Plus, action: () => { setActiveView('goals'); setOpen(false); }, keywords: ['add'] },
    { id: 'action-new-artifact', label: 'Create New Artifact', icon: Globe, action: () => { setActiveView('dev'); setOpen(false); }, keywords: ['add', 'code'] },
    { id: 'action-new-cron', label: 'Create New Cron Job', icon: Clock, action: () => { setActiveView('automations'); setOpen(false); }, keywords: ['add', 'schedule'] },
  ];

  // Build search result items
  const searchResultItems: CommandItemData[] = [];
  if (searchResults) {
    searchResults.agents?.forEach(a => searchResultItems.push({ id: `s-agent-${a.id}`, label: a.name, description: `${a.type} agent · ${a.status}`, icon: Bot, action: navigateTo('agents'), keywords: ['agent', a.type] }));
    searchResults.tasks?.forEach(t => searchResultItems.push({ id: `s-task-${t.id}`, label: t.title, description: `${t.priority} · ${t.status}`, icon: Kanban, action: navigateTo('tasks'), keywords: ['task'] }));
    searchResults.memories?.forEach(m => searchResultItems.push({ id: `s-mem-${m.id}`, label: m.title, description: `${m.folder} · ${m.type}`, icon: Brain, action: navigateTo('memory'), keywords: ['memory'] }));
    searchResults.skills?.forEach(s => searchResultItems.push({ id: `s-skill-${s.id}`, label: s.name, description: `${s.category} · used ${s.usageCount}x`, icon: Wrench, action: navigateTo('skills'), keywords: ['skill'] }));
    searchResults.goals?.forEach(g => searchResultItems.push({ id: `s-goal-${g.id}`, label: g.title, description: `${g.progress}% · ${g.status}`, icon: Target, action: navigateTo('goals'), keywords: ['goal'] }));
    searchResults.artifacts?.forEach(a => searchResultItems.push({ id: `s-art-${a.id}`, label: a.title, description: `${a.type} · v${a.version} · ${a.status}`, icon: Code, action: navigateTo('dev'), keywords: ['artifact'] }));
    searchResults.cronJobs?.forEach(c => searchResultItems.push({ id: `s-cron-${c.id}`, label: c.name, description: `${c.schedule} · ${c.action}`, icon: Clock, action: navigateTo('automations'), keywords: ['cron'] }));
  }

  const hasSearchResults = searchResultItems.length > 0;

  return (
    <CommandDialog open={open} onOpenChange={setOpen}>
      <CommandInput placeholder="Search agents, tasks, memories, cron jobs... (Cmd+K)" value={searchQuery} onValueChange={setSearchQuery} />
      <CommandList>
        <CommandEmpty>{searching ? 'Searching...' : searchQuery.length > 1 ? 'No results found.' : 'Type to search across all entities...'}</CommandEmpty>

        {/* Search Results (shown when there's a search query with results) */}
        {hasSearchResults && (
          <CommandGroup heading={`Search Results (${searchResultItems.length})`}>
            {searchResultItems.slice(0, 12).map(item => {
              const Icon = item.icon;
              return (
                <CommandItem key={item.id} onSelect={item.action} keywords={item.keywords}>
                  <Icon className="w-4 h-4 mr-2 text-emerald-400" />
                  <span className="truncate max-w-[200px]">{item.label}</span>
                  {item.description && <span className="ml-auto text-xs text-muted-foreground shrink-0">{item.description}</span>}
                </CommandItem>
              );
            })}
          </CommandGroup>
        )}

        {/* Hide navigation when actively searching */}
        {!hasSearchResults && (
          <>
            <CommandGroup heading="Navigation">
              {viewItems.map(item => {
                const Icon = item.icon;
                return (
                  <CommandItem key={item.id} onSelect={item.action} keywords={item.keywords}>
                    <Icon className="w-4 h-4 mr-2 text-muted-foreground" />
                    <span>{item.label}</span>
                    {item.description && <span className="ml-auto text-xs text-muted-foreground">{item.description}</span>}
                  </CommandItem>
                );
              })}
            </CommandGroup>

            <CommandSeparator />

            <CommandGroup heading="Quick Actions">
              {quickActions.map(item => {
                const Icon = item.icon;
                return (
                  <CommandItem key={item.id} onSelect={item.action} keywords={item.keywords}>
                    <Icon className="w-4 h-4 mr-2 text-emerald-400" />
                    <span>{item.label}</span>
                    <ArrowRight className="ml-auto w-3 h-3 text-muted-foreground" />
                  </CommandItem>
                );
              })}
            </CommandGroup>

            <CommandSeparator />

            <CommandGroup heading="Help">
              <CommandItem onSelect={() => setOpen(false)} keywords={['keyboard', 'shortcut']}>
                <Hash className="w-4 h-4 mr-2 text-muted-foreground" />
                <span>Keyboard Shortcuts</span>
                <span className="ml-auto text-xs text-muted-foreground">Cmd+K to toggle</span>
              </CommandItem>
            </CommandGroup>
          </>
        )}
      </CommandList>
    </CommandDialog>
  );
}

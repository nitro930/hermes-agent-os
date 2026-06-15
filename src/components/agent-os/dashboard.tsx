'use client';

import { useEffect, useState } from 'react';
import { useAppStore } from '@/lib/store';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Bot,
  Activity,
  CheckCircle2,
  Brain,
  Plus,
  Zap,
  AlertCircle,
  Clock,
  ArrowUp,
} from 'lucide-react';

interface Agent {
  id: string;
  name: string;
  type: string;
  status: string;
  avatar: string | null;
  description: string;
}

interface ActivityItem {
  id: string;
  agentName: string | null;
  action: string;
  details: string | null;
  type: string;
  createdAt: string;
}

interface Stats {
  totalAgents: number;
  activeAgents: number;
  tasksCompleted: number;
  memoryEntries: number;
  totalTasks: number;
  runningAutomations: number;
  agentsByStatus: { status: string; _count: number }[];
  tasksByStatus: { status: string; _count: number }[];
}

const statusColors: Record<string, string> = {
  idle: 'bg-slate-500',
  running: 'bg-emerald-500',
  error: 'bg-red-500',
  paused: 'bg-yellow-500',
};

const activityTypeColors: Record<string, string> = {
  info: 'text-blue-400',
  success: 'text-emerald-400',
  warning: 'text-yellow-400',
  error: 'text-red-400',
};

const activityTypeIcons: Record<string, React.ElementType> = {
  info: Clock,
  success: CheckCircle2,
  warning: AlertCircle,
  error: AlertCircle,
};

export function Dashboard() {
  const { setActiveView } = useAppStore();
  const [stats, setStats] = useState<Stats | null>(null);
  const [agents, setAgents] = useState<Agent[]>([]);
  const [activities, setActivities] = useState<ActivityItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    try {
      const [statsRes, agentsRes, activityRes] = await Promise.all([
        fetch('/api/stats'),
        fetch('/api/agents'),
        fetch('/api/activity'),
      ]);
      if (statsRes.ok) setStats(await statsRes.json());
      if (agentsRes.ok) setAgents(await agentsRes.json());
      if (activityRes.ok) setActivities(await activityRes.json());
    } catch (error) {
      console.error('Failed to load dashboard data:', error);
    } finally {
      setLoading(false);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" />
          <span className="text-sm text-muted-foreground">Loading Agent OS...</span>
        </div>
      </div>
    );
  }

  const statCards = [
    { label: 'Total Agents', value: stats?.totalAgents ?? 0, icon: Bot, color: 'text-emerald-400' },
    { label: 'Active Agents', value: stats?.activeAgents ?? 0, icon: Activity, color: 'text-blue-400' },
    { label: 'Tasks Done', value: stats?.tasksCompleted ?? 0, icon: CheckCircle2, color: 'text-yellow-400' },
    { label: 'Memory Entries', value: stats?.memoryEntries ?? 0, icon: Brain, color: 'text-purple-400' },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Dashboard</h1>
          <p className="text-sm text-muted-foreground">Welcome to Agent OS — your AI agent command center</p>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-emerald-500/10 border border-emerald-500/20">
            <div className="w-2 h-2 rounded-full bg-emerald-500 pulse-emerald" />
            <span className="text-xs font-medium text-emerald-400">All Systems Operational</span>
          </div>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {statCards.map((stat) => {
          const Icon = stat.icon;
          return (
            <Card key={stat.label} className="bg-card border-border hover:border-emerald-500/30 transition-colors">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs text-muted-foreground font-medium">{stat.label}</p>
                    <p className="text-2xl font-bold text-foreground mt-1">{stat.value}</p>
                  </div>
                  <div className={`p-2.5 rounded-lg bg-card ${stat.color}`}>
                    <Icon className="w-5 h-5" />
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Agent Status Grid + Activity Feed */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Agent Status */}
        <Card className="bg-card border-border lg:col-span-2">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-semibold">Agent Status</CardTitle>
              <Button
                variant="ghost"
                size="sm"
                className="text-xs text-emerald-400 hover:text-emerald-300"
                onClick={() => setActiveView('agents')}
              >
                View All
              </Button>
            </div>
          </CardHeader>
          <CardContent className="p-4 pt-0">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {agents.map((agent) => (
                <div
                  key={agent.id}
                  className="flex items-center gap-3 p-3 rounded-lg bg-secondary/50 border border-border hover:border-emerald-500/20 transition-colors cursor-pointer"
                  onClick={() => {
                    setActiveView('agents');
                  }}
                >
                  <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-card text-lg shrink-0">
                    {agent.avatar || '🤖'}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-foreground truncate">{agent.name}</p>
                    <div className="flex items-center gap-1.5 mt-0.5">
                      <div className={`w-1.5 h-1.5 rounded-full ${statusColors[agent.status] || 'bg-slate-500'} ${agent.status === 'running' ? 'pulse-emerald' : ''}`} />
                      <span className="text-[10px] text-muted-foreground capitalize">{agent.status}</span>
                    </div>
                  </div>
                  <Badge variant="outline" className="text-[10px] shrink-0 capitalize">
                    {agent.type}
                  </Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Activity Feed */}
        <Card className="bg-card border-border">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold">Recent Activity</CardTitle>
          </CardHeader>
          <CardContent className="p-4 pt-0">
            <ScrollArea className="h-72">
              <div className="space-y-3">
                {activities.length === 0 ? (
                  <p className="text-xs text-muted-foreground text-center py-4">No activity yet</p>
                ) : (
                  activities.slice(0, 10).map((activity) => {
                    const Icon = activityTypeIcons[activity.type] || Clock;
                    return (
                      <div key={activity.id} className="flex gap-2.5">
                        <div className={`mt-0.5 shrink-0 ${activityTypeColors[activity.type]}`}>
                          <Icon className="w-3.5 h-3.5" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-xs text-foreground">
                            <span className="font-medium">{activity.agentName || 'System'}</span>{' '}
                            <span className="text-muted-foreground">{activity.action}</span>
                          </p>
                          {activity.details && (
                            <p className="text-[10px] text-muted-foreground mt-0.5 truncate">
                              {activity.details}
                            </p>
                          )}
                          <p className="text-[10px] text-muted-foreground/60 mt-0.5">
                            {new Date(activity.createdAt).toLocaleTimeString()}
                          </p>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions */}
      <Card className="bg-card border-border">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-semibold">Quick Actions</CardTitle>
        </CardHeader>
        <CardContent className="p-4 pt-0">
          <div className="flex flex-wrap gap-3">
            <Button
              onClick={() => setActiveView('agents')}
              className="bg-emerald-600 hover:bg-emerald-700 text-white"
            >
              <Plus className="w-4 h-4 mr-1.5" />
              New Agent
            </Button>
            <Button
              onClick={() => setActiveView('tasks')}
              variant="outline"
              className="border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/10"
            >
              <Plus className="w-4 h-4 mr-1.5" />
              New Task
            </Button>
            <Button
              onClick={() => setActiveView('memory')}
              variant="outline"
              className="border-purple-500/30 text-purple-400 hover:bg-purple-500/10"
            >
              <Plus className="w-4 h-4 mr-1.5" />
              New Memory
            </Button>
            <Button
              onClick={() => setActiveView('chat')}
              variant="outline"
              className="border-blue-500/30 text-blue-400 hover:bg-blue-500/10"
            >
              <ArrowUp className="w-4 h-4 mr-1.5" />
              Start Chat
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* System Health */}
      <Card className="bg-card border-border">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-semibold">System Health</CardTitle>
        </CardHeader>
        <CardContent className="p-4 pt-0">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="flex items-center gap-3">
              <div className="w-2 h-2 rounded-full bg-emerald-500" />
              <div>
                <p className="text-xs text-muted-foreground">Database</p>
                <p className="text-sm font-medium text-emerald-400">Connected</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="w-2 h-2 rounded-full bg-emerald-500" />
              <div>
                <p className="text-xs text-muted-foreground">AI Engine</p>
                <p className="text-sm font-medium text-emerald-400">Ready</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Zap className="w-4 h-4 text-yellow-400" />
              <div>
                <p className="text-xs text-muted-foreground">Automations</p>
                <p className="text-sm font-medium text-yellow-400">{stats?.runningAutomations ?? 0} Active</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

'use client';

import { useEffect, useState, useCallback } from 'react';
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
  Wrench,
  Target,
  Mic,
  Plug,
  Lightbulb,
  RefreshCw,
  Globe,
  Server,
  Cpu,
  HardDrive,
  Timer,
  XCircle,
} from 'lucide-react';
import {
  PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, AreaChart, Area,
} from 'recharts';

interface Agent {
  id: string; name: string; type: string; status: string; avatar: string | null; description: string;
}

interface ActivityItem {
  id: string; agentName: string | null; action: string; details: string | null; type: string; createdAt: string;
}

interface Skill {
  id: string; name: string; category: string; isAutoLearned: boolean; createdAt: string;
}

interface Goal {
  id: string; title: string; status: string; progress: number; agent?: { id: string; name: string; avatar: string | null } | null;
}

interface Stats {
  totalAgents: number; activeAgents: number; tasksCompleted: number; memoryEntries: number;
  totalTasks: number; runningAutomations: number; totalSkills: number; totalGoals: number;
  activeGoals: number; mcpConnections: number; totalMcpServers: number;
  totalCronJobs: number; activeCronJobs: number; cronRunsToday: number;
  agentsByStatus: { status: string; _count: number }[];
  tasksByStatus: { status: string; _count: number }[];
}

interface HealthData {
  status: string; uptime: number; version: string; environment: string; responseTime: number;
  checks: { database: { status: string; latency?: number }; memory: { status: string; details: { heapUsedMB: number; heapTotalMB: number; heapPercent: number } } };
}

interface CronStatus {
  scheduler: { isRunning: boolean; tickInterval: number };
  stats: { totalJobs: number; activeJobs: number; recentExecutions: number; failedToday: number };
  nextDue: { id: string; name: string; nextRunAt: string; action: string } | null;
}

const statusColors: Record<string, string> = { idle: 'bg-slate-500', running: 'bg-emerald-500', error: 'bg-red-500', paused: 'bg-yellow-500' };
const activityTypeColors: Record<string, string> = { info: 'text-blue-400', success: 'text-emerald-400', warning: 'text-yellow-400', error: 'text-red-400' };
const activityTypeIcons: Record<string, React.ElementType> = { info: Clock, success: CheckCircle2, warning: AlertCircle, error: AlertCircle };
const CHART_COLORS = ['#10b981', '#6366f1', '#f59e0b', '#ec4899', '#8b5cf6', '#06b6d4'];

function CustomTooltip({ active, payload, label }: { active?: boolean; payload?: Array<{ name: string; value: number; color: string }>; label?: string }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-card border border-border rounded-lg px-3 py-2 shadow-lg">
      {label && <p className="text-xs text-muted-foreground mb-1">{label}</p>}
      {payload.map((p, i) => <p key={i} className="text-xs font-medium" style={{ color: p.color }}>{p.name}: {p.value}</p>)}
    </div>
  );
}

function formatUptime(seconds: number): string {
  const d = Math.floor(seconds / 86400); const h = Math.floor((seconds % 86400) / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  if (d > 0) return `${d}d ${h}h ${m}m`;
  if (h > 0) return `${h}h ${m}m`;
  return `${m}m`;
}

export function Dashboard() {
  const { setActiveView } = useAppStore();
  const [stats, setStats] = useState<Stats | null>(null);
  const [health, setHealth] = useState<HealthData | null>(null);
  const [cronStatus, setCronStatus] = useState<CronStatus | null>(null);
  const [agents, setAgents] = useState<Agent[]>([]);
  const [activities, setActivities] = useState<ActivityItem[]>([]);
  const [skills, setSkills] = useState<Skill[]>([]);
  const [goals, setGoals] = useState<Goal[]>([]);
  const [loading, setLoading] = useState(true);

  const loadData = useCallback(async () => {
    try {
      const [statsRes, healthRes, cronRes, agentsRes, activityRes, skillsRes, goalsRes] = await Promise.all([
        fetch('/api/stats'), fetch('/api/health'), fetch('/api/cron/status'),
        fetch('/api/agents'), fetch('/api/activity'), fetch('/api/skills?category=all'), fetch('/api/goals'),
      ]);
      if (statsRes.ok) setStats(await statsRes.json());
      if (healthRes.ok) setHealth(await healthRes.json());
      if (cronRes.ok) setCronStatus(await cronRes.json());
      if (agentsRes.ok) setAgents(await agentsRes.json());
      if (activityRes.ok) setActivities(await activityRes.json());
      if (skillsRes.ok) setSkills(await skillsRes.json());
      if (goalsRes.ok) setGoals(await goalsRes.json());
    } catch (error) { console.error('Failed to load dashboard:', error); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  // Auto-refresh health every 30s
  useEffect(() => {
    const interval = setInterval(async () => {
      try { const res = await fetch('/api/health'); if (res.ok) setHealth(await res.json()); } catch {}
    }, 30_000);
    return () => clearInterval(interval);
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" />
          <span className="text-sm text-muted-foreground">Loading Hermes Agent OS...</span>
        </div>
      </div>
    );
  }

  const statCards = [
    { label: 'Agents', value: stats?.totalAgents ?? 0, icon: Bot, color: 'text-emerald-400' },
    { label: 'Tasks Done', value: stats?.tasksCompleted ?? 0, icon: CheckCircle2, color: 'text-yellow-400' },
    { label: 'Skills', value: stats?.totalSkills ?? 0, icon: Wrench, color: 'text-purple-400' },
    { label: 'Goals', value: stats?.totalGoals ?? 0, icon: Target, color: 'text-orange-400' },
    { label: 'Memory', value: stats?.memoryEntries ?? 0, icon: Brain, color: 'text-blue-400' },
    { label: 'Cron Jobs', value: stats?.activeCronJobs ?? 0, icon: Clock, color: 'text-cyan-400' },
  ];

  const activeGoals = goals.filter(g => g.status === 'active');
  const agentStatusData = (stats?.agentsByStatus || []).map(s => ({ name: s.status.charAt(0).toUpperCase() + s.status.slice(1), value: s._count }));
  if (!agentStatusData.find(d => d.name === 'Idle')) agentStatusData.push({ name: 'Idle', value: 0 });
  if (!agentStatusData.find(d => d.name === 'Running')) agentStatusData.push({ name: 'Running', value: 0 });
  const taskStatusData = (stats?.tasksByStatus || []).map(s => ({ name: s.status.replace('-', ' ').replace(/\b\w/g, l => l.toUpperCase()), count: s._count }));
  const goalsChartData = activeGoals.slice(0, 6).map(g => ({ name: g.title.length > 20 ? g.title.slice(0, 20) + '...' : g.title, progress: g.progress }));
  const activityTimeline = activities.slice(0, 7).map((a, i) => ({ time: new Date(a.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }), events: 7 - i })).reverse();

  const overallHealthy = health?.status === 'healthy' || health?.status === 'degraded';

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Dashboard</h1>
          <p className="text-sm text-muted-foreground">Hermes Agent OS — your AI agent command center</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" onClick={loadData} className="text-muted-foreground hover:text-foreground">
            <RefreshCw className="w-3.5 h-3.5 mr-1" /> Refresh
          </Button>
          <div className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border ${
            health?.status === 'healthy' ? 'bg-emerald-500/10 border-emerald-500/20' :
            health?.status === 'degraded' ? 'bg-yellow-500/10 border-yellow-500/20' :
            'bg-red-500/10 border-red-500/20'
          }`}>
            <div className={`w-2 h-2 rounded-full ${
              health?.status === 'healthy' ? 'bg-emerald-500' :
              health?.status === 'degraded' ? 'bg-yellow-500' : 'bg-red-500'
            } ${health?.status === 'healthy' ? 'pulse-emerald' : ''}`} />
            <span className={`text-xs font-medium ${
              health?.status === 'healthy' ? 'text-emerald-400' :
              health?.status === 'degraded' ? 'text-yellow-400' : 'text-red-400'
            }`}>
              {health?.status === 'healthy' ? 'All Systems Operational' :
               health?.status === 'degraded' ? 'System Degraded' : 'System Issues'}
            </span>
          </div>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
        {statCards.map(stat => {
          const Icon = stat.icon;
          return (
            <Card key={stat.label} className="bg-card border-border hover:border-emerald-500/30 transition-colors">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs text-muted-foreground font-medium">{stat.label}</p>
                    <p className="text-2xl font-bold text-foreground mt-1">{stat.value}</p>
                  </div>
                  <div className={`p-2.5 rounded-lg bg-card ${stat.color}`}><Icon className="w-5 h-5" /></div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* System Health + Cron Scheduler Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* System Health */}
        <Card className="bg-card border-border">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <Server className="w-4 h-4 text-emerald-400" /> System Health
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 pt-0">
            <div className="grid grid-cols-2 gap-4">
              <div className="flex items-center gap-3">
                <div className={`w-2 h-2 rounded-full ${health?.checks?.database?.status === 'healthy' ? 'bg-emerald-500' : 'bg-red-500'}`} />
                <div>
                  <p className="text-xs text-muted-foreground">Database</p>
                  <p className={`text-sm font-medium ${health?.checks?.database?.status === 'healthy' ? 'text-emerald-400' : 'text-red-400'}`}>
                    {health?.checks?.database?.status === 'healthy' ? 'Connected' : 'Issues'}
                    {health?.checks?.database?.latency ? ` (${health.checks.database.latency}ms)` : ''}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <Cpu className="w-4 h-4 text-blue-400" />
                <div>
                  <p className="text-xs text-muted-foreground">Heap Usage</p>
                  <p className={`text-sm font-medium ${health?.checks?.memory?.details?.heapPercent && health.checks.memory.details.heapPercent > 85 ? 'text-yellow-400' : 'text-blue-400'}`}>
                    {health?.checks?.memory?.details ? `${health.checks.memory.details.heapUsedMB}MB / ${health.checks.memory.details.heapTotalMB}MB (${health.checks.memory.details.heapPercent}%)` : 'N/A'}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <Timer className="w-4 h-4 text-purple-400" />
                <div>
                  <p className="text-xs text-muted-foreground">Uptime</p>
                  <p className="text-sm font-medium text-purple-400">{health?.uptime ? formatUptime(health.uptime) : 'N/A'}</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <Plug className="w-4 h-4 text-blue-400" />
                <div>
                  <p className="text-xs text-muted-foreground">MCP / AI</p>
                  <p className="text-sm font-medium text-blue-400">{stats?.mcpConnections ?? 0}/{stats?.totalMcpServers ?? 0} MCP · Ready</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Cron Scheduler Status */}
        <Card className="bg-card border-border">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <Clock className="w-4 h-4 text-cyan-400" /> Cron Scheduler
              </CardTitle>
              <Button variant="ghost" size="sm" className="text-xs text-emerald-400" onClick={() => setActiveView('automations')}>View All</Button>
            </div>
          </CardHeader>
          <CardContent className="p-4 pt-0">
            <div className="grid grid-cols-2 gap-4">
              <div className="flex items-center gap-3">
                <div className={`w-2 h-2 rounded-full ${cronStatus?.scheduler?.isRunning ? 'bg-emerald-500' : 'bg-red-500'}`} />
                <div>
                  <p className="text-xs text-muted-foreground">Status</p>
                  <p className={`text-sm font-medium ${cronStatus?.scheduler?.isRunning ? 'text-emerald-400' : 'text-red-400'}`}>
                    {cronStatus?.scheduler?.isRunning ? 'Running' : 'Stopped'}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <Activity className="w-4 h-4 text-cyan-400" />
                <div>
                  <p className="text-xs text-muted-foreground">Active Jobs</p>
                  <p className="text-sm font-medium text-cyan-400">{cronStatus?.stats?.activeJobs ?? 0} / {cronStatus?.stats?.totalJobs ?? 0}</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <Zap className="w-4 h-4 text-yellow-400" />
                <div>
                  <p className="text-xs text-muted-foreground">Runs (24h)</p>
                  <p className="text-sm font-medium text-yellow-400">{cronStatus?.stats?.recentExecutions ?? 0}</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                {cronStatus?.stats?.failedToday && cronStatus.stats.failedToday > 0 ? <XCircle className="w-4 h-4 text-red-400" /> : <CheckCircle2 className="w-4 h-4 text-emerald-400" />}
                <div>
                  <p className="text-xs text-muted-foreground">Failures (24h)</p>
                  <p className={`text-sm font-medium ${cronStatus?.stats?.failedToday && cronStatus.stats.failedToday > 0 ? 'text-red-400' : 'text-emerald-400'}`}>
                    {cronStatus?.stats?.failedToday ?? 0}
                  </p>
                </div>
              </div>
            </div>
            {cronStatus?.nextDue && (
              <div className="mt-3 pt-3 border-t border-border/50 flex items-center gap-2">
                <Clock className="w-3.5 h-3.5 text-muted-foreground" />
                <span className="text-xs text-muted-foreground">Next: </span>
                <span className="text-xs text-foreground font-medium">{cronStatus.nextDue.name}</span>
                <span className="text-xs text-muted-foreground">· {new Date(cronStatus.nextDue.nextRunAt).toLocaleString()}</span>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <Card className="bg-card border-border">
          <CardHeader className="pb-2"><CardTitle className="text-sm font-semibold">Agent Distribution</CardTitle></CardHeader>
          <CardContent className="p-4 pt-0">
            <ResponsiveContainer width="100%" height={180}>
              <PieChart>
                <Pie data={agentStatusData.filter(d => d.value > 0)} cx="50%" cy="50%" innerRadius={45} outerRadius={70} paddingAngle={4} dataKey="value">
                  {agentStatusData.map((_, index) => <Cell key={`cell-${index}`} fill={CHART_COLORS[index % CHART_COLORS.length]} />)}
                </Pie>
                <Tooltip content={<CustomTooltip />} />
              </PieChart>
            </ResponsiveContainer>
            <div className="flex flex-wrap justify-center gap-3 mt-2">
              {agentStatusData.filter(d => d.value > 0).map((entry, i) => (
                <div key={entry.name} className="flex items-center gap-1.5">
                  <div className="w-2 h-2 rounded-full" style={{ backgroundColor: CHART_COLORS[i % CHART_COLORS.length] }} />
                  <span className="text-[10px] text-muted-foreground">{entry.name} ({entry.value})</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card className="bg-card border-border">
          <CardHeader className="pb-2"><CardTitle className="text-sm font-semibold">Tasks Overview</CardTitle></CardHeader>
          <CardContent className="p-4 pt-0">
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={taskStatusData} barSize={32}>
                <XAxis dataKey="name" tick={{ fontSize: 10, fill: '#64748b' }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 10, fill: '#64748b' }} axisLine={false} tickLine={false} allowDecimals={false} />
                <Tooltip content={<CustomTooltip />} />
                <Bar dataKey="count" name="Tasks" radius={[4, 4, 0, 0]}>
                  {taskStatusData.map((_, index) => <Cell key={`bar-${index}`} fill={CHART_COLORS[index % CHART_COLORS.length]} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card className="bg-card border-border">
          <CardHeader className="pb-2"><CardTitle className="text-sm font-semibold">Activity Timeline</CardTitle></CardHeader>
          <CardContent className="p-4 pt-0">
            <ResponsiveContainer width="100%" height={200}>
              <AreaChart data={activityTimeline}>
                <defs>
                  <linearGradient id="activityGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <XAxis dataKey="time" tick={{ fontSize: 10, fill: '#64748b' }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 10, fill: '#64748b' }} axisLine={false} tickLine={false} allowDecimals={false} />
                <Tooltip content={<CustomTooltip />} />
                <Area type="monotone" dataKey="events" name="Events" stroke="#10b981" fill="url(#activityGradient)" strokeWidth={2} />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Agent Status Grid + Activity Feed */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <Card className="bg-card border-border lg:col-span-2">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-semibold">Agent Status</CardTitle>
              <Button variant="ghost" size="sm" className="text-xs text-emerald-400" onClick={() => setActiveView('agents')}>View All</Button>
            </div>
          </CardHeader>
          <CardContent className="p-4 pt-0">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {agents.map(agent => (
                <div key={agent.id} className="flex items-center gap-3 p-3 rounded-lg bg-secondary/50 border border-border hover:border-emerald-500/20 transition-colors cursor-pointer" onClick={() => setActiveView('agents')}>
                  <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-card text-lg shrink-0">{agent.avatar || '🤖'}</div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-foreground truncate">{agent.name}</p>
                    <div className="flex items-center gap-1.5 mt-0.5">
                      <div className={`w-1.5 h-1.5 rounded-full ${statusColors[agent.status] || 'bg-slate-500'} ${agent.status === 'running' ? 'pulse-emerald' : ''}`} />
                      <span className="text-[10px] text-muted-foreground capitalize">{agent.status}</span>
                    </div>
                  </div>
                  <Badge variant="outline" className="text-[10px] shrink-0 capitalize">{agent.type}</Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card className="bg-card border-border">
          <CardHeader className="pb-2"><CardTitle className="text-sm font-semibold">Recent Activity</CardTitle></CardHeader>
          <CardContent className="p-4 pt-0">
            <ScrollArea className="h-72">
              <div className="space-y-3">
                {activities.length === 0 ? (
                  <p className="text-xs text-muted-foreground text-center py-4">No activity yet</p>
                ) : activities.slice(0, 10).map(activity => {
                  const Icon = activityTypeIcons[activity.type] || Clock;
                  return (
                    <div key={activity.id} className="flex gap-2.5">
                      <div className={`mt-0.5 shrink-0 ${activityTypeColors[activity.type]}`}><Icon className="w-3.5 h-3.5" /></div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs text-foreground"><span className="font-medium">{activity.agentName || 'System'}</span> <span className="text-muted-foreground">{activity.action}</span></p>
                        {activity.details && <p className="text-[10px] text-muted-foreground mt-0.5 truncate">{activity.details}</p>}
                        <p className="text-[10px] text-muted-foreground/60 mt-0.5">{new Date(activity.createdAt).toLocaleTimeString()}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>
      </div>

      {/* Learning Loop + Goals Progress */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card className="bg-card border-border">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-semibold">Learning Loop</CardTitle>
              <Button variant="ghost" size="sm" className="text-xs text-emerald-400" onClick={() => setActiveView('skills')}>View All</Button>
            </div>
          </CardHeader>
          <CardContent className="p-4 pt-0">
            <ScrollArea className="h-48">
              <div className="space-y-2.5">
                {skills.filter(s => s.isAutoLearned).map(skill => (
                  <div key={skill.id} className="flex items-center gap-2.5 p-2.5 rounded-lg bg-secondary/50 border border-border">
                    <Lightbulb className="w-4 h-4 text-yellow-400 shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium truncate">{skill.name}</p>
                      <p className="text-[10px] text-muted-foreground">Auto-learned · {skill.category}</p>
                    </div>
                    <Badge variant="outline" className="text-[9px] bg-yellow-500/20 text-yellow-400 border-yellow-500/30 shrink-0">Auto</Badge>
                  </div>
                ))}
                {skills.filter(s => s.isAutoLearned).length === 0 && <p className="text-xs text-muted-foreground text-center py-4">No auto-learned skills yet</p>}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>

        <Card className="bg-card border-border">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-semibold">Goals Progress</CardTitle>
              <Button variant="ghost" size="sm" className="text-xs text-emerald-400" onClick={() => setActiveView('goals')}>View All</Button>
            </div>
          </CardHeader>
          <CardContent className="p-4 pt-0">
            {goalsChartData.length > 0 ? (
              <ResponsiveContainer width="100%" height={180}>
                <BarChart data={goalsChartData} layout="vertical" barSize={14}>
                  <defs>
                    <linearGradient id="goalGradient" x1="0" y1="0" x2="1" y2="0">
                      <stop offset="0%" stopColor="#10b981" stopOpacity={0.8} />
                      <stop offset="100%" stopColor="#10b981" stopOpacity={0.4} />
                    </linearGradient>
                  </defs>
                  <XAxis type="number" domain={[0, 100]} tick={{ fontSize: 10, fill: '#64748b' }} axisLine={false} tickLine={false} />
                  <YAxis type="category" dataKey="name" width={100} tick={{ fontSize: 10, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                  <Tooltip content={<CustomTooltip />} />
                  <Bar dataKey="progress" name="Progress" fill="url(#goalGradient)" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-48"><p className="text-xs text-muted-foreground">No active goals</p></div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions */}
      <Card className="bg-card border-border">
        <CardHeader className="pb-2"><CardTitle className="text-sm font-semibold">Quick Actions</CardTitle></CardHeader>
        <CardContent className="p-4 pt-0">
          <div className="flex flex-wrap gap-3">
            <Button onClick={() => setActiveView('agents')} className="bg-emerald-600 hover:bg-emerald-700 text-white"><Plus className="w-4 h-4 mr-1.5" />New Agent</Button>
            <Button onClick={() => setActiveView('tasks')} variant="outline" className="border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/10"><Plus className="w-4 h-4 mr-1.5" />New Task</Button>
            <Button onClick={() => setActiveView('skills')} variant="outline" className="border-purple-500/30 text-purple-400 hover:bg-purple-500/10"><Plus className="w-4 h-4 mr-1.5" />New Skill</Button>
            <Button onClick={() => setActiveView('goals')} variant="outline" className="border-orange-500/30 text-orange-400 hover:bg-orange-500/10"><Target className="w-4 h-4 mr-1.5" />New Goal</Button>
            <Button onClick={() => setActiveView('voice')} variant="outline" className="border-pink-500/30 text-pink-400 hover:bg-pink-500/10"><Mic className="w-4 h-4 mr-1.5" />Voice Control</Button>
            <Button onClick={() => setActiveView('dev')} variant="outline" className="border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/10"><Globe className="w-4 h-4 mr-1.5" />Dev Server</Button>
            <Button onClick={() => setActiveView('chat')} variant="outline" className="border-blue-500/30 text-blue-400 hover:bg-blue-500/10"><ArrowUp className="w-4 h-4 mr-1.5" />Start Chat</Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

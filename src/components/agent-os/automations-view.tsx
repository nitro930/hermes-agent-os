'use client';

import { useEffect, useState, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
  DialogDescription,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Plus,
  Trash2,
  Zap,
  Clock,
  MessageSquare,
  Kanban,
  Bot,
  Bell,
  Play,
  Loader2,
  CheckCircle2,
  XCircle,
  Globe,
  Calendar,
  Activity,
  Timer,
  Server,
  ExternalLink,
  ChevronDown,
  ChevronUp,
  Copy,
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { SCHEDULE_PRESETS } from '@/lib/cron-parser';

// ─── Types ──────────────────────────────────────────────────────────────────

interface Automation {
  id: string;
  name: string;
  description: string | null;
  trigger: string;
  action: string;
  config: string;
  isActive: boolean;
  lastRunAt: string | null;
  createdAt: string;
}

interface CronJob {
  id: string;
  name: string;
  description: string | null;
  schedule: string;
  timezone: string;
  action: string;
  config: string;
  isActive: boolean;
  isSystem: boolean;
  lastRunAt: string | null;
  nextRunAt: string | null;
  runCount: number;
  failCount: number;
  lastError: string | null;
  lastDuration: number | null;
  scheduleDescription?: string;
  agent?: { id: string; name: string; avatar: string | null } | null;
  _count?: { executions: number };
  createdAt: string;
}

interface CronExecution {
  id: string;
  cronJobId: string;
  status: string;
  startedAt: string;
  completedAt: string | null;
  duration: number | null;
  error: string | null;
  triggerType: string;
}

interface CronStatus {
  scheduler: { isRunning: boolean; tickInterval: number; jobTimeout: number };
  stats: { totalJobs: number; activeJobs: number; recentExecutions: number; failedToday: number };
  nextDue: { id: string; name: string; nextRunAt: string; action: string } | null;
}

// ─── Constants ──────────────────────────────────────────────────────────────

const triggerIcons: Record<string, React.ElementType> = {
  on_message: MessageSquare,
  on_task_create: Kanban,
  on_schedule: Clock,
  on_agent_idle: Bot,
};

const triggerLabels: Record<string, string> = {
  on_message: 'On Message',
  on_task_create: 'On Task Create',
  on_schedule: 'On Schedule',
  on_agent_idle: 'On Agent Idle',
};

const actionIcons: Record<string, React.ElementType> = {
  send_message: MessageSquare,
  create_task: Kanban,
  run_agent: Play,
  notify: Bell,
  webhook: Globe,
};

const actionLabels: Record<string, string> = {
  send_message: 'Send Message',
  create_task: 'Create Task',
  run_agent: 'Run Agent',
  notify: 'Notify',
  webhook: 'Webhook',
};

const actionColors: Record<string, string> = {
  run_agent: 'text-blue-400',
  create_task: 'text-emerald-400',
  send_message: 'text-purple-400',
  notify: 'text-yellow-400',
  webhook: 'text-cyan-400',
};

function formatRelativeTime(dateStr: string | null): string {
  if (!dateStr) return 'Never';
  const diff = new Date(dateStr).getTime() - Date.now();
  if (diff < 0) {
    // Past
    const ago = Math.abs(diff);
    if (ago < 60_000) return 'Just now';
    if (ago < 3600_000) return `${Math.floor(ago / 60_000)}m ago`;
    if (ago < 86400_000) return `${Math.floor(ago / 3600_000)}h ago`;
    return `${Math.floor(ago / 86400_000)}d ago`;
  }
  // Future
  if (diff < 60_000) return 'In <1m';
  if (diff < 3600_000) return `In ${Math.floor(diff / 60_000)}m`;
  if (diff < 86400_000) return `In ${Math.floor(diff / 3600_000)}h`;
  return `In ${Math.floor(diff / 86400_000)}d`;
}

function formatDuration(ms: number | null): string {
  if (ms === null || ms === undefined) return '-';
  if (ms < 1000) return `${ms}ms`;
  return `${(ms / 1000).toFixed(1)}s`;
}

// ─── Component ──────────────────────────────────────────────────────────────

export function AutomationsView() {
  const { toast } = useToast();
  const [automations, setAutomations] = useState<Automation[]>([]);
  const [cronJobs, setCronJobs] = useState<CronJob[]>([]);
  const [cronStatus, setCronStatus] = useState<CronStatus | null>(null);
  const [agents, setAgents] = useState<{ id: string; name: string; avatar: string | null }[]>([]);
  const [loading, setLoading] = useState(true);
  const [createOpen, setCreateOpen] = useState(false);
  const [createCronOpen, setCreateCronOpen] = useState(false);
  const [executingId, setExecutingId] = useState<string | null>(null);
  const [expandedJob, setExpandedJob] = useState<string | null>(null);
  const [jobExecutions, setJobExecutions] = useState<CronExecution[]>([]);
  const [activeTab, setActiveTab] = useState('automations');
  const [newAutomation, setNewAutomation] = useState({
    name: '', description: '', trigger: 'on_message', action: 'send_message',
  });
  const [newCronJob, setNewCronJob] = useState({
    name: '', description: '', schedule: '0 * * * *', timezone: 'UTC',
    action: 'run_agent' as const, config: '{"agentId":"","prompt":"Execute your current tasks and report status."}',
    agentId: '',
  });
  const [configError, setConfigError] = useState<string | null>(null);

  const loadAutomations = useCallback(async () => {
    try {
      const res = await fetch('/api/automations');
      if (res.ok) setAutomations(await res.json());
    } catch (error) {
      console.error('Failed to load automations:', error);
    }
  }, []);

  const loadCronJobs = useCallback(async () => {
    try {
      const [jobsRes, statusRes, agentsRes] = await Promise.all([
        fetch('/api/cron/jobs'),
        fetch('/api/cron/status'),
        fetch('/api/agents?take=100'),
      ]);
      if (jobsRes.ok) {
        const data = await jobsRes.json();
        setCronJobs(data.jobs || data);
      }
      if (statusRes.ok) setCronStatus(await statusRes.json());
      if (agentsRes.ok) {
        const data = await agentsRes.json();
        setAgents(Array.isArray(data) ? data.map((a: { id: string; name: string; avatar: string | null }) => ({ id: a.id, name: a.name, avatar: a.avatar })) : []);
      }
    } catch (error) {
      console.error('Failed to load cron jobs:', error);
    }
  }, []);

  useEffect(() => {
    Promise.all([loadAutomations(), loadCronJobs()]).finally(() => setLoading(false));
  }, [loadAutomations, loadCronJobs]);

  // Refresh cron jobs every 30s to update nextRunAt
  useEffect(() => {
    const interval = setInterval(loadCronJobs, 30_000);
    return () => clearInterval(interval);
  }, [loadCronJobs]);

  async function createAutomation() {
    try {
      const res = await fetch('/api/automations', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newAutomation),
      });
      if (res.ok) {
        toast({ title: 'Automation created' });
        setCreateOpen(false);
        setNewAutomation({ name: '', description: '', trigger: 'on_message', action: 'send_message' });
        loadAutomations();
      }
    } catch { toast({ title: 'Failed to create automation', variant: 'destructive' }); }
  }

  async function toggleAutomation(id: string, isActive: boolean) {
    try {
      const res = await fetch(`/api/automations/${id}`, {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isActive: !isActive }),
      });
      if (res.ok) { toast({ title: `Automation ${!isActive ? 'activated' : 'deactivated'}` }); loadAutomations(); }
    } catch { toast({ title: 'Failed to toggle', variant: 'destructive' }); }
  }

  async function deleteAutomation(id: string) {
    try {
      const res = await fetch(`/api/automations/${id}`, { method: 'DELETE' });
      if (res.ok) { toast({ title: 'Automation deleted' }); loadAutomations(); }
    } catch { toast({ title: 'Failed to delete', variant: 'destructive' }); }
  }

  async function executeAutomation(id: string) {
    setExecutingId(id);
    try {
      const res = await fetch(`/api/automations/${id}/execute`, { method: 'POST' });
      if (res.ok) { toast({ title: 'Automation executed', description: 'Check activity log for results' }); loadAutomations(); }
      else { const d = await res.json(); toast({ title: 'Execution failed', description: d.error, variant: 'destructive' }); }
    } catch { toast({ title: 'Failed to execute', variant: 'destructive' }); }
    finally { setExecutingId(null); }
  }

  async function createCronJob() {
    setConfigError(null);
    // Validate config is valid JSON
    try { JSON.parse(newCronJob.config); } catch { setConfigError('Config must be valid JSON'); return; }

    // Inject agentId into config if applicable
    let config = { ...JSON.parse(newCronJob.config) };
    if (newCronJob.agentId && (newCronJob.action === 'run_agent' || newCronJob.action === 'send_message')) {
      config.agentId = newCronJob.agentId;
    }

    try {
      const res = await fetch('/api/cron/jobs', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...newCronJob, config: JSON.stringify(config), agentId: newCronJob.agentId || undefined }),
      });
      if (res.ok) {
        toast({ title: 'Cron job created', description: `Scheduled: ${newCronJob.schedule}` });
        setCreateCronOpen(false);
        setNewCronJob({ name: '', description: '', schedule: '0 * * * *', timezone: 'UTC', action: 'run_agent', config: '{"agentId":"","prompt":"Execute your current tasks and report status."}', agentId: '' });
        loadCronJobs();
      } else {
        const d = await res.json();
        toast({ title: 'Failed to create cron job', description: d.error || d.details, variant: 'destructive' });
      }
    } catch { toast({ title: 'Failed to create cron job', variant: 'destructive' }); }
  }

  async function toggleCronJob(id: string, isActive: boolean) {
    try {
      const res = await fetch(`/api/cron/jobs/${id}`, {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isActive: !isActive }),
      });
      if (res.ok) { toast({ title: `Cron job ${!isActive ? 'activated' : 'paused'}` }); loadCronJobs(); }
    } catch { toast({ title: 'Failed to toggle', variant: 'destructive' }); }
  }

  async function deleteCronJob(id: string) {
    try {
      const res = await fetch(`/api/cron/jobs/${id}`, { method: 'DELETE' });
      if (res.ok) { toast({ title: 'Cron job deleted' }); loadCronJobs(); setExpandedJob(null); }
      else { const d = await res.json(); toast({ title: d.error, variant: 'destructive' }); }
    } catch { toast({ title: 'Failed to delete', variant: 'destructive' }); }
  }

  async function triggerCronJob(id: string) {
    setExecutingId(id);
    try {
      const res = await fetch(`/api/cron/jobs/${id}/execute`, { method: 'POST' });
      if (res.ok) { const d = await res.json(); toast({ title: 'Job executed', description: `Completed in ${formatDuration(d.duration)}` }); loadCronJobs(); }
      else { const d = await res.json(); toast({ title: 'Execution failed', description: d.error, variant: 'destructive' }); }
    } catch { toast({ title: 'Failed to execute', variant: 'destructive' }); }
    finally { setExecutingId(null); }
  }

  async function loadExecutions(jobId: string) {
    if (expandedJob === jobId) { setExpandedJob(null); return; }
    setExpandedJob(jobId);
    try {
      const res = await fetch(`/api/cron/jobs/${jobId}/executions?take=20`);
      if (res.ok) { const d = await res.json(); setJobExecutions(d.executions || d); }
    } catch { /* ignore */ }
  }

  function getDefaultConfig(action: string): string {
    switch (action) {
      case 'run_agent': return '{"agentId":"","prompt":"Execute your current tasks and report status."}';
      case 'create_task': return '{"taskTitle":"Scheduled Task","taskDescription":"Created by cron job","priority":"medium"}';
      case 'send_message': return '{"agentId":"","message":"Scheduled message from cron job"}';
      case 'notify': return '{"notificationTitle":"Cron Notification","notificationMessage":"Scheduled notification fired"}';
      case 'webhook': return '{"url":"https://hooks.example.com/trigger","method":"POST","headers":{},"body":{}}';
      default: return '{}';
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="w-8 h-8 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Automations & Cron</h1>
          <p className="text-sm text-muted-foreground">Event-driven rules and scheduled cron jobs</p>
        </div>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <div className="flex items-center justify-between">
          <TabsList className="bg-secondary">
            <TabsTrigger value="automations" className="gap-1.5">
              <Zap className="w-3.5 h-3.5" /> Automations
              {automations.length > 0 && <Badge variant="secondary" className="ml-1 text-[10px] px-1.5">{automations.length}</Badge>}
            </TabsTrigger>
            <TabsTrigger value="cron" className="gap-1.5">
              <Clock className="w-3.5 h-3.5" /> Cron Jobs
              {cronJobs.length > 0 && <Badge variant="secondary" className="ml-1 text-[10px] px-1.5">{cronJobs.filter(j => j.isActive).length}</Badge>}
            </TabsTrigger>
          </TabsList>

          {activeTab === 'automations' ? (
            <Dialog open={createOpen} onOpenChange={setCreateOpen}>
              <DialogTrigger asChild>
                <Button className="bg-emerald-600 hover:bg-emerald-700 text-white">
                  <Plus className="w-4 h-4 mr-1.5" /> New Automation
                </Button>
              </DialogTrigger>
              <DialogContent className="bg-card border-border">
                <DialogHeader>
                  <DialogTitle>Create Automation</DialogTitle>
                  <DialogDescription>Define an event-driven automation rule</DialogDescription>
                </DialogHeader>
                <div className="space-y-4">
                  <div className="space-y-2"><Label>Name</Label><Input value={newAutomation.name} onChange={(e) => setNewAutomation({ ...newAutomation, name: e.target.value })} placeholder="Automation name..." className="bg-secondary border-border" /></div>
                  <div className="space-y-2"><Label>Description</Label><Textarea value={newAutomation.description} onChange={(e) => setNewAutomation({ ...newAutomation, description: e.target.value })} placeholder="What does this automation do?" className="bg-secondary border-border" /></div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2"><Label>Trigger</Label><Select value={newAutomation.trigger} onValueChange={(v) => setNewAutomation({ ...newAutomation, trigger: v })}><SelectTrigger className="bg-secondary border-border"><SelectValue /></SelectTrigger><SelectContent className="bg-card border-border"><SelectItem value="on_message">On Message</SelectItem><SelectItem value="on_task_create">On Task Create</SelectItem><SelectItem value="on_schedule">On Schedule</SelectItem><SelectItem value="on_agent_idle">On Agent Idle</SelectItem></SelectContent></Select></div>
                    <div className="space-y-2"><Label>Action</Label><Select value={newAutomation.action} onValueChange={(v) => setNewAutomation({ ...newAutomation, action: v })}><SelectTrigger className="bg-secondary border-border"><SelectValue /></SelectTrigger><SelectContent className="bg-card border-border"><SelectItem value="send_message">Send Message</SelectItem><SelectItem value="create_task">Create Task</SelectItem><SelectItem value="run_agent">Run Agent</SelectItem><SelectItem value="notify">Notify</SelectItem></SelectContent></Select></div>
                  </div>
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setCreateOpen(false)}>Cancel</Button>
                  <Button className="bg-emerald-600 hover:bg-emerald-700 text-white" onClick={createAutomation} disabled={!newAutomation.name}>Create</Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          ) : (
            <Dialog open={createCronOpen} onOpenChange={setCreateCronOpen}>
              <DialogTrigger asChild>
                <Button className="bg-emerald-600 hover:bg-emerald-700 text-white">
                  <Plus className="w-4 h-4 mr-1.5" /> New Cron Job
                </Button>
              </DialogTrigger>
              <DialogContent className="bg-card border-border max-w-lg max-h-[85vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>Create Cron Job</DialogTitle>
                  <DialogDescription>Schedule a recurring task using cron expressions</DialogDescription>
                </DialogHeader>
                <div className="space-y-4">
                  <div className="space-y-2"><Label>Name</Label><Input value={newCronJob.name} onChange={(e) => setNewCronJob({ ...newCronJob, name: e.target.value })} placeholder="e.g., Daily Status Report" className="bg-secondary border-border" /></div>
                  <div className="space-y-2"><Label>Description</Label><Input value={newCronJob.description} onChange={(e) => setNewCronJob({ ...newCronJob, description: e.target.value })} placeholder="Optional description..." className="bg-secondary border-border" /></div>
                  <div className="space-y-2">
                    <Label>Schedule</Label>
                    <div className="flex gap-2">
                      <Input value={newCronJob.schedule} onChange={(e) => setNewCronJob({ ...newCronJob, schedule: e.target.value })} placeholder="*/5 * * * *" className="bg-secondary border-border font-mono text-sm flex-1" />
                      <Select onValueChange={(v) => setNewCronJob({ ...newCronJob, schedule: v })}>
                        <SelectTrigger className="bg-secondary border-border w-[140px]"><SelectValue placeholder="Presets" /></SelectTrigger>
                        <SelectContent className="bg-card border-border">
                          {SCHEDULE_PRESETS.map(p => <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>
                    <p className="text-[10px] text-muted-foreground">Format: minute hour day-of-month month day-of-week &middot; e.g. &quot;*/5 * * * *&quot; = every 5 min</p>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2"><Label>Action</Label><Select value={newCronJob.action} onValueChange={(v) => setNewCronJob({ ...newCronJob, action: v as typeof newCronJob.action, config: getDefaultConfig(v) })}><SelectTrigger className="bg-secondary border-border"><SelectValue /></SelectTrigger><SelectContent className="bg-card border-border"><SelectItem value="run_agent">Run Agent</SelectItem><SelectItem value="create_task">Create Task</SelectItem><SelectItem value="send_message">Send Message</SelectItem><SelectItem value="notify">Notify</SelectItem><SelectItem value="webhook">Webhook</SelectItem></SelectContent></Select></div>
                    <div className="space-y-2"><Label>Timezone</Label><Select value={newCronJob.timezone} onValueChange={(v) => setNewCronJob({ ...newCronJob, timezone: v })}><SelectTrigger className="bg-secondary border-border"><SelectValue /></SelectTrigger><SelectContent className="bg-card border-border"><SelectItem value="UTC">UTC</SelectItem><SelectItem value="America/New_York">EST (NY)</SelectItem><SelectItem value="America/Chicago">CST (Chicago)</SelectItem><SelectItem value="America/Los_Angeles">PST (LA)</SelectItem><SelectItem value="Europe/London">GMT (London)</SelectItem><SelectItem value="Europe/Berlin">CET (Berlin)</SelectItem><SelectItem value="Asia/Tokyo">JST (Tokyo)</SelectItem><SelectItem value="Asia/Shanghai">CST (Shanghai)</SelectItem></SelectContent></Select></div>
                  </div>
                  {(newCronJob.action === 'run_agent' || newCronJob.action === 'send_message') && (
                    <div className="space-y-2">
                      <Label>Agent</Label>
                      <Select value={newCronJob.agentId} onValueChange={(v) => setNewCronJob({ ...newCronJob, agentId: v })}>
                        <SelectTrigger className="bg-secondary border-border"><SelectValue placeholder="Select agent..." /></SelectTrigger>
                        <SelectContent className="bg-card border-border">
                          {agents.map(a => <SelectItem key={a.id} value={a.id}>{a.name}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>
                  )}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <Label>Config (JSON)</Label>
                      <Button variant="ghost" size="sm" className="h-6 text-[10px] text-muted-foreground" onClick={() => { navigator.clipboard.writeText(newCronJob.config); toast({ title: 'Copied' }); }}><Copy className="w-3 h-3 mr-1" />Copy</Button>
                    </div>
                    <Textarea value={newCronJob.config} onChange={(e) => { setNewCronJob({ ...newCronJob, config: e.target.value }); setConfigError(null); }} className="bg-secondary border-border font-mono text-xs min-h-[100px]" />
                    {configError && <p className="text-[10px] text-red-400">{configError}</p>}
                  </div>
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setCreateCronOpen(false)}>Cancel</Button>
                  <Button className="bg-emerald-600 hover:bg-emerald-700 text-white" onClick={createCronJob} disabled={!newCronJob.name}>Create Job</Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          )}
        </div>

        {/* ─── Automations Tab ─────────────────────────────────────────────── */}
        <TabsContent value="automations" className="mt-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {automations.map((automation) => {
              const TriggerIcon = triggerIcons[automation.trigger] || Zap;
              const ActionIcon = actionIcons[automation.action] || Zap;
              return (
                <Card key={automation.id} className={`bg-card border-border transition-all ${automation.isActive ? 'border-emerald-500/20' : 'opacity-60'}`}>
                  <CardHeader className="p-4 pb-2">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-sm font-medium flex items-center gap-2">
                        <Zap className={`w-4 h-4 ${automation.isActive ? 'text-emerald-400' : 'text-muted-foreground'}`} />
                        {automation.name}
                      </CardTitle>
                      <Switch checked={automation.isActive} onCheckedChange={() => toggleAutomation(automation.id, automation.isActive)} />
                    </div>
                  </CardHeader>
                  <CardContent className="p-4 pt-1">
                    <p className="text-xs text-muted-foreground mb-3">{automation.description || 'No description'}</p>
                    <div className="flex items-center gap-3 mb-3">
                      <div className="flex items-center gap-1.5"><TriggerIcon className="w-3.5 h-3.5 text-blue-400" /><span className="text-[10px] text-muted-foreground">{triggerLabels[automation.trigger] || automation.trigger}</span></div>
                      <span className="text-muted-foreground">→</span>
                      <div className="flex items-center gap-1.5"><ActionIcon className="w-3.5 h-3.5 text-emerald-400" /><span className="text-[10px] text-muted-foreground">{actionLabels[automation.action] || automation.action}</span></div>
                    </div>
                    <div className="flex items-center justify-between">
                      <Badge variant="outline" className={`text-[10px] ${automation.isActive ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30' : 'bg-slate-500/20 text-slate-400 border-slate-500/30'}`}>{automation.isActive ? 'Active' : 'Inactive'}</Badge>
                      <div className="flex items-center gap-1">
                        <Button variant="ghost" size="icon" className="w-7 h-7 text-emerald-400" onClick={() => executeAutomation(automation.id)} disabled={executingId === automation.id || !automation.isActive} title="Run Now">
                          {executingId === automation.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Play className="w-3.5 h-3.5" />}
                        </Button>
                        <Button variant="ghost" size="icon" className="w-7 h-7 text-red-400" onClick={() => deleteAutomation(automation.id)}><Trash2 className="w-3.5 h-3.5" /></Button>
                      </div>
                    </div>
                    {automation.lastRunAt && <p className="text-[10px] text-muted-foreground mt-2">Last run: {formatRelativeTime(automation.lastRunAt)}</p>}
                  </CardContent>
                </Card>
              );
            })}
          </div>
          {automations.length === 0 && (
            <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
              <Zap className="w-12 h-12 mb-3 text-emerald-500/40" />
              <p className="text-sm">No automations configured</p>
              <p className="text-xs mt-1">Create one to automate your workflows</p>
            </div>
          )}
        </TabsContent>

        {/* ─── Cron Jobs Tab ───────────────────────────────────────────────── */}
        <TabsContent value="cron" className="mt-4 space-y-4">
          {/* Scheduler Status Bar */}
          {cronStatus && (
            <Card className="bg-card border-border">
              <CardContent className="p-3 flex items-center gap-6 text-xs">
                <div className="flex items-center gap-2">
                  <Server className={`w-4 h-4 ${cronStatus.scheduler.isRunning ? 'text-emerald-400' : 'text-red-400'}`} />
                  <span className={cronStatus.scheduler.isRunning ? 'text-emerald-400' : 'text-red-400'}>
                    {cronStatus.scheduler.isRunning ? 'Scheduler Running' : 'Scheduler Stopped'}
                  </span>
                </div>
                <div className="flex items-center gap-1.5 text-muted-foreground">
                  <Activity className="w-3.5 h-3.5" />
                  {cronStatus.stats.activeJobs} active / {cronStatus.stats.totalJobs} total
                </div>
                <div className="flex items-center gap-1.5 text-muted-foreground">
                  <Timer className="w-3.5 h-3.5" />
                  {cronStatus.stats.recentExecutions} runs (24h)
                </div>
                {cronStatus.stats.failedToday > 0 && (
                  <div className="flex items-center gap-1.5 text-red-400">
                    <XCircle className="w-3.5 h-3.5" />
                    {cronStatus.stats.failedToday} failed (24h)
                  </div>
                )}
                {cronStatus.nextDue && (
                  <div className="flex items-center gap-1.5 text-muted-foreground ml-auto">
                    <Calendar className="w-3.5 h-3.5" />
                    Next: <span className="text-foreground">{cronStatus.nextDue.name}</span> &middot; {formatRelativeTime(cronStatus.nextDue.nextRunAt)}
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Cron Jobs List */}
          <div className="space-y-3">
            {cronJobs.map((job) => {
              const ActionIcon = actionIcons[job.action] || Clock;
              const isExpanded = expandedJob === job.id;
              return (
                <Card key={job.id} className={`bg-card border-border transition-all ${job.isActive ? 'border-emerald-500/20' : 'opacity-60'}`}>
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <Clock className={`w-4 h-4 ${job.isActive ? 'text-emerald-400' : 'text-muted-foreground'}`} />
                          <span className="font-medium text-sm truncate">{job.name}</span>
                          {job.isSystem && <Badge variant="outline" className="text-[9px] bg-blue-500/10 text-blue-400 border-blue-500/20">SYSTEM</Badge>}
                          {job.lastError && <Badge variant="outline" className="text-[9px] bg-red-500/10 text-red-400 border-red-500/20">ERROR</Badge>}
                        </div>
                        <p className="text-xs text-muted-foreground mb-2">{job.description || job.scheduleDescription || 'No description'}</p>
                        <div className="flex flex-wrap items-center gap-3 text-[11px]">
                          <div className="flex items-center gap-1">
                            <code className="bg-secondary px-1.5 py-0.5 rounded text-emerald-400 font-mono">{job.schedule}</code>
                            {job.scheduleDescription && <span className="text-muted-foreground">({job.scheduleDescription})</span>}
                          </div>
                          <div className="flex items-center gap-1">
                            <ActionIcon className={`w-3.5 h-3.5 ${actionColors[job.action] || 'text-muted-foreground'}`} />
                            <span className="text-muted-foreground">{actionLabels[job.action] || job.action}</span>
                          </div>
                          {job.agent && (
                            <div className="flex items-center gap-1">
                              <Bot className="w-3 h-3 text-blue-400" />
                              <span className="text-muted-foreground">{job.agent.name}</span>
                            </div>
                          )}
                          <div className="flex items-center gap-1">
                            <Globe className="w-3 h-3 text-muted-foreground" />
                            <span className="text-muted-foreground">{job.timezone}</span>
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <Switch checked={job.isActive} onCheckedChange={() => toggleCronJob(job.id, job.isActive)} />
                        <Button variant="ghost" size="icon" className="w-8 h-8 text-emerald-400" onClick={() => triggerCronJob(job.id)} disabled={executingId === job.id || !job.isActive} title="Run Now">
                          {executingId === job.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4" />}
                        </Button>
                        <Button variant="ghost" size="icon" className="w-8 h-8 text-red-400" onClick={() => deleteCronJob(job.id)} disabled={job.isSystem} title="Delete">
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>

                    {/* Stats Row */}
                    <div className="flex items-center gap-4 mt-3 pt-3 border-t border-border/50 text-[11px]">
                      <span className="text-muted-foreground">Runs: <span className="text-foreground">{job.runCount}</span></span>
                      {job.failCount > 0 && <span className="text-red-400">Failed: {job.failCount}</span>}
                      <span className="text-muted-foreground">Duration: <span className="text-foreground">{formatDuration(job.lastDuration)}</span></span>
                      <span className="text-muted-foreground">Last: <span className="text-foreground">{formatRelativeTime(job.lastRunAt)}</span></span>
                      <span className="text-muted-foreground">Next: <span className="text-emerald-400">{formatRelativeTime(job.nextRunAt)}</span></span>
                      {job.nextRunAt && (
                        <span className="text-muted-foreground ml-auto">
                          {new Date(job.nextRunAt).toLocaleString()}
                        </span>
                      )}
                    </div>

                    {/* Error Row */}
                    {job.lastError && (
                      <div className="mt-2 p-2 rounded bg-red-500/10 border border-red-500/20">
                        <p className="text-[10px] text-red-400 font-medium">Last Error:</p>
                        <p className="text-[10px] text-red-300/80 truncate">{job.lastError}</p>
                      </div>
                    )}

                    {/* Execution History Toggle */}
                    <Button variant="ghost" size="sm" className="w-full mt-2 h-7 text-[11px] text-muted-foreground" onClick={() => loadExecutions(job.id)}>
                      {isExpanded ? <ChevronUp className="w-3 h-3 mr-1" /> : <ChevronDown className="w-3 h-3 mr-1" />}
                      Execution History {job._count ? `(${job._count.executions || '?'})` : ''}
                    </Button>

                    {/* Execution History Panel */}
                    {isExpanded && (
                      <div className="mt-2 space-y-1 max-h-60 overflow-y-auto">
                        {jobExecutions.length === 0 ? (
                          <p className="text-[10px] text-muted-foreground text-center py-4">No executions yet</p>
                        ) : (
                          jobExecutions.map((ex) => (
                            <div key={ex.id} className={`flex items-center gap-3 p-2 rounded text-[11px] ${ex.status === 'success' ? 'bg-emerald-500/5' : ex.status === 'failed' ? 'bg-red-500/5' : 'bg-secondary'}`}>
                              {ex.status === 'success' ? <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" /> : ex.status === 'failed' ? <XCircle className="w-3.5 h-3.5 text-red-400" /> : <Loader2 className="w-3.5 h-3.5 animate-spin text-yellow-400" />}
                              <span className="text-muted-foreground">{new Date(ex.startedAt).toLocaleString()}</span>
                              <span className={ex.status === 'success' ? 'text-emerald-400' : ex.status === 'failed' ? 'text-red-400' : 'text-yellow-400'}>{ex.status}</span>
                              <span className="text-muted-foreground">{formatDuration(ex.duration)}</span>
                              {ex.triggerType === 'manual' && <Badge variant="outline" className="text-[9px] bg-blue-500/10 text-blue-400 border-blue-500/20">MANUAL</Badge>}
                              {ex.error && <span className="text-red-400 truncate flex-1">{ex.error}</span>}
                            </div>
                          ))
                        )}
                      </div>
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </div>

          {cronJobs.length === 0 && (
            <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
              <Clock className="w-12 h-12 mb-3 text-emerald-500/40" />
              <p className="text-sm">No cron jobs configured</p>
              <p className="text-xs mt-1">Create one to schedule recurring tasks</p>
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}

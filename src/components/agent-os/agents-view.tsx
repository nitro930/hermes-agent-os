'use client';

import { useEffect, useState, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
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
import { Label } from '@/components/ui/label';
import {
  Plus,
  Play,
  Pause,
  Square,
  Trash2,
  Bot,
  ChevronRight,
  X,
  Wrench,
  Target,
  Lightbulb,
  Pencil,
  Save,
  Users,
  Loader2,
  Zap,
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface Agent {
  id: string;
  name: string;
  description: string;
  type: string;
  status: string;
  avatar: string | null;
  systemPrompt: string | null;
  soulMd: string | null;
  model: string;
  teamId: string | null;
  team?: { id: string; name: string; color: string } | null;
  tasks?: { id: string; title: string; status: string }[];
  memories?: { id: string; title: string }[];
  conversations?: { id: string; title: string }[];
  skills?: { id: string; name: string; category: string; isAutoLearned: boolean; usageCount: number }[];
  goals?: { id: string; title: string; status: string; progress: number }[];
  delegates?: { id: string; name: string; status: string; task: string }[];
}

const statusColors: Record<string, string> = {
  idle: 'bg-slate-500',
  running: 'bg-emerald-500',
  error: 'bg-red-500',
  paused: 'bg-yellow-500',
};

const statusBadgeColors: Record<string, string> = {
  idle: 'bg-slate-500/20 text-slate-400 border-slate-500/30',
  running: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30',
  error: 'bg-red-500/20 text-red-400 border-red-500/30',
  paused: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
};

const typeColors: Record<string, string> = {
  general: 'bg-slate-500/20 text-slate-400',
  research: 'bg-blue-500/20 text-blue-400',
  coding: 'bg-purple-500/20 text-purple-400',
  writing: 'bg-yellow-500/20 text-yellow-400',
  voice: 'bg-pink-500/20 text-pink-400',
  orchestration: 'bg-emerald-500/20 text-emerald-400',
};

const categoryColors: Record<string, string> = {
  general: 'bg-slate-500/20 text-slate-400',
  research: 'bg-blue-500/20 text-blue-400',
  coding: 'bg-purple-500/20 text-purple-400',
  writing: 'bg-yellow-500/20 text-yellow-400',
  automation: 'bg-emerald-500/20 text-emerald-400',
  communication: 'bg-pink-500/20 text-pink-400',
};

const goalStatusColors: Record<string, string> = {
  active: 'bg-emerald-500/20 text-emerald-400',
  completed: 'bg-blue-500/20 text-blue-400',
  abandoned: 'bg-slate-500/20 text-slate-400',
};

const delegateStatusColors: Record<string, string> = {
  pending: 'bg-yellow-500/20 text-yellow-400',
  running: 'bg-emerald-500/20 text-emerald-400',
  completed: 'bg-blue-500/20 text-blue-400',
  failed: 'bg-red-500/20 text-red-400',
};

export function AgentsView() {
  const { toast } = useToast();
  const [agents, setAgents] = useState<Agent[]>([]);
  const [selectedAgent, setSelectedAgent] = useState<Agent | null>(null);
  const [loading, setLoading] = useState(true);
  const [createOpen, setCreateOpen] = useState(false);
  const [editingSoulMd, setEditingSoulMd] = useState(false);
  const [soulMdValue, setSoulMdValue] = useState('');
  const [isRunning, setIsRunning] = useState(false);
  const [runResult, setRunResult] = useState<{ executionPlan: string; taskResult: Record<string, unknown> | null } | null>(null);
  const [newAgent, setNewAgent] = useState({
    name: '',
    description: '',
    type: 'general',
    systemPrompt: '',
    model: 'default',
  });

  const loadAgents = useCallback(async () => {
    try {
      const res = await fetch('/api/agents');
      if (res.ok) setAgents(await res.json());
    } catch (error) {
      console.error('Failed to load agents:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadAgents();
  }, [loadAgents]);

  async function createAgent() {
    try {
      const res = await fetch('/api/agents', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newAgent),
      });
      if (res.ok) {
        toast({ title: 'Agent created successfully' });
        setCreateOpen(false);
        setNewAgent({ name: '', description: '', type: 'general', systemPrompt: '', model: 'default' });
        loadAgents();
      }
    } catch {
      toast({ title: 'Failed to create agent', variant: 'destructive' });
    }
  }

  async function updateAgentStatus(id: string, status: string) {
    try {
      const res = await fetch(`/api/agents/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
      });
      if (res.ok) {
        toast({ title: `Agent status updated to ${status}` });
        loadAgents();
        if (selectedAgent?.id === id) {
          const detail = await (await fetch(`/api/agents/${id}`)).json();
          setSelectedAgent(detail);
        }
      }
    } catch {
      toast({ title: 'Failed to update agent status', variant: 'destructive' });
    }
  }

  async function updateSoulMd() {
    if (!selectedAgent) return;
    try {
      const res = await fetch(`/api/agents/${selectedAgent.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ soulMd: soulMdValue }),
      });
      if (res.ok) {
        toast({ title: 'SOUL.md updated successfully' });
        setEditingSoulMd(false);
        loadAgents();
        const detail = await (await fetch(`/api/agents/${selectedAgent.id}`)).json();
        setSelectedAgent(detail);
      }
    } catch {
      toast({ title: 'Failed to update SOUL.md', variant: 'destructive' });
    }
  }

  async function deleteAgent(id: string) {
    try {
      const res = await fetch(`/api/agents/${id}`, { method: 'DELETE' });
      if (res.ok) {
        toast({ title: 'Agent deleted' });
        if (selectedAgent?.id === id) setSelectedAgent(null);
        loadAgents();
      }
    } catch {
      toast({ title: 'Failed to delete agent', variant: 'destructive' });
    }
  }

  async function runAgent(id: string) {
    setIsRunning(true);
    setRunResult(null);
    try {
      const res = await fetch(`/api/agents/${id}/run`, { method: 'POST' });
      if (res.ok) {
        const data = await res.json();
        setRunResult({ executionPlan: data.executionPlan, taskResult: data.taskResult });
        toast({ title: `${data.agentName} is now running`, description: `${data.pendingTasks} pending tasks` });
        loadAgents();
        const detail = await (await fetch(`/api/agents/${id}`)).json();
        setSelectedAgent(detail);
      } else {
        toast({ title: 'Failed to run agent', variant: 'destructive' });
      }
    } catch {
      toast({ title: 'Failed to run agent', variant: 'destructive' });
    } finally {
      setIsRunning(false);
    }
  }

  async function selectAgent(agent: Agent) {
    try {
      const res = await fetch(`/api/agents/${agent.id}`);
      if (res.ok) {
        const data = await res.json();
        setSelectedAgent(data);
        setSoulMdValue(data.soulMd || '');
      }
    } catch {
      setSelectedAgent(agent);
      setSoulMdValue(agent.soulMd || '');
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
          <h1 className="text-2xl font-bold">Agents</h1>
          <p className="text-sm text-muted-foreground">Manage and monitor your AI agents</p>
        </div>
        <Dialog open={createOpen} onOpenChange={setCreateOpen}>
          <DialogTrigger asChild>
            <Button className="bg-emerald-600 hover:bg-emerald-700 text-white">
              <Plus className="w-4 h-4 mr-1.5" />
              New Agent
            </Button>
          </DialogTrigger>
          <DialogContent className="bg-card border-border">
            <DialogHeader>
              <DialogTitle>Create New Agent</DialogTitle>
              <DialogDescription>Add a new AI agent to your workspace</DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Name</Label>
                <Input
                  value={newAgent.name}
                  onChange={(e) => setNewAgent({ ...newAgent, name: e.target.value })}
                  placeholder="Agent name..."
                  className="bg-secondary border-border"
                />
              </div>
              <div className="space-y-2">
                <Label>Description</Label>
                <Input
                  value={newAgent.description}
                  onChange={(e) => setNewAgent({ ...newAgent, description: e.target.value })}
                  placeholder="Brief description..."
                  className="bg-secondary border-border"
                />
              </div>
              <div className="space-y-2">
                <Label>Type</Label>
                <Select value={newAgent.type} onValueChange={(v) => setNewAgent({ ...newAgent, type: v })}>
                  <SelectTrigger className="bg-secondary border-border">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-card border-border">
                    <SelectItem value="general">General</SelectItem>
                    <SelectItem value="research">Research</SelectItem>
                    <SelectItem value="coding">Coding</SelectItem>
                    <SelectItem value="writing">Writing</SelectItem>
                    <SelectItem value="voice">Voice</SelectItem>
                    <SelectItem value="orchestration">Orchestration</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>System Prompt</Label>
                <Textarea
                  value={newAgent.systemPrompt}
                  onChange={(e) => setNewAgent({ ...newAgent, systemPrompt: e.target.value })}
                  placeholder="Instructions for the agent..."
                  className="bg-secondary border-border min-h-20"
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setCreateOpen(false)}>
                Cancel
              </Button>
              <Button
                className="bg-emerald-600 hover:bg-emerald-700 text-white"
                onClick={createAgent}
                disabled={!newAgent.name}
              >
                Create Agent
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <div className="flex gap-4">
        {/* Agent List */}
        <div className={`flex-1 ${selectedAgent ? 'max-w-[50%]' : ''}`}>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {agents.map((agent) => (
              <Card
                key={agent.id}
                className={`bg-card border-border cursor-pointer transition-all hover:border-emerald-500/30 ${
                  selectedAgent?.id === agent.id ? 'border-emerald-500/50 glow-emerald' : ''
                }`}
                onClick={() => selectAgent(agent)}
              >
                <CardContent className="p-4">
                  <div className="flex items-start gap-3">
                    <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-secondary text-lg shrink-0">
                      {agent.avatar || '🤖'}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <p className="text-sm font-medium truncate">{agent.name}</p>
                        <div className={`w-2 h-2 rounded-full shrink-0 ml-2 ${statusColors[agent.status]} ${agent.status === 'running' ? 'pulse-emerald' : ''}`} />
                      </div>
                      <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{agent.description}</p>
                      <div className="flex items-center gap-1.5 mt-2">
                        <Badge variant="outline" className={`text-[10px] ${typeColors[agent.type] || ''}`}>
                          {agent.type}
                        </Badge>
                        <Badge variant="outline" className={`text-[10px] ${statusBadgeColors[agent.status] || ''}`}>
                          {agent.status}
                        </Badge>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>

        {/* Agent Detail Panel */}
        {selectedAgent && (
          <Card className="flex-1 bg-card border-border max-h-[calc(100vh-12rem)]">
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-secondary text-lg">
                    {selectedAgent.avatar || '🤖'}
                  </div>
                  <div>
                    <CardTitle className="text-base">{selectedAgent.name}</CardTitle>
                    <Badge variant="outline" className={`text-[10px] mt-1 ${statusBadgeColors[selectedAgent.status] || ''}`}>
                      {selectedAgent.status}
                    </Badge>
                  </div>
                </div>
                <Button variant="ghost" size="icon" onClick={() => setSelectedAgent(null)}>
                  <X className="w-4 h-4" />
                </Button>
              </div>
            </CardHeader>
            <CardContent className="p-4 pt-0">
              <ScrollArea className="h-[calc(100vh-20rem)]">
                <div className="space-y-4">
                  <div>
                    <p className="text-xs text-muted-foreground font-medium">Description</p>
                    <p className="text-sm mt-1">{selectedAgent.description}</p>
                  </div>

                  {/* SOUL.md Section */}
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <p className="text-xs text-muted-foreground font-medium">SOUL.md</p>
                      {editingSoulMd ? (
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-5 text-[10px] text-emerald-400 hover:bg-emerald-500/10"
                          onClick={updateSoulMd}
                        >
                          <Save className="w-3 h-3 mr-0.5" /> Save
                        </Button>
                      ) : (
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-5 text-[10px] text-emerald-400 hover:bg-emerald-500/10"
                          onClick={() => {
                            setSoulMdValue(selectedAgent.soulMd || '');
                            setEditingSoulMd(true);
                          }}
                        >
                          <Pencil className="w-3 h-3 mr-0.5" /> Edit
                        </Button>
                      )}
                    </div>
                    {editingSoulMd ? (
                      <Textarea
                        value={soulMdValue}
                        onChange={(e) => setSoulMdValue(e.target.value)}
                        className="bg-secondary border-border min-h-24 text-xs font-mono"
                        placeholder="Define the agent's personality and behavior..."
                      />
                    ) : (
                      <p className="text-xs mt-1 text-foreground/80 bg-secondary p-2.5 rounded-md border border-border/50">
                        {selectedAgent.soulMd || 'No SOUL.md configured — define the agent\'s personality and core behaviors'}
                      </p>
                    )}
                  </div>

                  <div>
                    <p className="text-xs text-muted-foreground font-medium">System Prompt</p>
                    <p className="text-xs mt-1 text-foreground/80 bg-secondary p-2 rounded-md">
                      {selectedAgent.systemPrompt || 'No system prompt configured'}
                    </p>
                  </div>

                  <div>
                    <p className="text-xs text-muted-foreground font-medium">Team</p>
                    <p className="text-sm mt-1">
                      {selectedAgent.team ? (
                        <Badge variant="outline" style={{ borderColor: selectedAgent.team.color, color: selectedAgent.team.color }}>
                          {selectedAgent.team.name}
                        </Badge>
                      ) : (
                        'No team assigned'
                      )}
                    </p>
                  </div>

                  {/* Status Controls */}
                  <div>
                    <p className="text-xs text-muted-foreground font-medium mb-2">Status Controls</p>
                    <div className="flex gap-2 flex-wrap">
                      <Button
                        size="sm"
                        variant="outline"
                        className="text-emerald-400 border-emerald-500/30 hover:bg-emerald-500/10"
                        onClick={() => runAgent(selectedAgent.id)}
                        disabled={isRunning}
                      >
                        {isRunning ? <Loader2 className="w-3 h-3 mr-1 animate-spin" /> : <Zap className="w-3 h-3 mr-1" />}
                        Run Agent
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        className="text-emerald-400 border-emerald-500/30 hover:bg-emerald-500/10"
                        onClick={() => updateAgentStatus(selectedAgent.id, 'running')}
                      >
                        <Play className="w-3 h-3 mr-1" /> Start
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        className="text-yellow-400 border-yellow-500/30 hover:bg-yellow-500/10"
                        onClick={() => updateAgentStatus(selectedAgent.id, 'paused')}
                      >
                        <Pause className="w-3 h-3 mr-1" /> Pause
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        className="text-slate-400 border-slate-500/30 hover:bg-slate-500/10"
                        onClick={() => updateAgentStatus(selectedAgent.id, 'idle')}
                      >
                        <Square className="w-3 h-3 mr-1" /> Stop
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        className="text-red-400 border-red-500/30 hover:bg-red-500/10"
                        onClick={() => deleteAgent(selectedAgent.id)}
                      >
                        <Trash2 className="w-3 h-3" />
                      </Button>
                    </div>
                  </div>

                  {/* Execution Result */}
                  {runResult && (
                    <div>
                      <p className="text-xs text-muted-foreground font-medium mb-1">Execution Plan</p>
                      <div className="bg-emerald-500/5 border border-emerald-500/20 rounded-md p-3 space-y-2">
                        <p className="text-xs text-foreground/80 whitespace-pre-wrap">{runResult.executionPlan}</p>
                        {runResult.taskResult && (
                          <div className="border-t border-emerald-500/10 pt-2 mt-2">
                            <p className="text-[10px] text-emerald-400 font-medium">Task Processed: {String(runResult.taskResult.taskTitle)}</p>
                            <p className="text-[10px] text-muted-foreground mt-1 line-clamp-3">{String(runResult.taskResult.output)}</p>
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Skills Section */}
                  {selectedAgent.skills && selectedAgent.skills.length > 0 && (
                    <div>
                      <div className="flex items-center gap-1.5 mb-2">
                        <Wrench className="w-3 h-3 text-purple-400" />
                        <p className="text-xs text-muted-foreground font-medium">Skills</p>
                      </div>
                      <div className="space-y-1.5">
                        {selectedAgent.skills.map((skill) => (
                          <div key={skill.id} className="flex items-center gap-2 text-xs p-2 bg-secondary rounded-md">
                            {skill.isAutoLearned ? (
                              <Lightbulb className="w-3 h-3 text-yellow-400" />
                            ) : (
                              <Wrench className="w-3 h-3 text-purple-400" />
                            )}
                            <span className="flex-1">{skill.name}</span>
                            <Badge variant="outline" className={`text-[9px] ${categoryColors[skill.category] || ''}`}>
                              {skill.category}
                            </Badge>
                            <span className="text-[9px] text-muted-foreground">{skill.usageCount}x</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Goals Section */}
                  {selectedAgent.goals && selectedAgent.goals.length > 0 && (
                    <div>
                      <div className="flex items-center gap-1.5 mb-2">
                        <Target className="w-3 h-3 text-orange-400" />
                        <p className="text-xs text-muted-foreground font-medium">Active Goals</p>
                      </div>
                      <div className="space-y-1.5">
                        {selectedAgent.goals.map((goal) => (
                          <div key={goal.id} className="p-2 bg-secondary rounded-md">
                            <div className="flex items-center justify-between mb-1">
                              <span className="text-xs">{goal.title}</span>
                              <Badge variant="outline" className={`text-[9px] ${goalStatusColors[goal.status] || ''}`}>
                                {goal.status}
                              </Badge>
                            </div>
                            <div className="h-1 bg-secondary-foreground/10 rounded-full overflow-hidden">
                              <div
                                className="h-full rounded-full bg-emerald-500 transition-all"
                                style={{ width: `${goal.progress}%` }}
                              />
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Delegates Section */}
                  {selectedAgent.delegates && selectedAgent.delegates.length > 0 && (
                    <div>
                      <div className="flex items-center gap-1.5 mb-2">
                        <Users className="w-3 h-3 text-blue-400" />
                        <p className="text-xs text-muted-foreground font-medium">Delegates</p>
                      </div>
                      <div className="space-y-1.5">
                        {selectedAgent.delegates.map((delegate) => (
                          <div key={delegate.id} className="flex items-center gap-2 text-xs p-2 bg-secondary rounded-md">
                            <Users className="w-3 h-3 text-blue-400" />
                            <span className="flex-1 truncate">{delegate.name}</span>
                            <Badge variant="outline" className={`text-[9px] ${delegateStatusColors[delegate.status] || ''}`}>
                              {delegate.status}
                            </Badge>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Assigned Tasks */}
                  {selectedAgent.tasks && selectedAgent.tasks.length > 0 && (
                    <div>
                      <p className="text-xs text-muted-foreground font-medium mb-2">Assigned Tasks</p>
                      <div className="space-y-1.5">
                        {selectedAgent.tasks.map((task) => (
                          <div key={task.id} className="flex items-center gap-2 text-xs p-2 bg-secondary rounded-md">
                            <ChevronRight className="w-3 h-3 text-emerald-400" />
                            <span className="flex-1">{task.title}</span>
                            <Badge variant="outline" className="text-[9px]">
                              {task.status}
                            </Badge>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Memory Entries */}
                  {selectedAgent.memories && selectedAgent.memories.length > 0 && (
                    <div>
                      <p className="text-xs text-muted-foreground font-medium mb-2">Memory Entries</p>
                      <div className="space-y-1.5">
                        {selectedAgent.memories.map((mem) => (
                          <div key={mem.id} className="flex items-center gap-2 text-xs p-2 bg-secondary rounded-md">
                            <Bot className="w-3 h-3 text-purple-400" />
                            <span className="flex-1">{mem.title}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}

'use client';

import { useEffect, useState, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Progress } from '@/components/ui/progress';
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
  Target,
  Trash2,
  CheckCircle2,
  XCircle,
  Pencil,
  X,
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface Goal {
  id: string;
  title: string;
  description: string | null;
  status: string;
  priority: string;
  progress: number;
  agentId: string | null;
  agent?: { id: string; name: string; avatar: string | null } | null;
  dueDate: string | null;
  createdAt: string;
}

interface Agent {
  id: string;
  name: string;
  avatar: string | null;
}

const statusColors: Record<string, string> = {
  active: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30',
  completed: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
  abandoned: 'bg-slate-500/20 text-slate-400 border-slate-500/30',
};

const priorityColors: Record<string, string> = {
  low: 'bg-slate-500/20 text-slate-400 border-slate-500/30',
  medium: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
  high: 'bg-orange-500/20 text-orange-400 border-orange-500/30',
  urgent: 'bg-red-500/20 text-red-400 border-red-500/30',
};

const progressColor = (progress: number) => {
  if (progress >= 75) return 'bg-emerald-500';
  if (progress >= 50) return 'bg-yellow-500';
  if (progress >= 25) return 'bg-orange-500';
  return 'bg-slate-500';
};

export function GoalsView() {
  const { toast } = useToast();
  const [goals, setGoals] = useState<Goal[]>([]);
  const [agents, setAgents] = useState<Agent[]>([]);
  const [loading, setLoading] = useState(true);
  const [createOpen, setCreateOpen] = useState(false);
  const [editGoal, setEditGoal] = useState<Goal | null>(null);
  const [form, setForm] = useState({
    title: '',
    description: '',
    priority: 'medium',
    agentId: '',
    dueDate: '',
    progress: 0,
  });

  const loadData = useCallback(async () => {
    try {
      const [goalsRes, agentsRes] = await Promise.all([
        fetch('/api/goals'),
        fetch('/api/agents'),
      ]);
      if (goalsRes.ok) setGoals(await goalsRes.json());
      if (agentsRes.ok) setAgents(await agentsRes.json());
    } catch (error) {
      console.error('Failed to load goals:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  function resetForm() {
    setForm({ title: '', description: '', priority: 'medium', agentId: '', dueDate: '', progress: 0 });
  }

  async function createGoal() {
    try {
      const res = await fetch('/api/goals', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: form.title,
          description: form.description || null,
          priority: form.priority,
          agentId: form.agentId || null,
          dueDate: form.dueDate || null,
          progress: form.progress,
        }),
      });
      if (res.ok) {
        toast({ title: 'Goal created successfully' });
        setCreateOpen(false);
        resetForm();
        loadData();
      }
    } catch {
      toast({ title: 'Failed to create goal', variant: 'destructive' });
    }
  }

  async function updateGoal() {
    if (!editGoal) return;
    try {
      const res = await fetch(`/api/goals/${editGoal.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: form.title,
          description: form.description || null,
          priority: form.priority,
          agentId: form.agentId || null,
          dueDate: form.dueDate || null,
          progress: form.progress,
        }),
      });
      if (res.ok) {
        toast({ title: 'Goal updated successfully' });
        setEditGoal(null);
        resetForm();
        loadData();
      }
    } catch {
      toast({ title: 'Failed to update goal', variant: 'destructive' });
    }
  }

  async function updateGoalStatus(id: string, status: string) {
    try {
      const updateData: Record<string, unknown> = { status };
      if (status === 'completed') updateData.progress = 100;
      const res = await fetch(`/api/goals/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updateData),
      });
      if (res.ok) {
        toast({ title: `Goal marked as ${status}` });
        loadData();
      }
    } catch {
      toast({ title: 'Failed to update goal', variant: 'destructive' });
    }
  }

  async function updateGoalProgress(id: string, progress: number) {
    try {
      const res = await fetch(`/api/goals/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ progress }),
      });
      if (res.ok) {
        loadData();
      }
    } catch {
      toast({ title: 'Failed to update progress', variant: 'destructive' });
    }
  }

  async function deleteGoal(id: string) {
    try {
      const res = await fetch(`/api/goals/${id}`, { method: 'DELETE' });
      if (res.ok) {
        toast({ title: 'Goal deleted' });
        loadData();
      }
    } catch {
      toast({ title: 'Failed to delete goal', variant: 'destructive' });
    }
  }

  function startEdit(goal: Goal) {
    setForm({
      title: goal.title,
      description: goal.description || '',
      priority: goal.priority,
      agentId: goal.agentId || '',
      dueDate: goal.dueDate || '',
      progress: goal.progress,
    });
    setEditGoal(goal);
  }

  // Agent Goals Summary
  const agentGoalsSummary = agents.map((agent) => {
    const agentGoals = goals.filter((g) => g.agentId === agent.id);
    return {
      agent,
      active: agentGoals.filter((g) => g.status === 'active').length,
      completed: agentGoals.filter((g) => g.status === 'completed').length,
      total: agentGoals.length,
    };
  }).filter((a) => a.total > 0);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="w-8 h-8 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const activeGoals = goals.filter((g) => g.status === 'active');
  const completedGoals = goals.filter((g) => g.status === 'completed');

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Goals</h1>
          <p className="text-sm text-muted-foreground">Track and manage agent goals and objectives</p>
        </div>
        <Dialog open={createOpen} onOpenChange={setCreateOpen}>
          <DialogTrigger asChild>
            <Button className="bg-emerald-600 hover:bg-emerald-700 text-white">
              <Plus className="w-4 h-4 mr-1.5" />
              New Goal
            </Button>
          </DialogTrigger>
          <DialogContent className="bg-card border-border">
            <DialogHeader>
              <DialogTitle>Create New Goal</DialogTitle>
              <DialogDescription>Set a new goal for an agent</DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Title</Label>
                <Input
                  value={form.title}
                  onChange={(e) => setForm({ ...form, title: e.target.value })}
                  placeholder="Goal title..."
                  className="bg-secondary border-border"
                />
              </div>
              <div className="space-y-2">
                <Label>Description</Label>
                <Textarea
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                  placeholder="Describe the goal..."
                  className="bg-secondary border-border min-h-20"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Priority</Label>
                  <Select value={form.priority} onValueChange={(v) => setForm({ ...form, priority: v })}>
                    <SelectTrigger className="bg-secondary border-border">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-card border-border">
                      <SelectItem value="low">Low</SelectItem>
                      <SelectItem value="medium">Medium</SelectItem>
                      <SelectItem value="high">High</SelectItem>
                      <SelectItem value="urgent">Urgent</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Due Date</Label>
                  <Input
                    type="date"
                    value={form.dueDate}
                    onChange={(e) => setForm({ ...form, dueDate: e.target.value })}
                    className="bg-secondary border-border"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Assign to Agent</Label>
                <Select value={form.agentId} onValueChange={(v) => setForm({ ...form, agentId: v })}>
                  <SelectTrigger className="bg-secondary border-border">
                    <SelectValue placeholder="Select agent..." />
                  </SelectTrigger>
                  <SelectContent className="bg-card border-border">
                    {agents.map((agent) => (
                      <SelectItem key={agent.id} value={agent.id}>
                        {agent.avatar || '🤖'} {agent.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => { setCreateOpen(false); resetForm(); }}>
                Cancel
              </Button>
              <Button className="bg-emerald-600 hover:bg-emerald-700 text-white" onClick={createGoal} disabled={!form.title}>
                Create Goal
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="bg-card border-border">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2.5 rounded-lg bg-emerald-500/20 text-emerald-400">
              <Target className="w-5 h-5" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Active Goals</p>
              <p className="text-xl font-bold">{activeGoals.length}</p>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-card border-border">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2.5 rounded-lg bg-blue-500/20 text-blue-400">
              <CheckCircle2 className="w-5 h-5" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Completed</p>
              <p className="text-xl font-bold">{completedGoals.length}</p>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-card border-border">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2.5 rounded-lg bg-yellow-500/20 text-yellow-400">
              <Target className="w-5 h-5" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Avg Progress</p>
              <p className="text-xl font-bold">
                {activeGoals.length > 0
                  ? Math.round(activeGoals.reduce((sum, g) => sum + g.progress, 0) / activeGoals.length)
                  : 0}%
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Agent Goals Summary */}
      {agentGoalsSummary.length > 0 && (
        <Card className="bg-card border-border">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold">Agent Goals Summary</CardTitle>
          </CardHeader>
          <CardContent className="p-4 pt-0">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {agentGoalsSummary.map(({ agent, active, completed, total }) => (
                <div key={agent.id} className="flex items-center gap-3 p-3 rounded-lg bg-secondary/50 border border-border">
                  <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-card text-sm shrink-0">
                    {agent.avatar || '🤖'}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{agent.name}</p>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className="text-[10px] text-emerald-400">{active} active</span>
                      <span className="text-[10px] text-muted-foreground">·</span>
                      <span className="text-[10px] text-blue-400">{completed} done</span>
                    </div>
                  </div>
                  <Badge variant="outline" className="text-[10px] shrink-0">{total}</Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Goal List */}
      <div className="space-y-3">
        {goals.map((goal) => (
          <Card key={goal.id} className="bg-card border-border hover:border-emerald-500/30 transition-colors">
            <CardContent className="p-4">
              <div className="flex items-start gap-3">
                <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-secondary shrink-0">
                  <Target className={`w-5 h-5 ${goal.status === 'completed' ? 'text-blue-400' : goal.status === 'abandoned' ? 'text-slate-400' : 'text-emerald-400'}`} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-medium">{goal.title}</p>
                    <div className="flex items-center gap-1.5 ml-2 shrink-0">
                      <Badge variant="outline" className={`text-[10px] ${priorityColors[goal.priority] || ''}`}>
                        {goal.priority}
                      </Badge>
                      <Badge variant="outline" className={`text-[10px] ${statusColors[goal.status] || ''}`}>
                        {goal.status}
                      </Badge>
                    </div>
                  </div>
                  {goal.description && (
                    <p className="text-xs text-muted-foreground mt-0.5">{goal.description}</p>
                  )}
                  <div className="flex items-center gap-3 mt-2">
                    <div className="flex-1">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-[10px] text-muted-foreground">Progress</span>
                        <span className="text-[10px] text-muted-foreground">{goal.progress}%</span>
                      </div>
                      <div className="h-1.5 bg-secondary rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all duration-300 ${progressColor(goal.progress)}`}
                          style={{ width: `${goal.progress}%` }}
                        />
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center justify-between mt-2">
                    <div className="flex items-center gap-2">
                      {goal.agent && (
                        <span className="text-[10px] text-muted-foreground">
                          {goal.agent.avatar || '🤖'} {goal.agent.name}
                        </span>
                      )}
                      {goal.dueDate && (
                        <span className="text-[10px] text-muted-foreground">
                          Due: {goal.dueDate}
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-1">
                      {goal.status === 'active' && (
                        <>
                          <input
                            type="range"
                            min="0"
                            max="100"
                            value={goal.progress}
                            onChange={(e) => updateGoalProgress(goal.id, parseInt(e.target.value))}
                            className="w-16 h-1 accent-emerald-500 cursor-pointer"
                          />
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-6 w-6 p-0 text-blue-400 hover:bg-blue-500/10"
                            onClick={() => updateGoalStatus(goal.id, 'completed')}
                          >
                            <CheckCircle2 className="w-3.5 h-3.5" />
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-6 w-6 p-0 text-slate-400 hover:bg-slate-500/10"
                            onClick={() => updateGoalStatus(goal.id, 'abandoned')}
                          >
                            <XCircle className="w-3.5 h-3.5" />
                          </Button>
                        </>
                      )}
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-6 w-6 p-0 text-emerald-400 hover:bg-emerald-500/10"
                        onClick={() => startEdit(goal)}
                      >
                        <Pencil className="w-3.5 h-3.5" />
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-6 w-6 p-0 text-red-400 hover:bg-red-500/10"
                        onClick={() => deleteGoal(goal.id)}
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {goals.length === 0 && (
        <div className="flex items-center justify-center py-12">
          <div className="text-center">
            <Target className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
            <p className="text-sm text-muted-foreground">No goals yet. Create one to get started!</p>
          </div>
        </div>
      )}

      {/* Edit Goal Dialog */}
      <Dialog open={!!editGoal} onOpenChange={(open) => { if (!open) { setEditGoal(null); resetForm(); } }}>
        <DialogContent className="bg-card border-border">
          <DialogHeader>
            <DialogTitle>Edit Goal</DialogTitle>
            <DialogDescription>Update goal details</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Title</Label>
              <Input
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
                className="bg-secondary border-border"
              />
            </div>
            <div className="space-y-2">
              <Label>Description</Label>
              <Textarea
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                className="bg-secondary border-border min-h-20"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Priority</Label>
                <Select value={form.priority} onValueChange={(v) => setForm({ ...form, priority: v })}>
                  <SelectTrigger className="bg-secondary border-border">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-card border-border">
                    <SelectItem value="low">Low</SelectItem>
                    <SelectItem value="medium">Medium</SelectItem>
                    <SelectItem value="high">High</SelectItem>
                    <SelectItem value="urgent">Urgent</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Due Date</Label>
                <Input
                  type="date"
                  value={form.dueDate}
                  onChange={(e) => setForm({ ...form, dueDate: e.target.value })}
                  className="bg-secondary border-border"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Progress ({form.progress}%)</Label>
              <input
                type="range"
                min="0"
                max="100"
                value={form.progress}
                onChange={(e) => setForm({ ...form, progress: parseInt(e.target.value) })}
                className="w-full accent-emerald-500"
              />
            </div>
            <div className="space-y-2">
              <Label>Assign to Agent</Label>
              <Select value={form.agentId} onValueChange={(v) => setForm({ ...form, agentId: v })}>
                <SelectTrigger className="bg-secondary border-border">
                  <SelectValue placeholder="Select agent..." />
                </SelectTrigger>
                <SelectContent className="bg-card border-border">
                  {agents.map((agent) => (
                    <SelectItem key={agent.id} value={agent.id}>
                      {agent.avatar || '🤖'} {agent.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setEditGoal(null); resetForm(); }}>
              <X className="w-4 h-4 mr-1" /> Cancel
            </Button>
            <Button className="bg-emerald-600 hover:bg-emerald-700 text-white" onClick={updateGoal} disabled={!form.title}>
              Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

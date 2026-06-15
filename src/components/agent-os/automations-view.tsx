'use client';

import { useEffect, useState, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
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
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

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
};

const actionLabels: Record<string, string> = {
  send_message: 'Send Message',
  create_task: 'Create Task',
  run_agent: 'Run Agent',
  notify: 'Notify',
};

export function AutomationsView() {
  const { toast } = useToast();
  const [automations, setAutomations] = useState<Automation[]>([]);
  const [loading, setLoading] = useState(true);
  const [createOpen, setCreateOpen] = useState(false);
  const [newAutomation, setNewAutomation] = useState({
    name: '',
    description: '',
    trigger: 'on_message',
    action: 'send_message',
  });

  const loadAutomations = useCallback(async () => {
    try {
      const res = await fetch('/api/automations');
      if (res.ok) setAutomations(await res.json());
    } catch (error) {
      console.error('Failed to load automations:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadAutomations();
  }, [loadAutomations]);

  async function createAutomation() {
    try {
      const res = await fetch('/api/automations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newAutomation),
      });
      if (res.ok) {
        toast({ title: 'Automation created' });
        setCreateOpen(false);
        setNewAutomation({ name: '', description: '', trigger: 'on_message', action: 'send_message' });
        loadAutomations();
      }
    } catch {
      toast({ title: 'Failed to create automation', variant: 'destructive' });
    }
  }

  async function toggleAutomation(id: string, isActive: boolean) {
    try {
      const res = await fetch(`/api/automations/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isActive: !isActive }),
      });
      if (res.ok) {
        toast({ title: `Automation ${!isActive ? 'activated' : 'deactivated'}` });
        loadAutomations();
      }
    } catch {
      toast({ title: 'Failed to toggle automation', variant: 'destructive' });
    }
  }

  async function deleteAutomation(id: string) {
    try {
      const res = await fetch(`/api/automations/${id}`, { method: 'DELETE' });
      if (res.ok) {
        toast({ title: 'Automation deleted' });
        loadAutomations();
      }
    } catch {
      toast({ title: 'Failed to delete automation', variant: 'destructive' });
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
          <h1 className="text-2xl font-bold">Automations</h1>
          <p className="text-sm text-muted-foreground">Event-driven automation rules for your agents</p>
        </div>
        <Dialog open={createOpen} onOpenChange={setCreateOpen}>
          <DialogTrigger asChild>
            <Button className="bg-emerald-600 hover:bg-emerald-700 text-white">
              <Plus className="w-4 h-4 mr-1.5" />
              New Automation
            </Button>
          </DialogTrigger>
          <DialogContent className="bg-card border-border">
            <DialogHeader>
              <DialogTitle>Create Automation</DialogTitle>
              <DialogDescription>Define an event-driven automation rule</DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Name</Label>
                <Input
                  value={newAutomation.name}
                  onChange={(e) => setNewAutomation({ ...newAutomation, name: e.target.value })}
                  placeholder="Automation name..."
                  className="bg-secondary border-border"
                />
              </div>
              <div className="space-y-2">
                <Label>Description</Label>
                <Textarea
                  value={newAutomation.description}
                  onChange={(e) => setNewAutomation({ ...newAutomation, description: e.target.value })}
                  placeholder="What does this automation do?"
                  className="bg-secondary border-border"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Trigger</Label>
                  <Select value={newAutomation.trigger} onValueChange={(v) => setNewAutomation({ ...newAutomation, trigger: v })}>
                    <SelectTrigger className="bg-secondary border-border">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-card border-border">
                      <SelectItem value="on_message">On Message</SelectItem>
                      <SelectItem value="on_task_create">On Task Create</SelectItem>
                      <SelectItem value="on_schedule">On Schedule</SelectItem>
                      <SelectItem value="on_agent_idle">On Agent Idle</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Action</Label>
                  <Select value={newAutomation.action} onValueChange={(v) => setNewAutomation({ ...newAutomation, action: v })}>
                    <SelectTrigger className="bg-secondary border-border">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-card border-border">
                      <SelectItem value="send_message">Send Message</SelectItem>
                      <SelectItem value="create_task">Create Task</SelectItem>
                      <SelectItem value="run_agent">Run Agent</SelectItem>
                      <SelectItem value="notify">Notify</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setCreateOpen(false)}>Cancel</Button>
              <Button
                className="bg-emerald-600 hover:bg-emerald-700 text-white"
                onClick={createAutomation}
                disabled={!newAutomation.name}
              >
                Create
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* Automations Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {automations.map((automation) => {
          const TriggerIcon = triggerIcons[automation.trigger] || Zap;
          const ActionIcon = actionIcons[automation.action] || Zap;
          return (
            <Card
              key={automation.id}
              className={`bg-card border-border transition-all ${
                automation.isActive ? 'border-emerald-500/20' : 'opacity-60'
              }`}
            >
              <CardHeader className="p-4 pb-2">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-sm font-medium flex items-center gap-2">
                    <Zap className={`w-4 h-4 ${automation.isActive ? 'text-emerald-400' : 'text-muted-foreground'}`} />
                    {automation.name}
                  </CardTitle>
                  <Switch
                    checked={automation.isActive}
                    onCheckedChange={() => toggleAutomation(automation.id, automation.isActive)}
                  />
                </div>
              </CardHeader>
              <CardContent className="p-4 pt-1">
                <p className="text-xs text-muted-foreground mb-3">
                  {automation.description || 'No description'}
                </p>
                <div className="flex items-center gap-3 mb-3">
                  <div className="flex items-center gap-1.5">
                    <TriggerIcon className="w-3.5 h-3.5 text-blue-400" />
                    <span className="text-[10px] text-muted-foreground">
                      {triggerLabels[automation.trigger] || automation.trigger}
                    </span>
                  </div>
                  <span className="text-muted-foreground">→</span>
                  <div className="flex items-center gap-1.5">
                    <ActionIcon className="w-3.5 h-3.5 text-emerald-400" />
                    <span className="text-[10px] text-muted-foreground">
                      {actionLabels[automation.action] || automation.action}
                    </span>
                  </div>
                </div>
                <div className="flex items-center justify-between">
                  <Badge
                    variant="outline"
                    className={`text-[10px] ${
                      automation.isActive
                        ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30'
                        : 'bg-slate-500/20 text-slate-400 border-slate-500/30'
                    }`}
                  >
                    {automation.isActive ? 'Active' : 'Inactive'}
                  </Badge>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="w-7 h-7 text-red-400"
                    onClick={() => deleteAutomation(automation.id)}
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </Button>
                </div>
                {automation.lastRunAt && (
                  <p className="text-[10px] text-muted-foreground mt-2">
                    Last run: {new Date(automation.lastRunAt).toLocaleString()}
                  </p>
                )}
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
    </div>
  );
}

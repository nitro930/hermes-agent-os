'use client';

import { useEffect, useState, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
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
  Users,
  UserPlus,
  UserMinus,
  X,
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface Agent {
  id: string;
  name: string;
  type: string;
  avatar: string | null;
  status: string;
  teamId: string | null;
}

interface Team {
  id: string;
  name: string;
  description: string;
  color: string;
  agents: Agent[];
  createdAt: string;
}

const colorOptions = [
  '#10b981', '#6366f1', '#f59e0b', '#ef4444', '#ec4899',
  '#8b5cf6', '#06b6d4', '#84cc16', '#f97316', '#14b8a6',
];

export function TeamsView() {
  const { toast } = useToast();
  const [teams, setTeams] = useState<Team[]>([]);
  const [agents, setAgents] = useState<Agent[]>([]);
  const [loading, setLoading] = useState(true);
  const [createOpen, setCreateOpen] = useState(false);
  const [selectedTeam, setSelectedTeam] = useState<Team | null>(null);
  const [addAgentOpen, setAddAgentOpen] = useState(false);
  const [newTeam, setNewTeam] = useState({
    name: '',
    description: '',
    color: '#10b981',
  });

  const loadTeams = useCallback(async () => {
    try {
      const res = await fetch('/api/teams');
      if (res.ok) setTeams(await res.json());
    } catch (error) {
      console.error('Failed to load teams:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  const loadAgents = useCallback(async () => {
    try {
      const res = await fetch('/api/agents');
      if (res.ok) setAgents(await res.json());
    } catch (error) {
      console.error('Failed to load agents:', error);
    }
  }, []);

  useEffect(() => {
    loadTeams();
    loadAgents();
  }, [loadTeams, loadAgents]);

  useEffect(() => {
    if (selectedTeam) {
      const updated = teams.find((t) => t.id === selectedTeam.id);
      if (updated) setSelectedTeam(updated);
    }
  }, [teams, selectedTeam]);

  async function createTeam() {
    try {
      const res = await fetch('/api/teams', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newTeam),
      });
      if (res.ok) {
        toast({ title: 'Team created' });
        setCreateOpen(false);
        setNewTeam({ name: '', description: '', color: '#10b981' });
        loadTeams();
      }
    } catch {
      toast({ title: 'Failed to create team', variant: 'destructive' });
    }
  }

  async function deleteTeam(id: string) {
    try {
      const res = await fetch(`/api/teams/${id}`, { method: 'DELETE' });
      if (res.ok) {
        toast({ title: 'Team deleted' });
        if (selectedTeam?.id === id) setSelectedTeam(null);
        loadTeams();
        loadAgents();
      }
    } catch {
      toast({ title: 'Failed to delete team', variant: 'destructive' });
    }
  }

  async function addAgentToTeam(agentId: string, teamId: string) {
    try {
      await fetch(`/api/agents/${agentId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ teamId }),
      });
      toast({ title: 'Agent added to team' });
      setAddAgentOpen(false);
      loadTeams();
      loadAgents();
    } catch {
      toast({ title: 'Failed to add agent', variant: 'destructive' });
    }
  }

  async function removeAgentFromTeam(agentId: string) {
    try {
      await fetch(`/api/agents/${agentId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ teamId: null }),
      });
      toast({ title: 'Agent removed from team' });
      loadTeams();
      loadAgents();
    } catch {
      toast({ title: 'Failed to remove agent', variant: 'destructive' });
    }
  }

  const unassignedAgents = agents.filter((a) => !a.teamId || (selectedTeam && a.teamId !== selectedTeam.id));

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
          <h1 className="text-2xl font-bold">Teams</h1>
          <p className="text-sm text-muted-foreground">Organize agents into collaborative teams</p>
        </div>
        <Dialog open={createOpen} onOpenChange={setCreateOpen}>
          <DialogTrigger asChild>
            <Button className="bg-emerald-600 hover:bg-emerald-700 text-white">
              <Plus className="w-4 h-4 mr-1.5" />
              New Team
            </Button>
          </DialogTrigger>
          <DialogContent className="bg-card border-border">
            <DialogHeader>
              <DialogTitle>Create Team</DialogTitle>
              <DialogDescription>Group agents into a collaborative team</DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Name</Label>
                <Input
                  value={newTeam.name}
                  onChange={(e) => setNewTeam({ ...newTeam, name: e.target.value })}
                  placeholder="Team name..."
                  className="bg-secondary border-border"
                />
              </div>
              <div className="space-y-2">
                <Label>Description</Label>
                <Textarea
                  value={newTeam.description}
                  onChange={(e) => setNewTeam({ ...newTeam, description: e.target.value })}
                  placeholder="What does this team do?"
                  className="bg-secondary border-border"
                />
              </div>
              <div className="space-y-2">
                <Label>Color</Label>
                <div className="flex gap-2 flex-wrap">
                  {colorOptions.map((color) => (
                    <button
                      key={color}
                      onClick={() => setNewTeam({ ...newTeam, color })}
                      className={`w-8 h-8 rounded-lg transition-transform ${
                        newTeam.color === color ? 'scale-110 ring-2 ring-white/30' : ''
                      }`}
                      style={{ backgroundColor: color }}
                    />
                  ))}
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setCreateOpen(false)}>Cancel</Button>
              <Button
                className="bg-emerald-600 hover:bg-emerald-700 text-white"
                onClick={createTeam}
                disabled={!newTeam.name}
              >
                Create
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <div className="flex gap-4">
        {/* Team List */}
        <div className={`flex-1 ${selectedTeam ? 'max-w-[50%]' : ''}`}>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {teams.map((team) => (
              <Card
                key={team.id}
                className={`bg-card border-border cursor-pointer transition-all hover:border-emerald-500/30 ${
                  selectedTeam?.id === team.id ? 'border-emerald-500/50 glow-emerald' : ''
                }`}
                onClick={() => setSelectedTeam(team)}
              >
                <CardContent className="p-4">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <div
                        className="w-3 h-3 rounded-full"
                        style={{ backgroundColor: team.color }}
                      />
                      <CardTitle className="text-sm font-medium">{team.name}</CardTitle>
                    </div>
                    <Badge variant="outline" className="text-[10px]">
                      {team.agents.length} {team.agents.length === 1 ? 'agent' : 'agents'}
                    </Badge>
                  </div>
                  <p className="text-xs text-muted-foreground line-clamp-2">{team.description}</p>
                  <div className="flex items-center gap-1 mt-3">
                    {team.agents.slice(0, 5).map((agent) => (
                      <div
                        key={agent.id}
                        className="w-6 h-6 rounded-full bg-secondary flex items-center justify-center text-[10px]"
                        title={agent.name}
                      >
                        {agent.avatar || agent.name[0]}
                      </div>
                    ))}
                    {team.agents.length > 5 && (
                      <div className="w-6 h-6 rounded-full bg-secondary flex items-center justify-center text-[10px] text-muted-foreground">
                        +{team.agents.length - 5}
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>

        {/* Team Detail */}
        {selectedTeam && (
          <Card className="flex-1 bg-card border-border max-h-[calc(100vh-12rem)]">
            <CardHeader className="p-4 pb-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div
                    className="w-4 h-4 rounded-full"
                    style={{ backgroundColor: selectedTeam.color }}
                  />
                  <div>
                    <CardTitle className="text-base">{selectedTeam.name}</CardTitle>
                    <p className="text-xs text-muted-foreground mt-0.5">{selectedTeam.description}</p>
                  </div>
                </div>
                <div className="flex items-center gap-1.5">
                  <Button
                    variant="outline"
                    size="sm"
                    className="text-xs text-emerald-400 border-emerald-500/30"
                    onClick={() => setAddAgentOpen(true)}
                  >
                    <UserPlus className="w-3.5 h-3.5 mr-1" />
                    Add Agent
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="w-7 h-7 text-red-400"
                    onClick={() => deleteTeam(selectedTeam.id)}
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </Button>
                  <Button variant="ghost" size="icon" className="w-7 h-7" onClick={() => setSelectedTeam(null)}>
                    <X className="w-3.5 h-3.5" />
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-4 pt-0">
              <div className="space-y-2">
                {selectedTeam.agents.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <Users className="w-8 h-8 mx-auto mb-2 opacity-40" />
                    <p className="text-xs">No agents in this team</p>
                  </div>
                ) : (
                  selectedTeam.agents.map((agent) => (
                    <div
                      key={agent.id}
                      className="flex items-center gap-3 p-2.5 rounded-lg bg-secondary"
                    >
                      <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-card text-sm">
                        {agent.avatar || '🤖'}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-medium">{agent.name}</p>
                        <p className="text-[10px] text-muted-foreground capitalize">{agent.type} · {agent.status}</p>
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="w-6 h-6 text-red-400"
                        onClick={() => removeAgentFromTeam(agent.id)}
                      >
                        <UserMinus className="w-3 h-3" />
                      </Button>
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Add Agent Dialog */}
      <Dialog open={addAgentOpen} onOpenChange={setAddAgentOpen}>
        <DialogContent className="bg-card border-border">
          <DialogHeader>
            <DialogTitle>Add Agent to {selectedTeam?.name}</DialogTitle>
            <DialogDescription>Select an agent to add to this team</DialogDescription>
          </DialogHeader>
          <div className="space-y-2 max-h-64 overflow-y-auto">
            {unassignedAgents.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">All agents are already in this team</p>
            ) : (
              unassignedAgents.map((agent) => (
                <div
                  key={agent.id}
                  className="flex items-center gap-3 p-2.5 rounded-lg hover:bg-accent cursor-pointer transition-colors"
                  onClick={() => selectedTeam && addAgentToTeam(agent.id, selectedTeam.id)}
                >
                  <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-secondary text-sm">
                    {agent.avatar || '🤖'}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium">{agent.name}</p>
                    <p className="text-[10px] text-muted-foreground capitalize">{agent.type}</p>
                  </div>
                  <UserPlus className="w-4 h-4 text-emerald-400" />
                </div>
              ))
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

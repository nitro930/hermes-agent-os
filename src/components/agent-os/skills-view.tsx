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
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Plus,
  Wrench,
  Trash2,
  Lightbulb,
  ChevronDown,
  ChevronUp,
  Pencil,
  X,
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface Skill {
  id: string;
  name: string;
  description: string;
  category: string;
  steps: string;
  triggers: string | null;
  isAutoLearned: boolean;
  usageCount: number;
  agentId: string | null;
  agent?: { id: string; name: string; avatar: string | null } | null;
  createdAt: string;
}

const categoryColors: Record<string, string> = {
  general: 'bg-slate-500/20 text-slate-400 border-slate-500/30',
  research: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
  coding: 'bg-purple-500/20 text-purple-400 border-purple-500/30',
  writing: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
  automation: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30',
  communication: 'bg-pink-500/20 text-pink-400 border-pink-500/30',
};

const categories = ['all', 'general', 'research', 'coding', 'writing', 'automation', 'communication'];

export function SkillsView() {
  const { toast } = useToast();
  const [skills, setSkills] = useState<Skill[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeCategory, setActiveCategory] = useState('all');
  const [expandedSkill, setExpandedSkill] = useState<string | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [editSkill, setEditSkill] = useState<Skill | null>(null);
  const [form, setForm] = useState({
    name: '',
    description: '',
    category: 'general',
    steps: '',
    triggers: '',
  });

  const loadSkills = useCallback(async () => {
    try {
      const res = await fetch(`/api/skills?category=${activeCategory}`);
      if (res.ok) setSkills(await res.json());
    } catch (error) {
      console.error('Failed to load skills:', error);
    } finally {
      setLoading(false);
    }
  }, [activeCategory]);

  useEffect(() => {
    loadSkills();
  }, [loadSkills]);

  function resetForm() {
    setForm({ name: '', description: '', category: 'general', steps: '', triggers: '' });
  }

  async function createSkill() {
    try {
      const stepsArr = form.steps.split('\n').filter((s) => s.trim());
      const res = await fetch('/api/skills', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: form.name,
          description: form.description,
          category: form.category,
          steps: JSON.stringify(stepsArr),
          triggers: form.triggers || null,
        }),
      });
      if (res.ok) {
        toast({ title: 'Skill created successfully' });
        setCreateOpen(false);
        resetForm();
        loadSkills();
      }
    } catch {
      toast({ title: 'Failed to create skill', variant: 'destructive' });
    }
  }

  async function updateSkill() {
    if (!editSkill) return;
    try {
      const stepsArr = form.steps.split('\n').filter((s) => s.trim());
      const res = await fetch(`/api/skills/${editSkill.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: form.name,
          description: form.description,
          category: form.category,
          steps: JSON.stringify(stepsArr),
          triggers: form.triggers || null,
        }),
      });
      if (res.ok) {
        toast({ title: 'Skill updated successfully' });
        setEditSkill(null);
        resetForm();
        loadSkills();
      }
    } catch {
      toast({ title: 'Failed to update skill', variant: 'destructive' });
    }
  }

  async function deleteSkill(id: string) {
    try {
      const res = await fetch(`/api/skills/${id}`, { method: 'DELETE' });
      if (res.ok) {
        toast({ title: 'Skill deleted' });
        setExpandedSkill(null);
        loadSkills();
      }
    } catch {
      toast({ title: 'Failed to delete skill', variant: 'destructive' });
    }
  }

  function startEdit(skill: Skill) {
    let stepsText = '';
    try {
      const parsed = JSON.parse(skill.steps);
      stepsText = Array.isArray(parsed) ? parsed.join('\n') : skill.steps;
    } catch {
      stepsText = skill.steps;
    }
    setForm({
      name: skill.name,
      description: skill.description,
      category: skill.category,
      steps: stepsText,
      triggers: skill.triggers || '',
    });
    setEditSkill(skill);
  }

  function parseSteps(stepsStr: string): string[] {
    try {
      const parsed = JSON.parse(stepsStr);
      return Array.isArray(parsed) ? parsed : [stepsStr];
    } catch {
      return stepsStr.split('\n').filter((s) => s.trim());
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
          <h1 className="text-2xl font-bold">Skills</h1>
          <p className="text-sm text-muted-foreground">Manage agent skills and capabilities</p>
        </div>
        <Dialog open={createOpen} onOpenChange={setCreateOpen}>
          <DialogTrigger asChild>
            <Button className="bg-emerald-600 hover:bg-emerald-700 text-white">
              <Plus className="w-4 h-4 mr-1.5" />
              New Skill
            </Button>
          </DialogTrigger>
          <DialogContent className="bg-card border-border">
            <DialogHeader>
              <DialogTitle>Create New Skill</DialogTitle>
              <DialogDescription>Add a new skill to the Agent OS</DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Name</Label>
                <Input
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  placeholder="Skill name..."
                  className="bg-secondary border-border"
                />
              </div>
              <div className="space-y-2">
                <Label>Description</Label>
                <Input
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                  placeholder="Brief description..."
                  className="bg-secondary border-border"
                />
              </div>
              <div className="space-y-2">
                <Label>Category</Label>
                <Select value={form.category} onValueChange={(v) => setForm({ ...form, category: v })}>
                  <SelectTrigger className="bg-secondary border-border">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-card border-border">
                    <SelectItem value="general">General</SelectItem>
                    <SelectItem value="research">Research</SelectItem>
                    <SelectItem value="coding">Coding</SelectItem>
                    <SelectItem value="writing">Writing</SelectItem>
                    <SelectItem value="automation">Automation</SelectItem>
                    <SelectItem value="communication">Communication</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Steps (one per line)</Label>
                <Textarea
                  value={form.steps}
                  onChange={(e) => setForm({ ...form, steps: e.target.value })}
                  placeholder="Step 1&#10;Step 2&#10;Step 3"
                  className="bg-secondary border-border min-h-24"
                />
              </div>
              <div className="space-y-2">
                <Label>Triggers</Label>
                <Input
                  value={form.triggers}
                  onChange={(e) => setForm({ ...form, triggers: e.target.value })}
                  placeholder="When to use this skill..."
                  className="bg-secondary border-border"
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => { setCreateOpen(false); resetForm(); }}>
                Cancel
              </Button>
              <Button className="bg-emerald-600 hover:bg-emerald-700 text-white" onClick={createSkill} disabled={!form.name}>
                Create Skill
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* Category Tabs */}
      <Tabs value={activeCategory} onValueChange={setActiveCategory}>
        <TabsList className="bg-secondary">
          {categories.map((cat) => (
            <TabsTrigger key={cat} value={cat} className="capitalize text-xs">
              {cat}
            </TabsTrigger>
          ))}
        </TabsList>
      </Tabs>

      {/* Skills Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {skills.map((skill) => {
          const isExpanded = expandedSkill === skill.id;
          const steps = parseSteps(skill.steps);
          return (
            <Card
              key={skill.id}
              className={`bg-card border-border cursor-pointer transition-all hover:border-emerald-500/30 ${
                isExpanded ? 'sm:col-span-2 lg:col-span-3' : ''
              }`}
              onClick={() => setExpandedSkill(isExpanded ? null : skill.id)}
            >
              <CardContent className="p-4">
                <div className="flex items-start gap-3">
                  <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-secondary shrink-0">
                    {skill.isAutoLearned ? (
                      <Lightbulb className="w-5 h-5 text-yellow-400" />
                    ) : (
                      <Wrench className="w-5 h-5 text-emerald-400" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <p className="text-sm font-medium truncate">{skill.name}</p>
                      <div className="flex items-center gap-1.5 ml-2 shrink-0">
                        {skill.isAutoLearned && (
                          <Badge variant="outline" className="text-[9px] bg-yellow-500/20 text-yellow-400 border-yellow-500/30">
                            Auto-learned
                          </Badge>
                        )}
                        {isExpanded ? (
                          <ChevronUp className="w-4 h-4 text-muted-foreground" />
                        ) : (
                          <ChevronDown className="w-4 h-4 text-muted-foreground" />
                        )}
                      </div>
                    </div>
                    <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{skill.description}</p>
                    <div className="flex items-center gap-1.5 mt-2">
                      <Badge variant="outline" className={`text-[10px] ${categoryColors[skill.category] || ''}`}>
                        {skill.category}
                      </Badge>
                      <span className="text-[10px] text-muted-foreground ml-1">
                        Used {skill.usageCount}x
                      </span>
                      {skill.agent && (
                        <span className="text-[10px] text-muted-foreground ml-1">
                          · {skill.agent.name}
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {isExpanded && (
                  <div className="mt-4 pt-4 border-t border-border space-y-3" onClick={(e) => e.stopPropagation()}>
                    <div>
                      <p className="text-xs text-muted-foreground font-medium mb-2">Steps</p>
                      <ol className="space-y-1.5">
                        {steps.map((step, i) => (
                          <li key={i} className="flex items-start gap-2 text-xs">
                            <span className="flex items-center justify-center w-5 h-5 rounded-full bg-emerald-500/20 text-emerald-400 text-[10px] shrink-0">
                              {i + 1}
                            </span>
                            <span className="text-foreground/80">{step}</span>
                          </li>
                        ))}
                      </ol>
                    </div>

                    {skill.triggers && (
                      <div>
                        <p className="text-xs text-muted-foreground font-medium mb-1">Triggers</p>
                        <p className="text-xs text-foreground/80 bg-secondary p-2 rounded-md">{skill.triggers}</p>
                      </div>
                    )}

                    <div className="flex items-center gap-2 pt-2">
                      <Button
                        size="sm"
                        variant="outline"
                        className="text-emerald-400 border-emerald-500/30 hover:bg-emerald-500/10"
                        onClick={() => startEdit(skill)}
                      >
                        <Pencil className="w-3 h-3 mr-1" /> Edit
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        className="text-red-400 border-red-500/30 hover:bg-red-500/10"
                        onClick={() => deleteSkill(skill.id)}
                      >
                        <Trash2 className="w-3 h-3 mr-1" /> Delete
                      </Button>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>

      {skills.length === 0 && (
        <div className="flex items-center justify-center py-12">
          <div className="text-center">
            <Wrench className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
            <p className="text-sm text-muted-foreground">No skills found in this category</p>
          </div>
        </div>
      )}

      {/* Edit Skill Dialog */}
      <Dialog open={!!editSkill} onOpenChange={(open) => { if (!open) { setEditSkill(null); resetForm(); } }}>
        <DialogContent className="bg-card border-border">
          <DialogHeader>
            <DialogTitle>Edit Skill</DialogTitle>
            <DialogDescription>Update skill details</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Name</Label>
              <Input
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                className="bg-secondary border-border"
              />
            </div>
            <div className="space-y-2">
              <Label>Description</Label>
              <Input
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                className="bg-secondary border-border"
              />
            </div>
            <div className="space-y-2">
              <Label>Category</Label>
              <Select value={form.category} onValueChange={(v) => setForm({ ...form, category: v })}>
                <SelectTrigger className="bg-secondary border-border">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-card border-border">
                  <SelectItem value="general">General</SelectItem>
                  <SelectItem value="research">Research</SelectItem>
                  <SelectItem value="coding">Coding</SelectItem>
                  <SelectItem value="writing">Writing</SelectItem>
                  <SelectItem value="automation">Automation</SelectItem>
                  <SelectItem value="communication">Communication</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Steps (one per line)</Label>
              <Textarea
                value={form.steps}
                onChange={(e) => setForm({ ...form, steps: e.target.value })}
                className="bg-secondary border-border min-h-24"
              />
            </div>
            <div className="space-y-2">
              <Label>Triggers</Label>
              <Input
                value={form.triggers}
                onChange={(e) => setForm({ ...form, triggers: e.target.value })}
                className="bg-secondary border-border"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setEditSkill(null); resetForm(); }}>
              <X className="w-4 h-4 mr-1" /> Cancel
            </Button>
            <Button className="bg-emerald-600 hover:bg-emerald-700 text-white" onClick={updateSkill} disabled={!form.name}>
              Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

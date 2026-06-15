'use client';

import { useEffect, useState, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
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
  DndContext,
  DragOverlay,
  closestCorners,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragStartEvent,
  DragEndEvent,
} from '@dnd-kit/core';
import {
  SortableContext,
  verticalListSortingStrategy,
  useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import {
  Plus,
  GripVertical,
  Trash2,
  AlertCircle,
  ArrowUp,
  ArrowRight,
  ArrowDown,
  Flame,
  User,
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface Task {
  id: string;
  title: string;
  description: string | null;
  status: string;
  priority: string;
  column: string;
  order: number;
  agentId: string | null;
  agent?: { id: string; name: string; avatar: string | null } | null;
  tags: string | null;
  dueDate: string | null;
}

interface Agent {
  id: string;
  name: string;
  avatar: string | null;
}

const columns = [
  { id: 'todo', title: 'Todo', color: 'border-slate-500' },
  { id: 'in_progress', title: 'In Progress', color: 'border-blue-500' },
  { id: 'review', title: 'Review', color: 'border-yellow-500' },
  { id: 'done', title: 'Done', color: 'border-emerald-500' },
];

const priorityIcons: Record<string, { icon: React.ElementType; color: string }> = {
  low: { icon: ArrowDown, color: 'text-slate-400' },
  medium: { icon: ArrowRight, color: 'text-blue-400' },
  high: { icon: ArrowUp, color: 'text-yellow-400' },
  urgent: { icon: Flame, color: 'text-red-400' },
};

const priorityBadgeColors: Record<string, string> = {
  low: 'bg-slate-500/20 text-slate-400',
  medium: 'bg-blue-500/20 text-blue-400',
  high: 'bg-yellow-500/20 text-yellow-400',
  urgent: 'bg-red-500/20 text-red-400',
};

function SortableTaskCard({ task, onDelete }: { task: Task; onDelete: (id: string) => void }) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: task.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  const priority = priorityIcons[task.priority] || priorityIcons.medium;
  const PriorityIcon = priority.icon;

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`group p-3 rounded-lg bg-card border border-border hover:border-emerald-500/30 transition-all cursor-grab active:cursor-grabbing ${
        isDragging ? 'opacity-50 shadow-lg' : ''
      }`}
      {...attributes}
      {...listeners}
    >
      <div className="flex items-start gap-2">
        <GripVertical className="w-3.5 h-3.5 text-muted-foreground/50 mt-0.5 shrink-0" />
        <div className="flex-1 min-w-0">
          <p className="text-xs font-medium">{task.title}</p>
          {task.description && (
            <p className="text-[10px] text-muted-foreground mt-0.5 line-clamp-2">{task.description}</p>
          )}
          <div className="flex items-center gap-1.5 mt-2 flex-wrap">
            <Badge variant="outline" className={`text-[9px] ${priorityBadgeColors[task.priority] || ''}`}>
              <PriorityIcon className="w-2.5 h-2.5 mr-0.5" />
              {task.priority}
            </Badge>
            {task.agent && (
              <div className="flex items-center gap-1 text-[10px] text-muted-foreground">
                <User className="w-2.5 h-2.5" />
                {task.agent.name}
              </div>
            )}
            {task.tags && task.tags.split(',').map((tag) => (
              <Badge key={tag} variant="outline" className="text-[9px]">
                {tag.trim()}
              </Badge>
            ))}
          </div>
        </div>
        <Button
          variant="ghost"
          size="icon"
          className="w-5 h-5 opacity-0 group-hover:opacity-100 text-red-400 shrink-0"
          onClick={(e) => {
            e.stopPropagation();
            onDelete(task.id);
          }}
        >
          <Trash2 className="w-3 h-3" />
        </Button>
      </div>
    </div>
  );
}

export function TasksView() {
  const { toast } = useToast();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [agents, setAgents] = useState<Agent[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [newTask, setNewTask] = useState({
    title: '',
    description: '',
    priority: 'medium',
    column: 'todo',
    agentId: '',
    tags: '',
  });

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor)
  );

  const loadTasks = useCallback(async () => {
    try {
      const res = await fetch('/api/tasks');
      if (res.ok) setTasks(await res.json());
    } catch (error) {
      console.error('Failed to load tasks:', error);
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
    loadTasks();
    loadAgents();
  }, [loadTasks, loadAgents]);

  function getTasksByColumn(columnId: string) {
    return tasks
      .filter((t) => t.column === columnId)
      .sort((a, b) => a.order - b.order);
  }

  function handleDragStart(event: DragStartEvent) {
    setActiveId(event.active.id as string);
  }

  async function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    setActiveId(null);

    if (!over) return;

    const taskId = active.id as string;
    const task = tasks.find((t) => t.id === taskId);
    if (!task) return;

    let targetColumn = task.column;

    if (columns.find((c) => c.id === over.id)) {
      targetColumn = over.id as string;
    } else {
      const overTask = tasks.find((t) => t.id === over.id);
      if (overTask) targetColumn = overTask.column;
    }

    if (targetColumn !== task.column) {
      const columnTasks = getTasksByColumn(targetColumn);
      const newOrder = columnTasks.length;

      try {
        await fetch(`/api/tasks/${taskId}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ column: targetColumn, order: newOrder }),
        });
        loadTasks();
        toast({ title: `Task moved to ${columns.find((c) => c.id === targetColumn)?.title}` });
      } catch {
        toast({ title: 'Failed to move task', variant: 'destructive' });
      }
    }
  }

  async function createTask() {
    try {
      const res = await fetch('/api/tasks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...newTask,
          agentId: newTask.agentId || null,
          tags: newTask.tags || null,
        }),
      });
      if (res.ok) {
        toast({ title: 'Task created' });
        setCreateOpen(false);
        setNewTask({ title: '', description: '', priority: 'medium', column: 'todo', agentId: '', tags: '' });
        loadTasks();
      }
    } catch {
      toast({ title: 'Failed to create task', variant: 'destructive' });
    }
  }

  async function deleteTask(id: string) {
    try {
      const res = await fetch(`/api/tasks/${id}`, { method: 'DELETE' });
      if (res.ok) {
        toast({ title: 'Task deleted' });
        loadTasks();
      }
    } catch {
      toast({ title: 'Failed to delete task', variant: 'destructive' });
    }
  }

  const activeTask = activeId ? tasks.find((t) => t.id === activeId) : null;

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
          <h1 className="text-2xl font-bold">Tasks</h1>
          <p className="text-sm text-muted-foreground">Kanban board for managing agent workflows</p>
        </div>
        <Dialog open={createOpen} onOpenChange={setCreateOpen}>
          <DialogTrigger asChild>
            <Button className="bg-emerald-600 hover:bg-emerald-700 text-white">
              <Plus className="w-4 h-4 mr-1.5" />
              New Task
            </Button>
          </DialogTrigger>
          <DialogContent className="bg-card border-border">
            <DialogHeader>
              <DialogTitle>Create Task</DialogTitle>
              <DialogDescription>Add a new task to the board</DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Title</Label>
                <Input
                  value={newTask.title}
                  onChange={(e) => setNewTask({ ...newTask, title: e.target.value })}
                  placeholder="Task title..."
                  className="bg-secondary border-border"
                />
              </div>
              <div className="space-y-2">
                <Label>Description</Label>
                <Textarea
                  value={newTask.description}
                  onChange={(e) => setNewTask({ ...newTask, description: e.target.value })}
                  placeholder="Describe the task..."
                  className="bg-secondary border-border"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Priority</Label>
                  <Select value={newTask.priority} onValueChange={(v) => setNewTask({ ...newTask, priority: v })}>
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
                  <Label>Column</Label>
                  <Select value={newTask.column} onValueChange={(v) => setNewTask({ ...newTask, column: v })}>
                    <SelectTrigger className="bg-secondary border-border">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-card border-border">
                      <SelectItem value="todo">Todo</SelectItem>
                      <SelectItem value="in_progress">In Progress</SelectItem>
                      <SelectItem value="review">Review</SelectItem>
                      <SelectItem value="done">Done</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="space-y-2">
                <Label>Assignee</Label>
                <Select value={newTask.agentId} onValueChange={(v) => setNewTask({ ...newTask, agentId: v })}>
                  <SelectTrigger className="bg-secondary border-border">
                    <SelectValue placeholder="Unassigned" />
                  </SelectTrigger>
                  <SelectContent className="bg-card border-border">
                    <SelectItem value="none">Unassigned</SelectItem>
                    {agents.map((agent) => (
                      <SelectItem key={agent.id} value={agent.id}>
                        {agent.avatar || '🤖'} {agent.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Tags (comma-separated)</Label>
                <Input
                  value={newTask.tags}
                  onChange={(e) => setNewTask({ ...newTask, tags: e.target.value })}
                  placeholder="e.g., api, urgent"
                  className="bg-secondary border-border"
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setCreateOpen(false)}>Cancel</Button>
              <Button
                className="bg-emerald-600 hover:bg-emerald-700 text-white"
                onClick={createTask}
                disabled={!newTask.title}
              >
                Create
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* Kanban Board */}
      <DndContext
        sensors={sensors}
        collisionDetection={closestCorners}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
      >
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {columns.map((column) => {
            const columnTasks = getTasksByColumn(column.id);
            return (
              <Card key={column.id} className={`bg-card border-border border-t-2 ${column.color}`}>
                <CardHeader className="p-3 pb-2">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-xs font-semibold">{column.title}</CardTitle>
                    <Badge variant="outline" className="text-[10px]">
                      {columnTasks.length}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="p-2 pt-0">
                  <SortableContext
                    items={columnTasks.map((t) => t.id)}
                    strategy={verticalListSortingStrategy}
                  >
                    <ScrollArea className="h-[calc(100vh-20rem)]">
                      <div className="space-y-2">
                        {columnTasks.map((task) => (
                          <SortableTaskCard
                            key={task.id}
                            task={task}
                            onDelete={deleteTask}
                          />
                        ))}
                        {columnTasks.length === 0 && (
                          <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
                            <AlertCircle className="w-5 h-5 mb-1 opacity-40" />
                            <p className="text-[10px]">Drop tasks here</p>
                          </div>
                        )}
                      </div>
                    </ScrollArea>
                  </SortableContext>
                </CardContent>
              </Card>
            );
          })}
        </div>

        <DragOverlay>
          {activeTask ? (
            <div className="p-3 rounded-lg bg-card border border-emerald-500/30 shadow-lg shadow-emerald-500/10">
              <p className="text-xs font-medium">{activeTask.title}</p>
            </div>
          ) : null}
        </DragOverlay>
      </DndContext>
    </div>
  );
}

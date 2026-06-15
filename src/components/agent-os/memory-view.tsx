'use client';

import { useEffect, useState, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
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
  Plus,
  Search,
  Pin,
  PinOff,
  Trash2,
  FolderOpen,
  FileText,
  BookOpen,
  Code2,
  Lightbulb,
  Save,
  X,
  Eye,
  Edit3,
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useAppStore } from '@/lib/store';
import ReactMarkdown from 'react-markdown';

interface Memory {
  id: string;
  title: string;
  content: string;
  type: string;
  tags: string | null;
  folder: string;
  isPinned: boolean;
  agentId: string | null;
  agent?: { name: string } | null;
  updatedAt: string;
}

const folders = [
  { name: 'General', icon: FolderOpen },
  { name: 'Research', icon: Search },
  { name: 'Code', icon: Code2 },
  { name: 'Projects', icon: Lightbulb },
  { name: 'Reference', icon: BookOpen },
];

const typeColors: Record<string, string> = {
  note: 'bg-blue-500/20 text-blue-400',
  document: 'bg-emerald-500/20 text-emerald-400',
  reference: 'bg-purple-500/20 text-purple-400',
  log: 'bg-yellow-500/20 text-yellow-400',
};

export function MemoryView() {
  const { selectedFolder, setSelectedFolder, selectedMemoryId, setSelectedMemoryId } = useAppStore();
  const { toast } = useToast();
  const [memories, setMemories] = useState<Memory[]>([]);
  const [selectedMemory, setSelectedMemory] = useState<Memory | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [createOpen, setCreateOpen] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [editContent, setEditContent] = useState({ title: '', content: '', tags: '', type: 'note', folder: 'General' });
  const [newMemory, setNewMemory] = useState({
    title: '',
    content: '',
    type: 'note',
    tags: '',
    folder: 'General',
  });

  const loadMemories = useCallback(async () => {
    try {
      const params = new URLSearchParams();
      if (selectedFolder) params.set('folder', selectedFolder);
      if (searchQuery) params.set('search', searchQuery);
      const res = await fetch(`/api/memory?${params.toString()}`);
      if (res.ok) setMemories(await res.json());
    } catch (error) {
      console.error('Failed to load memories:', error);
    } finally {
      setLoading(false);
    }
  }, [selectedFolder, searchQuery]);

  useEffect(() => {
    loadMemories();
  }, [loadMemories]);

  useEffect(() => {
    if (selectedMemoryId) {
      const mem = memories.find((m) => m.id === selectedMemoryId);
      if (mem) {
        setSelectedMemory(mem);
        setEditContent({
          title: mem.title,
          content: mem.content,
          tags: mem.tags || '',
          type: mem.type,
          folder: mem.folder,
        });
      }
    }
  }, [selectedMemoryId, memories]);

  function selectMemory(mem: Memory) {
    setSelectedMemory(mem);
    setSelectedMemoryId(mem.id);
    setEditMode(false);
    setEditContent({
      title: mem.title,
      content: mem.content,
      tags: mem.tags || '',
      type: mem.type,
      folder: mem.folder,
    });
  }

  async function createMemory() {
    try {
      const res = await fetch('/api/memory', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...newMemory,
          tags: newMemory.tags || null,
        }),
      });
      if (res.ok) {
        toast({ title: 'Memory created successfully' });
        setCreateOpen(false);
        setNewMemory({ title: '', content: '', type: 'note', tags: '', folder: selectedFolder });
        loadMemories();
      }
    } catch {
      toast({ title: 'Failed to create memory', variant: 'destructive' });
    }
  }

  async function updateMemory() {
    if (!selectedMemory) return;
    try {
      const res = await fetch(`/api/memory/${selectedMemory.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...editContent,
          tags: editContent.tags || null,
        }),
      });
      if (res.ok) {
        toast({ title: 'Memory updated' });
        setEditMode(false);
        loadMemories();
        const updated = await res.json();
        setSelectedMemory(updated);
      }
    } catch {
      toast({ title: 'Failed to update memory', variant: 'destructive' });
    }
  }

  async function togglePin() {
    if (!selectedMemory) return;
    try {
      const res = await fetch(`/api/memory/${selectedMemory.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isPinned: !selectedMemory.isPinned }),
      });
      if (res.ok) {
        loadMemories();
        const updated = await res.json();
        setSelectedMemory(updated);
      }
    } catch {
      toast({ title: 'Failed to toggle pin', variant: 'destructive' });
    }
  }

  async function deleteMemory(id: string) {
    try {
      const res = await fetch(`/api/memory/${id}`, { method: 'DELETE' });
      if (res.ok) {
        toast({ title: 'Memory deleted' });
        if (selectedMemory?.id === id) {
          setSelectedMemory(null);
          setSelectedMemoryId(null);
        }
        loadMemories();
      }
    } catch {
      toast({ title: 'Failed to delete memory', variant: 'destructive' });
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
          <h1 className="text-2xl font-bold">Memory</h1>
          <p className="text-sm text-muted-foreground">Persistent knowledge storage for your agents</p>
        </div>
        <Dialog open={createOpen} onOpenChange={setCreateOpen}>
          <DialogTrigger asChild>
            <Button className="bg-emerald-600 hover:bg-emerald-700 text-white">
              <Plus className="w-4 h-4 mr-1.5" />
              New Memory
            </Button>
          </DialogTrigger>
          <DialogContent className="bg-card border-border">
            <DialogHeader>
              <DialogTitle>Create Memory Entry</DialogTitle>
              <DialogDescription>Store knowledge for your agents</DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Title</Label>
                <Input
                  value={newMemory.title}
                  onChange={(e) => setNewMemory({ ...newMemory, title: e.target.value })}
                  placeholder="Memory title..."
                  className="bg-secondary border-border"
                />
              </div>
              <div className="space-y-2">
                <Label>Content</Label>
                <Textarea
                  value={newMemory.content}
                  onChange={(e) => setNewMemory({ ...newMemory, content: e.target.value })}
                  placeholder="Write your content here... (Markdown supported)"
                  className="bg-secondary border-border min-h-32"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Type</Label>
                  <Select value={newMemory.type} onValueChange={(v) => setNewMemory({ ...newMemory, type: v })}>
                    <SelectTrigger className="bg-secondary border-border">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-card border-border">
                      <SelectItem value="note">Note</SelectItem>
                      <SelectItem value="document">Document</SelectItem>
                      <SelectItem value="reference">Reference</SelectItem>
                      <SelectItem value="log">Log</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Folder</Label>
                  <Select value={newMemory.folder} onValueChange={(v) => setNewMemory({ ...newMemory, folder: v })}>
                    <SelectTrigger className="bg-secondary border-border">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-card border-border">
                      {folders.map((f) => (
                        <SelectItem key={f.name} value={f.name}>{f.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="space-y-2">
                <Label>Tags (comma-separated)</Label>
                <Input
                  value={newMemory.tags}
                  onChange={(e) => setNewMemory({ ...newMemory, tags: e.target.value })}
                  placeholder="e.g., api, design, reference"
                  className="bg-secondary border-border"
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setCreateOpen(false)}>Cancel</Button>
              <Button
                className="bg-emerald-600 hover:bg-emerald-700 text-white"
                onClick={createMemory}
                disabled={!newMemory.title}
              >
                Create
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <div className="flex gap-4 h-[calc(100vh-12rem)]">
        {/* Folder Sidebar */}
        <Card className="w-48 shrink-0 bg-card border-border flex flex-col">
          <CardHeader className="p-3 pb-2">
            <CardTitle className="text-xs font-semibold text-muted-foreground">Folders</CardTitle>
          </CardHeader>
          <ScrollArea className="flex-1">
            <div className="p-2 space-y-0.5">
              {folders.map((folder) => {
                const Icon = folder.icon;
                const isActive = selectedFolder === folder.name;
                return (
                  <button
                    key={folder.name}
                    onClick={() => setSelectedFolder(folder.name)}
                    className={`flex items-center gap-2 w-full px-3 py-2 rounded-lg text-xs transition-colors ${
                      isActive
                        ? 'bg-emerald-500/15 text-emerald-400'
                        : 'text-muted-foreground hover:text-foreground hover:bg-accent'
                    }`}
                  >
                    <Icon className="w-3.5 h-3.5" />
                    {folder.name}
                  </button>
                );
              })}
            </div>
          </ScrollArea>
          <div className="p-3 border-t border-border">
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
              <Input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search..."
                className="bg-secondary border-border pl-8 text-xs h-8"
              />
            </div>
          </div>
        </Card>

        {/* Note List */}
        <Card className="w-64 shrink-0 bg-card border-border flex flex-col">
          <CardHeader className="p-3 pb-2">
            <CardTitle className="text-xs font-semibold text-muted-foreground">
              {selectedFolder} ({memories.length})
            </CardTitle>
          </CardHeader>
          <ScrollArea className="flex-1">
            <div className="p-2 space-y-1">
              {memories.map((mem) => (
                <div
                  key={mem.id}
                  className={`p-2.5 rounded-lg cursor-pointer transition-colors ${
                    selectedMemory?.id === mem.id
                      ? 'bg-emerald-500/15 border border-emerald-500/30'
                      : 'hover:bg-accent border border-transparent'
                  }`}
                  onClick={() => selectMemory(mem)}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5">
                        {mem.isPinned && <Pin className="w-3 h-3 text-emerald-400 shrink-0" />}
                        <p className="text-xs font-medium truncate">{mem.title}</p>
                      </div>
                      <p className="text-[10px] text-muted-foreground mt-0.5 line-clamp-2">
                        {mem.content.slice(0, 80)}...
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5 mt-1.5">
                    <Badge variant="outline" className={`text-[9px] ${typeColors[mem.type] || ''}`}>
                      {mem.type}
                    </Badge>
                    {mem.tags && (
                      <span className="text-[9px] text-muted-foreground truncate">
                        {mem.tags.split(',').slice(0, 2).join(', ')}
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </ScrollArea>
        </Card>

        {/* Note Editor */}
        <Card className="flex-1 bg-card border-border flex flex-col">
          {selectedMemory ? (
            <>
              <div className="flex items-center justify-between p-3 border-b border-border">
                <div className="flex items-center gap-2">
                  <FileText className="w-4 h-4 text-emerald-400" />
                  {editMode ? (
                    <Input
                      value={editContent.title}
                      onChange={(e) => setEditContent({ ...editContent, title: e.target.value })}
                      className="bg-secondary border-border text-sm h-7"
                    />
                  ) : (
                    <span className="text-sm font-medium">{selectedMemory.title}</span>
                  )}
                </div>
                <div className="flex items-center gap-1.5">
                  <Button variant="ghost" size="icon" className="w-7 h-7" onClick={togglePin}>
                    {selectedMemory.isPinned ? (
                      <PinOff className="w-3.5 h-3.5 text-emerald-400" />
                    ) : (
                      <Pin className="w-3.5 h-3.5" />
                    )}
                  </Button>
                  {editMode ? (
                    <>
                      <Button variant="ghost" size="icon" className="w-7 h-7" onClick={() => setEditMode(false)}>
                        <X className="w-3.5 h-3.5" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="w-7 h-7 text-emerald-400"
                        onClick={updateMemory}
                      >
                        <Save className="w-3.5 h-3.5" />
                      </Button>
                    </>
                  ) : (
                    <Button variant="ghost" size="icon" className="w-7 h-7" onClick={() => setEditMode(true)}>
                      <FileText className="w-3.5 h-3.5" />
                    </Button>
                  )}
                  <Button
                    variant="ghost"
                    size="icon"
                    className="w-7 h-7 text-red-400"
                    onClick={() => deleteMemory(selectedMemory.id)}
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </Button>
                </div>
              </div>
              <ScrollArea className="flex-1 p-4">
                {editMode ? (
                  <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-2">
                      <Button
                        variant={editMode ? 'default' : 'ghost'}
                        size="sm"
                        className={`text-xs h-7 ${editMode ? 'bg-emerald-600' : ''}`}
                        onClick={() => setEditMode(true)}
                      >
                        <Edit3 className="w-3 h-3 mr-1" /> Edit
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-xs h-7"
                        onClick={() => setEditMode(false)}
                      >
                        <Eye className="w-3 h-3 mr-1" /> Preview
                      </Button>
                    </div>
                    <Textarea
                      value={editContent.content}
                      onChange={(e) => setEditContent({ ...editContent, content: e.target.value })}
                      className="bg-secondary border-border min-h-64 font-mono text-sm"
                      placeholder="Write content here... (Markdown supported)"
                    />
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-1">
                        <Label className="text-xs">Type</Label>
                        <Select value={editContent.type} onValueChange={(v) => setEditContent({ ...editContent, type: v })}>
                          <SelectTrigger className="bg-secondary border-border text-xs h-8">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent className="bg-card border-border">
                            <SelectItem value="note">Note</SelectItem>
                            <SelectItem value="document">Document</SelectItem>
                            <SelectItem value="reference">Reference</SelectItem>
                            <SelectItem value="log">Log</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs">Tags</Label>
                        <Input
                          value={editContent.tags}
                          onChange={(e) => setEditContent({ ...editContent, tags: e.target.value })}
                          className="bg-secondary border-border text-xs h-8"
                        />
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="prose prose-invert prose-sm max-w-none">
                    <ReactMarkdown
                      components={{
                        h1: ({ children }) => <h1 className="text-lg font-bold text-foreground mb-2">{children}</h1>,
                        h2: ({ children }) => <h2 className="text-base font-semibold text-foreground mb-1.5">{children}</h2>,
                        h3: ({ children }) => <h3 className="text-sm font-medium text-foreground mb-1">{children}</h3>,
                        p: ({ children }) => <p className="text-sm text-foreground/90 mb-2 leading-relaxed">{children}</p>,
                        ul: ({ children }) => <ul className="text-sm text-foreground/90 mb-2 list-disc pl-4 space-y-1">{children}</ul>,
                        ol: ({ children }) => <ol className="text-sm text-foreground/90 mb-2 list-decimal pl-4 space-y-1">{children}</ol>,
                        li: ({ children }) => <li className="text-sm">{children}</li>,
                        code: ({ children }) => <code className="bg-secondary px-1.5 py-0.5 rounded text-emerald-400 text-xs font-mono">{children}</code>,
                        pre: ({ children }) => <pre className="bg-secondary p-3 rounded-lg mb-2 overflow-x-auto">{children}</pre>,
                        blockquote: ({ children }) => <blockquote className="border-l-2 border-emerald-500 pl-3 italic text-muted-foreground mb-2">{children}</blockquote>,
                        a: ({ children, href }) => <a href={href} className="text-emerald-400 hover:underline" target="_blank" rel="noopener noreferrer">{children}</a>,
                        strong: ({ children }) => <strong className="font-semibold text-foreground">{children}</strong>,
                        em: ({ children }) => <em className="italic text-foreground/80">{children}</em>,
                      }}
                    >
                      {selectedMemory.content}
                    </ReactMarkdown>
                  </div>
                )}
              </ScrollArea>
              <div className="p-3 border-t border-border flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className={`text-[10px] ${typeColors[selectedMemory.type] || ''}`}>
                    {selectedMemory.type}
                  </Badge>
                  <Badge variant="outline" className="text-[10px]">
                    {selectedMemory.folder}
                  </Badge>
                  {selectedMemory.tags && selectedMemory.tags.split(',').map((tag) => (
                    <Badge key={tag} variant="outline" className="text-[10px]">
                      {tag.trim()}
                    </Badge>
                  ))}
                </div>
                <span className="text-[10px] text-muted-foreground">
                  Updated {new Date(selectedMemory.updatedAt).toLocaleDateString()}
                </span>
              </div>
            </>
          ) : (
            <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
              <FileText className="w-12 h-12 mb-3 text-emerald-500/40" />
              <p className="text-sm">Select a memory entry to view</p>
              <p className="text-xs mt-1">Or create a new one</p>
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}

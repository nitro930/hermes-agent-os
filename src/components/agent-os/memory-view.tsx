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
  Columns2,
  PanelLeft,
  PanelRight,
  Clock,
  User,
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
  createdAt: string;
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

type EditorMode = 'edit' | 'preview' | 'split';

export function MemoryView() {
  const { selectedFolder, setSelectedFolder, selectedMemoryId, setSelectedMemoryId } = useAppStore();
  const { toast } = useToast();
  const [memories, setMemories] = useState<Memory[]>([]);
  const [selectedMemory, setSelectedMemory] = useState<Memory | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [createOpen, setCreateOpen] = useState(false);
  const [editorMode, setEditorMode] = useState<EditorMode>('preview');
  const [editContent, setEditContent] = useState({ title: '', content: '', tags: '', type: 'note', folder: 'General' });
  const [newMemory, setNewMemory] = useState({
    title: '',
    content: '',
    type: 'note',
    tags: '',
    folder: 'General',
  });
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);

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
        setHasUnsavedChanges(false);
      }
    }
  }, [selectedMemoryId, memories]);

  function selectMemory(mem: Memory) {
    if (hasUnsavedChanges) {
      if (!window.confirm('You have unsaved changes. Discard them?')) return;
    }
    setSelectedMemory(mem);
    setSelectedMemoryId(mem.id);
    setEditorMode('preview');
    setEditContent({
      title: mem.title,
      content: mem.content,
      tags: mem.tags || '',
      type: mem.type,
      folder: mem.folder,
    });
    setHasUnsavedChanges(false);
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
        setHasUnsavedChanges(false);
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
          setEditorMode('preview');
        }
        loadMemories();
      }
    } catch {
      toast({ title: 'Failed to delete memory', variant: 'destructive' });
    }
  }

  // Keyboard shortcut: Ctrl/Cmd+S to save
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key === 's') {
        e.preventDefault();
        if (hasUnsavedChanges && selectedMemory) {
          updateMemory();
        }
      }
    }
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="w-8 h-8 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const markdownComponents = {
    h1: ({ children }: React.HTMLAttributes<HTMLHeadingElement>) => <h1 className="text-lg font-bold text-foreground mb-2">{children}</h1>,
    h2: ({ children }: React.HTMLAttributes<HTMLHeadingElement>) => <h2 className="text-base font-semibold text-foreground mb-1.5">{children}</h2>,
    h3: ({ children }: React.HTMLAttributes<HTMLHeadingElement>) => <h3 className="text-sm font-medium text-foreground mb-1">{children}</h3>,
    p: ({ children }: React.HTMLAttributes<HTMLParagraphElement>) => <p className="text-sm text-foreground/90 mb-2 leading-relaxed">{children}</p>,
    ul: ({ children }: React.HTMLAttributes<HTMLUListElement>) => <ul className="text-sm text-foreground/90 mb-2 list-disc pl-4 space-y-1">{children}</ul>,
    ol: ({ children }: React.HTMLAttributes<HTMLOListElement>) => <ol className="text-sm text-foreground/90 mb-2 list-decimal pl-4 space-y-1">{children}</ol>,
    li: ({ children }: React.HTMLAttributes<HTMLLIElement>) => <li className="text-sm">{children}</li>,
    code: ({ children, className }: React.HTMLAttributes<HTMLElement> & { className?: string }) => {
      const isBlock = className?.includes('language-');
      if (isBlock) return <code className="block bg-secondary p-3 rounded-lg mb-2 overflow-x-auto text-emerald-400 text-xs font-mono">{children}</code>;
      return <code className="bg-secondary px-1.5 py-0.5 rounded text-emerald-400 text-xs font-mono">{children}</code>;
    },
    pre: ({ children }: React.HTMLAttributes<HTMLPreElement>) => <pre className="bg-secondary p-3 rounded-lg mb-2 overflow-x-auto">{children}</pre>,
    blockquote: ({ children }: React.HTMLAttributes<HTMLQuoteElement>) => <blockquote className="border-l-2 border-emerald-500 pl-3 italic text-muted-foreground mb-2">{children}</blockquote>,
    a: ({ children, href }: React.AnchorHTMLAttributes<HTMLAnchorElement>) => <a href={href} className="text-emerald-400 hover:underline" target="_blank" rel="noopener noreferrer">{children}</a>,
    strong: ({ children }: React.HTMLAttributes<HTMLElement>) => <strong className="font-semibold text-foreground">{children}</strong>,
    em: ({ children }: React.HTMLAttributes<HTMLElement>) => <em className="italic text-foreground/80">{children}</em>,
    table: ({ children }: React.HTMLAttributes<HTMLTableElement>) => <table className="w-full text-sm border border-border mb-2">{children}</table>,
    th: ({ children }: React.HTMLAttributes<HTMLTableCellElement>) => <th className="border border-border px-2 py-1 bg-secondary text-left text-xs font-medium">{children}</th>,
    td: ({ children }: React.HTMLAttributes<HTMLTableCellElement>) => <td className="border border-border px-2 py-1 text-xs">{children}</td>,
  };

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
                const count = memories.filter(m => m.folder === folder.name).length;
                return (
                  <button
                    key={folder.name}
                    onClick={() => setSelectedFolder(folder.name)}
                    className={`flex items-center justify-between w-full px-3 py-2 rounded-lg text-xs transition-colors ${
                      isActive
                        ? 'bg-emerald-500/15 text-emerald-400'
                        : 'text-muted-foreground hover:text-foreground hover:bg-accent'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <Icon className="w-3.5 h-3.5" />
                      {folder.name}
                    </div>
                    {count > 0 && (
                      <span className="text-[9px] opacity-60">{count}</span>
                    )}
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

        {/* Note Editor / Preview */}
        <Card className="flex-1 bg-card border-border flex flex-col">
          {selectedMemory ? (
            <>
              {/* Toolbar */}
              <div className="flex items-center justify-between p-3 border-b border-border">
                <div className="flex items-center gap-2">
                  <FileText className="w-4 h-4 text-emerald-400" />
                  {editorMode !== 'preview' ? (
                    <Input
                      value={editContent.title}
                      onChange={(e) => {
                        setEditContent({ ...editContent, title: e.target.value });
                        setHasUnsavedChanges(true);
                      }}
                      className="bg-secondary border-border text-sm h-7 max-w-64"
                    />
                  ) : (
                    <span className="text-sm font-medium">{selectedMemory.title}</span>
                  )}
                  {hasUnsavedChanges && (
                    <Badge variant="outline" className="text-[9px] border-orange-500/30 text-orange-400">
                      Unsaved
                    </Badge>
                  )}
                </div>
                <div className="flex items-center gap-1.5">
                  {/* Editor Mode Toggles */}
                  <div className="flex items-center bg-secondary rounded-lg p-0.5 mr-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      className={`h-6 px-2 text-[10px] ${editorMode === 'edit' ? 'bg-card shadow-sm text-emerald-400' : 'text-muted-foreground'}`}
                      onClick={() => setEditorMode('edit')}
                      title="Edit mode"
                    >
                      <Edit3 className="w-3 h-3" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className={`h-6 px-2 text-[10px] ${editorMode === 'split' ? 'bg-card shadow-sm text-emerald-400' : 'text-muted-foreground'}`}
                      onClick={() => setEditorMode('split')}
                      title="Split mode"
                    >
                      <Columns2 className="w-3 h-3" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className={`h-6 px-2 text-[10px] ${editorMode === 'preview' ? 'bg-card shadow-sm text-emerald-400' : 'text-muted-foreground'}`}
                      onClick={() => {
                        if (hasUnsavedChanges) {
                          if (!window.confirm('You have unsaved changes. Discard them?')) return;
                          setEditContent({
                            title: selectedMemory.title,
                            content: selectedMemory.content,
                            tags: selectedMemory.tags || '',
                            type: selectedMemory.type,
                            folder: selectedMemory.folder,
                          });
                          setHasUnsavedChanges(false);
                        }
                        setEditorMode('preview');
                      }}
                      title="Preview mode"
                    >
                      <Eye className="w-3 h-3" />
                    </Button>
                  </div>

                  <Button variant="ghost" size="icon" className="w-7 h-7" onClick={togglePin}>
                    {selectedMemory.isPinned ? (
                      <PinOff className="w-3.5 h-3.5 text-emerald-400" />
                    ) : (
                      <Pin className="w-3.5 h-3.5" />
                    )}
                  </Button>
                  {hasUnsavedChanges && (
                    <Button
                      variant="ghost"
                      size="icon"
                      className="w-7 h-7 text-emerald-400"
                      onClick={updateMemory}
                      title="Save (Ctrl+S)"
                    >
                      <Save className="w-3.5 h-3.5" />
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

              {/* Editor Content */}
              <div className="flex-1 flex overflow-hidden">
                {editorMode === 'edit' && (
                  <div className="flex-1 flex flex-col overflow-hidden">
                    {/* Metadata bar */}
                    <div className="flex items-center gap-4 px-4 py-2 border-b border-border bg-secondary/30">
                      <div className="flex items-center gap-1.5">
                        <Label className="text-[10px] text-muted-foreground">Type</Label>
                        <Select value={editContent.type} onValueChange={(v) => { setEditContent({ ...editContent, type: v }); setHasUnsavedChanges(true); }}>
                          <SelectTrigger className="bg-secondary border-border text-xs h-6 w-24">
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
                      <div className="flex items-center gap-1.5">
                        <Label className="text-[10px] text-muted-foreground">Tags</Label>
                        <Input
                          value={editContent.tags}
                          onChange={(e) => { setEditContent({ ...editContent, tags: e.target.value }); setHasUnsavedChanges(true); }}
                          className="bg-secondary border-border text-xs h-6 w-40"
                          placeholder="api, design..."
                        />
                      </div>
                      <div className="flex items-center gap-1.5">
                        <Label className="text-[10px] text-muted-foreground">Folder</Label>
                        <Select value={editContent.folder} onValueChange={(v) => { setEditContent({ ...editContent, folder: v }); setHasUnsavedChanges(true); }}>
                          <SelectTrigger className="bg-secondary border-border text-xs h-6 w-24">
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
                    <Textarea
                      value={editContent.content}
                      onChange={(e) => { setEditContent({ ...editContent, content: e.target.value }); setHasUnsavedChanges(true); }}
                      className="flex-1 bg-transparent border-0 font-mono text-sm resize-none focus-visible:ring-0 p-4 rounded-none"
                      placeholder="Write content here... (Markdown supported)"
                    />
                  </div>
                )}

                {editorMode === 'split' && (
                  <>
                    {/* Left: Editor */}
                    <div className="w-1/2 flex flex-col border-r border-border overflow-hidden">
                      <div className="flex items-center gap-1 px-3 py-1.5 border-b border-border bg-secondary/30">
                        <Edit3 className="w-3 h-3 text-muted-foreground" />
                        <span className="text-[10px] text-muted-foreground">Editor</span>
                        <span className="ml-auto text-[9px] text-muted-foreground">{editContent.content.length} chars</span>
                      </div>
                      <div className="flex items-center gap-3 px-3 py-1.5 border-b border-border bg-secondary/20">
                        <Select value={editContent.type} onValueChange={(v) => { setEditContent({ ...editContent, type: v }); setHasUnsavedChanges(true); }}>
                          <SelectTrigger className="bg-secondary border-border text-[10px] h-5 w-20">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent className="bg-card border-border">
                            <SelectItem value="note">Note</SelectItem>
                            <SelectItem value="document">Document</SelectItem>
                            <SelectItem value="reference">Reference</SelectItem>
                            <SelectItem value="log">Log</SelectItem>
                          </SelectContent>
                        </Select>
                        <Input
                          value={editContent.tags}
                          onChange={(e) => { setEditContent({ ...editContent, tags: e.target.value }); setHasUnsavedChanges(true); }}
                          className="bg-secondary border-border text-[10px] h-5 flex-1"
                          placeholder="Tags..."
                        />
                      </div>
                      <Textarea
                        value={editContent.content}
                        onChange={(e) => { setEditContent({ ...editContent, content: e.target.value }); setHasUnsavedChanges(true); }}
                        className="flex-1 bg-transparent border-0 font-mono text-xs resize-none focus-visible:ring-0 p-4 rounded-none"
                        placeholder="Write content here... (Markdown supported)"
                      />
                    </div>
                    {/* Right: Live Preview */}
                    <div className="w-1/2 flex flex-col overflow-hidden">
                      <div className="flex items-center gap-1 px-3 py-1.5 border-b border-border bg-secondary/30">
                        <Eye className="w-3 h-3 text-muted-foreground" />
                        <span className="text-[10px] text-muted-foreground">Preview</span>
                      </div>
                      <ScrollArea className="flex-1 p-4">
                        <div className="prose prose-invert prose-sm max-w-none">
                          <ReactMarkdown components={markdownComponents}>
                            {editContent.content}
                          </ReactMarkdown>
                        </div>
                      </ScrollArea>
                    </div>
                  </>
                )}

                {editorMode === 'preview' && (
                  <ScrollArea className="flex-1 p-4">
                    <div className="prose prose-invert prose-sm max-w-none">
                      <ReactMarkdown components={markdownComponents}>
                        {selectedMemory.content}
                      </ReactMarkdown>
                    </div>
                  </ScrollArea>
                )}
              </div>

              {/* Footer */}
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
                <div className="flex items-center gap-3 text-[10px] text-muted-foreground">
                  {selectedMemory.agent && (
                    <div className="flex items-center gap-1">
                      <User className="w-3 h-3" />
                      {selectedMemory.agent.name}
                    </div>
                  )}
                  <div className="flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    Updated {new Date(selectedMemory.updatedAt).toLocaleDateString()}
                  </div>
                </div>
              </div>
            </>
          ) : (
            <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
              <FileText className="w-12 h-12 mb-3 text-emerald-500/40" />
              <p className="text-sm">Select a memory entry to view</p>
              <p className="text-xs mt-1">Or create a new one</p>
              <p className="text-[10px] mt-4 text-muted-foreground/60">Tip: Use Edit, Split, or Preview mode to switch views</p>
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}

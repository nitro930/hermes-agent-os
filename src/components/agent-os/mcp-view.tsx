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
import { Label } from '@/components/ui/label';
import {
  Plus,
  Plug,
  Trash2,
  Wifi,
  WifiOff,
  AlertTriangle,
  ChevronDown,
  ChevronUp,
  Wrench,
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface McpServer {
  id: string;
  name: string;
  description: string | null;
  url: string;
  status: string;
  toolsCount: number;
  createdAt: string;
}

const statusConfig: Record<string, { label: string; color: string; dotColor: string; icon: React.ElementType }> = {
  connected: { label: 'Connected', color: 'text-emerald-400', dotColor: 'bg-emerald-500', icon: Wifi },
  disconnected: { label: 'Disconnected', color: 'text-slate-400', dotColor: 'bg-slate-500', icon: WifiOff },
  error: { label: 'Error', color: 'text-red-400', dotColor: 'bg-red-500', icon: AlertTriangle },
};

const mockTools: Record<string, string[]> = {
  'Web Search': ['web_search', 'image_search', 'news_search', 'academic_search', 'fact_check'],
  'File System': ['read_file', 'write_file', 'list_dir', 'create_dir', 'delete_file', 'move_file', 'copy_file', 'get_info'],
  'Database': [],
  'Code Interpreter': ['execute_code', 'install_package', 'run_tests'],
};

export function McpView() {
  const { toast } = useToast();
  const [servers, setServers] = useState<McpServer[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedServer, setExpandedServer] = useState<string | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [form, setForm] = useState({
    name: '',
    description: '',
    url: '',
  });

  const loadServers = useCallback(async () => {
    try {
      const res = await fetch('/api/mcp');
      if (res.ok) setServers(await res.json());
    } catch (error) {
      console.error('Failed to load MCP servers:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadServers();
  }, [loadServers]);

  async function createServer() {
    try {
      const res = await fetch('/api/mcp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: form.name,
          description: form.description || null,
          url: form.url,
          status: 'disconnected',
          toolsCount: 0,
        }),
      });
      if (res.ok) {
        toast({ title: 'MCP server added successfully' });
        setCreateOpen(false);
        setForm({ name: '', description: '', url: '' });
        loadServers();
      }
    } catch {
      toast({ title: 'Failed to add MCP server', variant: 'destructive' });
    }
  }

  async function toggleConnection(server: McpServer) {
    const newStatus = server.status === 'connected' ? 'disconnected' : 'connected';
    const newToolsCount = newStatus === 'connected' ? (mockTools[server.name]?.length || Math.floor(Math.random() * 8) + 1) : 0;
    try {
      const res = await fetch(`/api/mcp/${server.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus, toolsCount: newToolsCount }),
      });
      if (res.ok) {
        toast({ title: `Server ${newStatus === 'connected' ? 'connected' : 'disconnected'}` });
        loadServers();
      }
    } catch {
      toast({ title: 'Failed to update server status', variant: 'destructive' });
    }
  }

  async function deleteServer(id: string) {
    try {
      const res = await fetch(`/api/mcp/${id}`, { method: 'DELETE' });
      if (res.ok) {
        toast({ title: 'MCP server removed' });
        setExpandedServer(null);
        loadServers();
      }
    } catch {
      toast({ title: 'Failed to remove MCP server', variant: 'destructive' });
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="w-8 h-8 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const connectedCount = servers.filter((s) => s.status === 'connected').length;
  const totalTools = servers.reduce((sum, s) => sum + s.toolsCount, 0);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">MCP Servers</h1>
          <p className="text-sm text-muted-foreground">Manage Model Context Protocol servers and tools</p>
        </div>
        <Dialog open={createOpen} onOpenChange={setCreateOpen}>
          <DialogTrigger asChild>
            <Button className="bg-emerald-600 hover:bg-emerald-700 text-white">
              <Plus className="w-4 h-4 mr-1.5" />
              Add Server
            </Button>
          </DialogTrigger>
          <DialogContent className="bg-card border-border">
            <DialogHeader>
              <DialogTitle>Add MCP Server</DialogTitle>
              <DialogDescription>Connect a new MCP server to the Agent OS</DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Name</Label>
                <Input
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  placeholder="Server name..."
                  className="bg-secondary border-border"
                />
              </div>
              <div className="space-y-2">
                <Label>Description</Label>
                <Textarea
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                  placeholder="Brief description..."
                  className="bg-secondary border-border min-h-16"
                />
              </div>
              <div className="space-y-2">
                <Label>URL</Label>
                <Input
                  value={form.url}
                  onChange={(e) => setForm({ ...form, url: e.target.value })}
                  placeholder="mcp://server-name"
                  className="bg-secondary border-border"
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setCreateOpen(false)}>
                Cancel
              </Button>
              <Button className="bg-emerald-600 hover:bg-emerald-700 text-white" onClick={createServer} disabled={!form.name || !form.url}>
                Add Server
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
              <Plug className="w-5 h-5" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Total Servers</p>
              <p className="text-xl font-bold">{servers.length}</p>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-card border-border">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2.5 rounded-lg bg-blue-500/20 text-blue-400">
              <Wifi className="w-5 h-5" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Connected</p>
              <p className="text-xl font-bold">{connectedCount}</p>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-card border-border">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2.5 rounded-lg bg-purple-500/20 text-purple-400">
              <Wrench className="w-5 h-5" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Available Tools</p>
              <p className="text-xl font-bold">{totalTools}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Server List */}
      <div className="space-y-3">
        {servers.map((server) => {
          const config = statusConfig[server.status] || statusConfig.disconnected;
          const StatusIcon = config.icon;
          const isExpanded = expandedServer === server.id;
          const tools = mockTools[server.name] || [];

          return (
            <Card
              key={server.id}
              className={`bg-card border-border cursor-pointer transition-all hover:border-emerald-500/30 ${
                server.status === 'error' ? 'border-red-500/30' : ''
              }`}
              onClick={() => setExpandedServer(isExpanded ? null : server.id)}
            >
              <CardContent className="p-4">
                <div className="flex items-start gap-3">
                  <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-secondary shrink-0">
                    <Plug className={`w-5 h-5 ${config.color}`} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <p className="text-sm font-medium">{server.name}</p>
                      <div className="flex items-center gap-2 ml-2 shrink-0">
                        <div className="flex items-center gap-1.5">
                          <div className={`w-2 h-2 rounded-full ${config.dotColor} ${server.status === 'connected' ? 'pulse-emerald' : ''}`} />
                          <span className={`text-[10px] ${config.color}`}>{config.label}</span>
                        </div>
                        {isExpanded ? (
                          <ChevronUp className="w-4 h-4 text-muted-foreground" />
                        ) : (
                          <ChevronDown className="w-4 h-4 text-muted-foreground" />
                        )}
                      </div>
                    </div>
                    <p className="text-xs text-muted-foreground mt-0.5">{server.url}</p>
                    <div className="flex items-center gap-1.5 mt-2">
                      <Badge variant="outline" className="text-[10px]">
                        {server.toolsCount} tools
                      </Badge>
                      {server.description && (
                        <span className="text-[10px] text-muted-foreground truncate">{server.description}</span>
                      )}
                    </div>
                  </div>
                </div>

                {isExpanded && (
                  <div className="mt-4 pt-4 border-t border-border space-y-3" onClick={(e) => e.stopPropagation()}>
                    {/* Connection Controls */}
                    <div className="flex items-center gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        className={
                          server.status === 'connected'
                            ? 'text-red-400 border-red-500/30 hover:bg-red-500/10'
                            : 'text-emerald-400 border-emerald-500/30 hover:bg-emerald-500/10'
                        }
                        onClick={() => toggleConnection(server)}
                      >
                        {server.status === 'connected' ? (
                          <>
                            <WifiOff className="w-3 h-3 mr-1" /> Disconnect
                          </>
                        ) : (
                          <>
                            <Wifi className="w-3 h-3 mr-1" /> Connect
                          </>
                        )}
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        className="text-red-400 border-red-500/30 hover:bg-red-500/10"
                        onClick={() => deleteServer(server.id)}
                      >
                        <Trash2 className="w-3 h-3 mr-1" /> Remove
                      </Button>
                    </div>

                    {/* Tools List */}
                    {server.status === 'connected' && tools.length > 0 && (
                      <div>
                        <p className="text-xs text-muted-foreground font-medium mb-2">Available Tools</p>
                        <div className="flex flex-wrap gap-1.5">
                          {tools.map((tool) => (
                            <Badge
                              key={tool}
                              variant="outline"
                              className="text-[10px] bg-secondary/50 border-border hover:border-emerald-500/30"
                            >
                              <Wrench className="w-2.5 h-2.5 mr-1 text-emerald-400" />
                              {tool}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Connection Health */}
                    <div>
                      <p className="text-xs text-muted-foreground font-medium mb-2">Connection Health</p>
                      <div className="grid grid-cols-2 gap-2">
                        <div className="p-2 rounded-md bg-secondary/50">
                          <p className="text-[10px] text-muted-foreground">Latency</p>
                          <p className="text-xs font-medium text-emerald-400">
                            {server.status === 'connected' ? `${Math.floor(Math.random() * 50 + 10)}ms` : 'N/A'}
                          </p>
                        </div>
                        <div className="p-2 rounded-md bg-secondary/50">
                          <p className="text-[10px] text-muted-foreground">Uptime</p>
                          <p className="text-xs font-medium text-emerald-400">
                            {server.status === 'connected' ? '99.9%' : 'N/A'}
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>

      {servers.length === 0 && (
        <div className="flex items-center justify-center py-12">
          <div className="text-center">
            <Plug className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
            <p className="text-sm text-muted-foreground">No MCP servers configured. Add one to get started!</p>
          </div>
        </div>
      )}
    </div>
  );
}

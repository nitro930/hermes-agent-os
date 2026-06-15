'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
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
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import {
  Plus,
  Trash2,
  Code2,
  Eye,
  Save,
  Globe,
  Play,
  RefreshCw,
  Monitor,
  Smartphone,
  Tablet,
  ExternalLink,
  Copy,
  Check,
  FileCode2,
  FileJson,
  FileType,
  Palette,
  Braces,
  Sparkles,
  Clock,
  User,
  X,
  Maximize2,
  Minimize2,
  Search,
  History,
  Terminal,
  Wifi,
  WifiOff,
  ChevronDown,
  ChevronRight,
  RotateCcw,
  Zap,
  LayoutGrid,
  AlertTriangle,
  Info,
  ZapOff,
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useAppStore } from '@/lib/store';

// ─── Types ───────────────────────────────────────────────────────────────────

interface Artifact {
  id: string;
  title: string;
  description: string | null;
  type: string;
  content: string;
  preview: string | null;
  status: string;
  agentId: string | null;
  agent?: { id: string; name: string; avatar: string | null } | null;
  taskId: string | null;
  tags: string | null;
  version: number;
  isPublic: boolean;
  createdAt: string;
  updatedAt: string;
}

interface ArtifactVersion {
  id: string;
  artifactId: string;
  version: number;
  content: string;
  title: string;
  type: string;
  changeNote: string | null;
  createdAt: string;
}

interface Agent {
  id: string;
  name: string;
  avatar: string | null;
  type: string;
}

interface ConsoleEntry {
  id: string;
  type: 'log' | 'warn' | 'error' | 'info';
  message: string;
  timestamp: Date;
}

type PreviewDevice = 'desktop' | 'tablet' | 'mobile';
type DevPanel = 'preview' | 'code' | 'split' | 'versions' | 'console';

// ─── Constants ───────────────────────────────────────────────────────────────

const typeIcons: Record<string, React.ElementType> = {
  html: FileCode2,
  react: FileCode2,
  code: Code2,
  markdown: FileType,
  json: FileJson,
  css: Palette,
  text: FileType,
};

const typeColors: Record<string, string> = {
  html: 'bg-orange-500/20 text-orange-400',
  react: 'bg-cyan-500/20 text-cyan-400',
  code: 'bg-emerald-500/20 text-emerald-400',
  markdown: 'bg-blue-500/20 text-blue-400',
  json: 'bg-yellow-500/20 text-yellow-400',
  css: 'bg-purple-500/20 text-purple-400',
  text: 'bg-slate-500/20 text-slate-400',
};

const statusColors: Record<string, string> = {
  draft: 'bg-slate-500/20 text-slate-400',
  building: 'bg-yellow-500/20 text-yellow-400',
  ready: 'bg-emerald-500/20 text-emerald-400',
  error: 'bg-red-500/20 text-red-400',
  deployed: 'bg-cyan-500/20 text-cyan-400',
};

const TEMPLATES: { name: string; type: string; description: string; content: string }[] = [
  {
    name: 'Landing Page',
    type: 'html',
    description: 'Modern landing page with hero, features, and CTA',
    content: `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Landing Page</title>
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; color: #1a1a2e; }
  .hero { min-height: 90vh; display: flex; align-items: center; justify-content: center; background: linear-gradient(135deg, #0f172a 0%, #1e293b 50%, #334155 100%); color: white; text-align: center; padding: 2rem; }
  .hero h1 { font-size: 3.5rem; font-weight: 800; margin-bottom: 1rem; background: linear-gradient(135deg, #10b981, #06b6d4); -webkit-background-clip: text; -webkit-text-fill-color: transparent; }
  .hero p { font-size: 1.25rem; opacity: 0.8; max-width: 600px; margin: 0 auto 2rem; }
  .btn { display: inline-block; padding: 0.875rem 2.5rem; background: #10b981; color: white; border-radius: 8px; text-decoration: none; font-weight: 600; font-size: 1.1rem; transition: background 0.2s; }
  .btn:hover { background: #059669; }
  .features { padding: 5rem 2rem; max-width: 1100px; margin: 0 auto; }
  .features h2 { text-align: center; font-size: 2rem; margin-bottom: 3rem; }
  .grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); gap: 2rem; }
  .card { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px; padding: 2rem; transition: transform 0.2s, box-shadow 0.2s; }
  .card:hover { transform: translateY(-4px); box-shadow: 0 12px 40px rgba(0,0,0,0.08); }
  .card h3 { font-size: 1.25rem; margin-bottom: 0.75rem; color: #0f172a; }
  .card p { color: #64748b; line-height: 1.6; }
  .icon { width: 48px; height: 48px; background: linear-gradient(135deg, #10b981, #06b6d4); border-radius: 10px; margin-bottom: 1rem; display: flex; align-items: center; justify-content: center; font-size: 1.5rem; }
</style>
</head>
<body>
<section class="hero">
  <div>
    <h1>Build Faster. Ship Smarter.</h1>
    <p>The next-generation platform that helps teams build, test, and deploy with confidence. Powered by AI.</p>
    <a href="#features" class="btn">Get Started</a>
  </div>
</section>
<section class="features" id="features">
  <h2>Why Teams Love It</h2>
  <div class="grid">
    <div class="card"><div class="icon">&#9889;</div><h3>Lightning Fast</h3><p>Deploy in seconds with our optimized build pipeline and global CDN infrastructure.</p></div>
    <div class="card"><div class="icon">&#129302;</div><h3>AI-Powered</h3><p>Intelligent agents that understand your codebase and automate repetitive tasks.</p></div>
    <div class="card"><div class="icon">&#128274;</div><h3>Secure by Default</h3><p>Enterprise-grade security with automatic vulnerability scanning and patching.</p></div>
  </div>
</section>
</body>
</html>`,
  },
  {
    name: 'Dashboard',
    type: 'html',
    description: 'Analytics dashboard with charts and stats',
    content: `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Dashboard</title>
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; background: #0f172a; color: #e2e8f0; padding: 2rem; }
  h1 { font-size: 1.5rem; margin-bottom: 1.5rem; }
  .stats { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 1rem; margin-bottom: 2rem; }
  .stat { background: #1e293b; border-radius: 12px; padding: 1.5rem; border: 1px solid #334155; }
  .stat .label { font-size: 0.75rem; color: #94a3b8; text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: 0.5rem; }
  .stat .value { font-size: 2rem; font-weight: 700; }
  .stat .change { font-size: 0.75rem; margin-top: 0.5rem; }
  .up { color: #10b981; }
  .down { color: #ef4444; }
  .chart { background: #1e293b; border-radius: 12px; padding: 1.5rem; border: 1px solid #334155; margin-bottom: 1rem; }
  .chart h3 { font-size: 0.875rem; margin-bottom: 1rem; color: #94a3b8; }
  .bar-chart { display: flex; align-items: flex-end; gap: 8px; height: 150px; }
  .bar { flex: 1; background: linear-gradient(180deg, #10b981, #06b6d4); border-radius: 4px 4px 0 0; min-width: 20px; transition: height 0.5s; }
  .chart-row { display: grid; grid-template-columns: 1fr 1fr; gap: 1rem; }
</style>
</head>
<body>
<h1>Dashboard Overview</h1>
<div class="stats">
  <div class="stat"><div class="label">Total Users</div><div class="value">12,847</div><div class="change up">+14.2% vs last month</div></div>
  <div class="stat"><div class="label">Revenue</div><div class="value">$84.2K</div><div class="change up">+8.7% vs last month</div></div>
  <div class="stat"><div class="label">Active Sessions</div><div class="value">3,429</div><div class="change down">-2.1% vs last hour</div></div>
  <div class="stat"><div class="label">Conversion Rate</div><div class="value">4.8%</div><div class="change up">+0.6% vs last week</div></div>
</div>
<div class="chart-row">
  <div class="chart"><h3>Weekly Traffic</h3><div class="bar-chart"><div class="bar" style="height:40%"></div><div class="bar" style="height:65%"></div><div class="bar" style="height:55%"></div><div class="bar" style="height:80%"></div><div class="bar" style="height:70%"></div><div class="bar" style="height:90%"></div><div class="bar" style="height:75%"></div></div></div>
  <div class="chart"><h3>Revenue Trend</h3><div class="bar-chart"><div class="bar" style="height:50%"></div><div class="bar" style="height:60%"></div><div class="bar" style="height:45%"></div><div class="bar" style="height:85%"></div><div class="bar" style="height:70%"></div><div class="bar" style="height:95%"></div><div class="bar" style="height:88%"></div></div></div>
</div>
</body>
</html>`,
  },
  {
    name: 'API Schema',
    type: 'json',
    description: 'REST API schema definition',
    content: `{
  "openapi": "3.0.0",
  "info": {
    "title": "Agent OS API",
    "version": "1.0.0",
    "description": "RESTful API for the Hermes Agent Operating System"
  },
  "paths": {
    "/api/agents": {
      "get": { "summary": "List all agents", "responses": { "200": { "description": "Success" } } },
      "post": { "summary": "Create a new agent", "responses": { "201": { "description": "Created" } } }
    },
    "/api/tasks": {
      "get": { "summary": "List all tasks", "responses": { "200": { "description": "Success" } } },
      "post": { "summary": "Create a new task", "responses": { "201": { "description": "Created" } } }
    }
  }
}`,
  },
  {
    name: 'Component CSS',
    type: 'css',
    description: 'Modern component library styles',
    content: `/* Component Library */
:root {
  --primary: #10b981;
  --primary-hover: #059669;
  --surface: #1e293b;
  --surface-hover: #334155;
  --text: #e2e8f0;
  --text-muted: #94a3b8;
  --border: #334155;
  --radius: 8px;
}

.btn {
  padding: 0.625rem 1.5rem;
  border-radius: var(--radius);
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s;
  border: none;
  font-size: 0.875rem;
}
.btn-primary { background: var(--primary); color: white; }
.btn-primary:hover { background: var(--primary-hover); transform: translateY(-1px); }
.btn-outline { background: transparent; border: 1px solid var(--border); color: var(--text); }
.btn-outline:hover { background: var(--surface-hover); }

.card {
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: 12px;
  padding: 1.5rem;
}

.input {
  width: 100%;
  padding: 0.625rem 0.875rem;
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: var(--radius);
  color: var(--text);
  font-size: 0.875rem;
}
.input:focus { outline: none; border-color: var(--primary); box-shadow: 0 0 0 3px rgba(16,185,129,0.15); }`,
  },
];

// ─── Component ───────────────────────────────────────────────────────────────

export function DevView() {
  const { toast } = useToast();
  const { selectedArtifactId, setSelectedArtifactId, devServerLive, setDevServerLive } = useAppStore();

  // Artifacts list
  const [artifacts, setArtifacts] = useState<Artifact[]>([]);
  const [selectedArtifact, setSelectedArtifact] = useState<Artifact | null>(null);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState('all');
  const [agents, setAgents] = useState<Agent[]>([]);

  // Editor state
  const [editMode, setEditMode] = useState(false);
  const [editContent, setEditContent] = useState({ title: '', content: '', type: 'html', description: '', tags: '' });
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);

  // Dev server state
  const [devPanel, setDevPanel] = useState<DevPanel>('split');
  const [previewDevice, setPreviewDevice] = useState<PreviewDevice>('desktop');
  const [previewKey, setPreviewKey] = useState(0);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [copied, setCopied] = useState(false);
  const [liveConnected, setLiveConnected] = useState(false);
  const [lastLiveUpdate, setLastLiveUpdate] = useState<Date | null>(null);

  // Version history
  const [versions, setVersions] = useState<ArtifactVersion[]>([]);
  const [versionsOpen, setVersionsOpen] = useState(false);
  const [diffVersion, setDiffVersion] = useState<ArtifactVersion | null>(null);

  // Console
  const [consoleEntries, setConsoleEntries] = useState<ConsoleEntry[]>([]);
  const [consoleOpen, setConsoleOpen] = useState(false);

  // Create artifact dialog
  const [createOpen, setCreateOpen] = useState(false);
  const [newArtifact, setNewArtifact] = useState({
    title: '',
    content: '',
    type: 'html',
    description: '',
    tags: '',
  });

  // Template gallery
  const [templateOpen, setTemplateOpen] = useState(false);

  // Build log
  const [buildLog, setBuildLog] = useState<string[]>([]);

  // Refs
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const eventSourceRef = useRef<EventSource | null>(null);
  const consoleEndRef = useRef<HTMLDivElement>(null);

  // ─── Data loading ─────────────────────────────────────────────────────────

  const loadArtifacts = useCallback(async () => {
    try {
      const params = new URLSearchParams();
      if (filterType && filterType !== 'all') params.set('type', filterType);
      const res = await fetch(`/api/artifacts?${params.toString()}`);
      if (res.ok) {
        const data = await res.json();
        if (searchQuery) {
          const q = searchQuery.toLowerCase();
          setArtifacts(data.filter((a: Artifact) =>
            a.title.toLowerCase().includes(q) ||
            (a.description || '').toLowerCase().includes(q) ||
            (a.tags || '').toLowerCase().includes(q)
          ));
        } else {
          setArtifacts(data);
        }
      }
    } catch (error) {
      console.error('Failed to load artifacts:', error);
    } finally {
      setLoading(false);
    }
  }, [filterType, searchQuery]);

  const loadAgents = useCallback(async () => {
    try {
      const res = await fetch('/api/agents');
      if (res.ok) setAgents(await res.json());
    } catch {
      // Ignore
    }
  }, []);

  const loadVersions = useCallback(async (artifactId: string) => {
    try {
      const res = await fetch(`/api/artifacts/versions?artifactId=${artifactId}`);
      if (res.ok) setVersions(await res.json());
    } catch {
      // Ignore
    }
  }, []);

  useEffect(() => {
    loadArtifacts();
    loadAgents();
  }, [loadArtifacts, loadAgents]);

  // ─── Artifact selection ────────────────────────────────────────────────────

  function selectArtifact(artifact: Artifact) {
    if (hasUnsavedChanges) {
      if (!window.confirm('You have unsaved changes. Discard them?')) return;
    }
    setSelectedArtifact(artifact);
    setSelectedArtifactId(artifact.id);
    setEditMode(false);
    setEditContent({
      title: artifact.title,
      content: artifact.content,
      type: artifact.type,
      description: artifact.description || '',
      tags: artifact.tags || '',
    });
    setHasUnsavedChanges(false);
    setPreviewKey(k => k + 1);
    setConsoleEntries([]);
    loadVersions(artifact.id);

    // Add build log entry
    addBuildLog(`Loaded "${artifact.title}" v${artifact.version} (${artifact.type})`);
  }

  // ─── Live reload via SSE ───────────────────────────────────────────────────

  useEffect(() => {
    if (!selectedArtifact || !devServerLive) {
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
        eventSourceRef.current = null;
        setLiveConnected(false);
      }
      return;
    }

    // Close existing connection
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
    }

    const es = new EventSource(`/api/artifacts/live?artifactId=${selectedArtifact.id}`);
    eventSourceRef.current = es;

    es.addEventListener('update', (e) => {
      try {
        const data = JSON.parse(e.data);
        setLastLiveUpdate(new Date());
        addBuildLog(`Live update: v${data.version} received`);

        // If we're not editing, update the selected artifact
        if (!editMode) {
          setSelectedArtifact(prev => prev ? { ...prev, ...data } : prev);
          setPreviewKey(k => k + 1);
        }
      } catch { /* ignore parse errors */ }
    });

    es.addEventListener('status', (e) => {
      try {
        const data = JSON.parse(e.data);
        addBuildLog(`Status changed: ${data.status}`);
        if (!editMode) {
          setSelectedArtifact(prev => prev ? { ...prev, status: data.status } : prev);
        }
      } catch { /* ignore */ }
    });

    es.addEventListener('delete', () => {
      addBuildLog('Artifact was deleted externally');
      toast({ title: 'Artifact deleted', description: 'The current artifact was deleted', variant: 'destructive' });
      setSelectedArtifact(null);
      setSelectedArtifactId(null);
    });

    es.onopen = () => {
      setLiveConnected(true);
      addBuildLog('Live reload connected');
    };

    es.onerror = () => {
      setLiveConnected(false);
      addBuildLog('Live reload disconnected (will retry)');
    };

    return () => {
      es.close();
      eventSourceRef.current = null;
      setLiveConnected(false);
    };
  }, [selectedArtifact?.id, devServerLive, editMode]);

  // ─── Console messages from iframe ─────────────────────────────────────────

  useEffect(() => {
    function handleMessage(event: MessageEvent) {
      if (event.data && typeof event.data === 'object' && event.data.__dev_console) {
        const entry: ConsoleEntry = {
          id: Date.now().toString() + Math.random(),
          type: event.data.level || 'log',
          message: event.data.message || '',
          timestamp: new Date(),
        };
        setConsoleEntries(prev => [...prev.slice(-99), entry]);

        if (entry.type === 'error') {
          setConsoleOpen(true);
        }
      }
    }
    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, []);

  // ─── CRUD operations ──────────────────────────────────────────────────────

  async function createArtifact() {
    try {
      const res = await fetch('/api/artifacts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...newArtifact,
          tags: newArtifact.tags || null,
        }),
      });
      if (res.ok) {
        const artifact = await res.json();
        toast({ title: 'Artifact created' });
        setCreateOpen(false);
        setNewArtifact({ title: '', content: '', type: 'html', description: '', tags: '' });
        loadArtifacts();
        selectArtifact(artifact);
        addBuildLog(`Created "${artifact.title}" (${artifact.type})`);
      }
    } catch {
      toast({ title: 'Failed to create artifact', variant: 'destructive' });
    }
  }

  async function updateArtifact() {
    if (!selectedArtifact) return;
    try {
      setBuildLog(prev => [...prev, `[Saving] ${editContent.title}...`]);
      const res = await fetch(`/api/artifacts/${selectedArtifact.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: editContent.title,
          content: editContent.content,
          type: editContent.type,
          description: editContent.description || null,
          tags: editContent.tags || null,
        }),
      });
      if (res.ok) {
        const updated = await res.json();
        toast({ title: 'Artifact saved', description: `Version ${updated.version}` });
        setHasUnsavedChanges(false);
        setSelectedArtifact(updated);
        setPreviewKey(k => k + 1);
        loadArtifacts();
        loadVersions(updated.id);
        addBuildLog(`Saved v${updated.version}`);
      }
    } catch {
      toast({ title: 'Failed to save artifact', variant: 'destructive' });
      addBuildLog('[Error] Failed to save');
    }
  }

  async function deleteArtifact(id: string) {
    try {
      const res = await fetch(`/api/artifacts/${id}`, { method: 'DELETE' });
      if (res.ok) {
        toast({ title: 'Artifact deleted' });
        if (selectedArtifact?.id === id) {
          setSelectedArtifact(null);
          setSelectedArtifactId(null);
          setEditMode(false);
        }
        loadArtifacts();
        addBuildLog('Artifact deleted');
      }
    } catch {
      toast({ title: 'Failed to delete artifact', variant: 'destructive' });
    }
  }

  async function deployArtifact() {
    if (!selectedArtifact) return;
    try {
      addBuildLog(`[Deploy] Deploying "${selectedArtifact.title}"...`);
      const res = await fetch(`/api/artifacts/${selectedArtifact.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'deployed', isPublic: true }),
      });
      if (res.ok) {
        const updated = await res.json();
        setSelectedArtifact(updated);
        toast({ title: 'Artifact deployed!', description: 'Now publicly accessible' });
        loadArtifacts();
        addBuildLog(`[Deploy] Deployed successfully at /api/artifacts/${selectedArtifact.id}/preview`);
      }
    } catch {
      toast({ title: 'Deploy failed', variant: 'destructive' });
      addBuildLog('[Deploy] Failed');
    }
  }

  async function restoreVersion(targetVersion: number) {
    if (!selectedArtifact) return;
    if (!window.confirm(`Restore to version ${targetVersion}? Current changes will be saved as a snapshot first.`)) return;
    try {
      addBuildLog(`[Restore] Restoring to v${targetVersion}...`);
      const res = await fetch('/api/artifacts/versions/restore', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ artifactId: selectedArtifact.id, version: targetVersion }),
      });
      if (res.ok) {
        const updated = await res.json();
        toast({ title: `Restored to v${targetVersion}` });
        setSelectedArtifact(updated);
        setEditContent({
          title: updated.title,
          content: updated.content,
          type: updated.type,
          description: updated.description || '',
          tags: updated.tags || '',
        });
        setPreviewKey(k => k + 1);
        loadArtifacts();
        loadVersions(updated.id);
        addBuildLog(`[Restore] Now at v${updated.version}`);
      }
    } catch {
      toast({ title: 'Restore failed', variant: 'destructive' });
    }
  }

  // ─── Utility functions ────────────────────────────────────────────────────

  function copyContent() {
    if (!selectedArtifact) return;
    navigator.clipboard.writeText(editMode ? editContent.content : selectedArtifact.content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
    toast({ title: 'Copied to clipboard' });
  }

  function openPreviewInNewTab() {
    if (!selectedArtifact) return;
    window.open(`/api/artifacts/${selectedArtifact.id}/preview`, '_blank');
  }

  function addBuildLog(message: string) {
    const ts = new Date().toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' });
    setBuildLog(prev => [...prev.slice(-49), `[${ts}] ${message}`]);
  }

  async function generateArtifact() {
    try {
      addBuildLog('[AI] Generating content...');
      const res = await fetch('/api/artifacts/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          description: editContent.description || editContent.title || 'A simple landing page',
          type: editContent.type,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        setEditContent({ ...editContent, content: data.content });
        setHasUnsavedChanges(true);
        addBuildLog('[AI] Content generated — review and save');
        toast({ title: 'AI generated content', description: 'Review and save when ready' });
      } else {
        addBuildLog('[AI] Generation failed');
        toast({ title: 'AI generation failed', variant: 'destructive' });
      }
    } catch {
      addBuildLog('[AI] Generation error');
      toast({ title: 'AI generation failed', variant: 'destructive' });
    }
  }

  function useTemplate(template: typeof TEMPLATES[0]) {
    setNewArtifact({
      title: template.name,
      content: template.content,
      type: template.type,
      description: template.description,
      tags: template.type,
    });
    setTemplateOpen(false);
    setCreateOpen(true);
  }

  // Ctrl+S to save
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key === 's') {
        e.preventDefault();
        if (hasUnsavedChanges && selectedArtifact) updateArtifact();
      }
    }
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  });

  // Auto-scroll console
  useEffect(() => {
    consoleEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [consoleEntries]);

  // ─── Preview widths ───────────────────────────────────────────────────────

  const previewWidths: Record<PreviewDevice, string> = {
    desktop: '100%',
    tablet: '768px',
    mobile: '375px',
  };

  // ─── Loading state ────────────────────────────────────────────────────────

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" />
          <span className="text-sm text-muted-foreground">Loading Dev Server...</span>
        </div>
      </div>
    );
  }

  // ─── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="space-y-0 h-[calc(100vh-6rem)] flex flex-col">
      {/* ─── Header ─── */}
      <div className="flex items-center justify-between pb-4">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <Globe className="w-6 h-6 text-emerald-400" />
            <h1 className="text-2xl font-bold">Dev Server</h1>
          </div>
          <div className="flex items-center gap-2 ml-4">
            {/* Live status indicator */}
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-secondary text-xs cursor-pointer"
                    onClick={() => setDevServerLive(!devServerLive)}>
                    {devServerLive ? (
                      <>
                        <Wifi className={`w-3 h-3 ${liveConnected ? 'text-emerald-400' : 'text-yellow-400'}`} />
                        <span className={liveConnected ? 'text-emerald-400' : 'text-yellow-400'}>
                          {liveConnected ? 'Live' : 'Connecting...'}
                        </span>
                        {lastLiveUpdate && (
                          <span className="text-muted-foreground">
                            {lastLiveUpdate.toLocaleTimeString()}
                          </span>
                        )}
                      </>
                    ) : (
                      <>
                        <WifiOff className="w-3 h-3 text-muted-foreground" />
                        <span className="text-muted-foreground">Offline</span>
                      </>
                    )}
                  </div>
                </TooltipTrigger>
                <TooltipContent>
                  {devServerLive ? 'Click to pause live reload' : 'Click to enable live reload'}
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            className="border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/10"
            onClick={() => setTemplateOpen(true)}
          >
            <LayoutGrid className="w-3.5 h-3.5 mr-1.5" />
            Templates
          </Button>
          <Dialog open={createOpen} onOpenChange={setCreateOpen}>
            <DialogTrigger asChild>
              <Button className="bg-emerald-600 hover:bg-emerald-700 text-white" size="sm">
                <Plus className="w-4 h-4 mr-1.5" />
                New Artifact
              </Button>
            </DialogTrigger>
            <DialogContent className="bg-card border-border max-w-2xl">
              <DialogHeader>
                <DialogTitle>Create Artifact</DialogTitle>
                <DialogDescription>Build a new artifact for the dev server</DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Title</Label>
                    <Input
                      value={newArtifact.title}
                      onChange={(e) => setNewArtifact({ ...newArtifact, title: e.target.value })}
                      placeholder="My Component..."
                      className="bg-secondary border-border"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Type</Label>
                    <Select value={newArtifact.type} onValueChange={(v) => setNewArtifact({ ...newArtifact, type: v })}>
                      <SelectTrigger className="bg-secondary border-border">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="bg-card border-border">
                        <SelectItem value="html">HTML</SelectItem>
                        <SelectItem value="react">React/JSX</SelectItem>
                        <SelectItem value="code">Code</SelectItem>
                        <SelectItem value="css">CSS</SelectItem>
                        <SelectItem value="json">JSON</SelectItem>
                        <SelectItem value="markdown">Markdown</SelectItem>
                        <SelectItem value="text">Text</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Description</Label>
                  <Input
                    value={newArtifact.description}
                    onChange={(e) => setNewArtifact({ ...newArtifact, description: e.target.value })}
                    placeholder="What does this artifact do?"
                    className="bg-secondary border-border"
                  />
                </div>
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label>Content</Label>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-xs text-emerald-400 hover:text-emerald-300"
                      onClick={generateArtifact}
                      type="button"
                    >
                      <Sparkles className="w-3 h-3 mr-1" /> AI Generate
                    </Button>
                  </div>
                  <Textarea
                    value={newArtifact.content}
                    onChange={(e) => setNewArtifact({ ...newArtifact, content: e.target.value })}
                    placeholder="Write your code here... or use AI Generate"
                    className="bg-secondary border-border font-mono text-sm min-h-48"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Tags</Label>
                  <Input
                    value={newArtifact.tags}
                    onChange={(e) => setNewArtifact({ ...newArtifact, tags: e.target.value })}
                    placeholder="landing, dashboard, component"
                    className="bg-secondary border-border"
                  />
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setCreateOpen(false)}>Cancel</Button>
                <Button
                  className="bg-emerald-600 hover:bg-emerald-700 text-white"
                  onClick={createArtifact}
                  disabled={!newArtifact.title || !newArtifact.content}
                >
                  Create & Preview
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* ─── Main content ─── */}
      <div className="flex gap-3 flex-1 min-h-0">
        {/* ─── Artifact Sidebar ─── */}
        <Card className="w-64 shrink-0 bg-card border-border flex flex-col">
          <CardHeader className="p-3 pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-xs font-semibold text-muted-foreground">
                Artifacts ({artifacts.length})
              </CardTitle>
              <Select value={filterType} onValueChange={setFilterType}>
                <SelectTrigger className="bg-secondary border-border text-[10px] h-6 w-20">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-card border-border">
                  <SelectItem value="all">All</SelectItem>
                  <SelectItem value="html">HTML</SelectItem>
                  <SelectItem value="react">React</SelectItem>
                  <SelectItem value="code">Code</SelectItem>
                  <SelectItem value="css">CSS</SelectItem>
                  <SelectItem value="json">JSON</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardHeader>
          <div className="px-3 pb-2">
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
              <Input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search artifacts..."
                className="bg-secondary border-border pl-8 text-xs h-8"
              />
            </div>
          </div>
          <ScrollArea className="flex-1">
            <div className="p-2 space-y-1">
              {artifacts.map((artifact) => {
                const Icon = typeIcons[artifact.type] || FileType;
                const isActive = selectedArtifact?.id === artifact.id;
                return (
                  <div
                    key={artifact.id}
                    className={`p-2.5 rounded-lg cursor-pointer transition-colors ${
                      isActive
                        ? 'bg-emerald-500/15 border border-emerald-500/30'
                        : 'hover:bg-accent border border-transparent'
                    }`}
                    onClick={() => selectArtifact(artifact)}
                  >
                    <div className="flex items-start gap-2">
                      <Icon className={`w-4 h-4 shrink-0 mt-0.5 ${isActive ? 'text-emerald-400' : 'text-muted-foreground'}`} />
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-medium truncate">{artifact.title}</p>
                        <div className="flex items-center gap-1.5 mt-1">
                          <Badge variant="outline" className={`text-[9px] ${typeColors[artifact.type] || ''}`}>
                            {artifact.type}
                          </Badge>
                          <Badge variant="outline" className={`text-[9px] ${statusColors[artifact.status] || ''}`}>
                            {artifact.status}
                          </Badge>
                        </div>
                        {artifact.agent && (
                          <p className="text-[9px] text-muted-foreground mt-1">
                            by {artifact.agent.avatar || '🤖'} {artifact.agent.name}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
              {artifacts.length === 0 && (
                <div className="text-center py-8">
                  <FileCode2 className="w-8 h-8 text-muted-foreground/40 mx-auto mb-2" />
                  <p className="text-xs text-muted-foreground">No artifacts yet</p>
                  <p className="text-[10px] text-muted-foreground/60 mt-1">Create one or have an agent build something</p>
                </div>
              )}
            </div>
          </ScrollArea>
        </Card>

        {/* ─── Main Editor + Preview Area ─── */}
        <Card className="flex-1 bg-card border-border flex flex-col overflow-hidden">
          {selectedArtifact ? (
            <>
              {/* ─── Toolbar ─── */}
              <div className="flex items-center justify-between p-2.5 border-b border-border">
                <div className="flex items-center gap-2">
                  {(() => { const Icon = typeIcons[selectedArtifact.type] || FileType; return <Icon className="w-4 h-4 text-emerald-400" />; })()}
                  {editMode ? (
                    <Input
                      value={editContent.title}
                      onChange={(e) => { setEditContent({ ...editContent, title: e.target.value }); setHasUnsavedChanges(true); }}
                      className="bg-secondary border-border text-sm h-7 max-w-64"
                    />
                  ) : (
                    <span className="text-sm font-medium">{selectedArtifact.title}</span>
                  )}
                  <Badge variant="outline" className={`text-[9px] ${typeColors[selectedArtifact.type] || ''}`}>
                    {selectedArtifact.type}
                  </Badge>
                  <Badge variant="outline" className={`text-[9px] ${statusColors[selectedArtifact.status] || ''}`}>
                    {selectedArtifact.status}
                  </Badge>
                  {hasUnsavedChanges && (
                    <Badge variant="outline" className="text-[9px] border-orange-500/30 text-orange-400">
                      Unsaved
                    </Badge>
                  )}
                  <span className="text-[9px] text-muted-foreground">v{selectedArtifact.version}</span>
                </div>
                <div className="flex items-center gap-1">
                  <Button variant="ghost" size="icon" className="w-7 h-7" onClick={copyContent} title="Copy code">
                    {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                  </Button>
                  <Button variant="ghost" size="icon" className="w-7 h-7" onClick={openPreviewInNewTab} title="Open in new tab">
                    <ExternalLink className="w-3.5 h-3.5" />
                  </Button>
                  {!editMode ? (
                    <Button variant="ghost" size="sm" className="text-xs h-7" onClick={() => setEditMode(true)}>
                      <Code2 className="w-3.5 h-3.5 mr-1" /> Edit
                    </Button>
                  ) : (
                    <>
                      <Button variant="ghost" size="sm" className="text-xs h-7 text-emerald-400" onClick={updateArtifact} disabled={!hasUnsavedChanges}>
                        <Save className="w-3.5 h-3.5 mr-1" /> Save
                      </Button>
                      <Button variant="ghost" size="sm" className="text-xs h-7" onClick={() => {
                        setEditMode(false);
                        setEditContent({
                          title: selectedArtifact.title,
                          content: selectedArtifact.content,
                          type: selectedArtifact.type,
                          description: selectedArtifact.description || '',
                          tags: selectedArtifact.tags || '',
                        });
                        setHasUnsavedChanges(false);
                      }}>
                        <X className="w-3.5 h-3.5 mr-1" /> Cancel
                      </Button>
                    </>
                  )}
                  <Button variant="ghost" size="icon" className="w-7 h-7" onClick={() => setIsFullscreen(!isFullscreen)} title={isFullscreen ? 'Exit fullscreen' : 'Fullscreen preview'}>
                    {isFullscreen ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
                  </Button>
                  {selectedArtifact.status !== 'deployed' && (
                    <Button variant="ghost" size="sm" className="text-xs h-7 text-cyan-400" onClick={deployArtifact}>
                      <Globe className="w-3.5 h-3.5 mr-1" /> Deploy
                    </Button>
                  )}
                  <Button variant="ghost" size="icon" className="w-7 h-7 text-red-400" onClick={() => deleteArtifact(selectedArtifact.id)}>
                    <Trash2 className="w-3.5 h-3.5" />
                  </Button>
                </div>
              </div>

              {/* ─── Panel Tabs ─── */}
              <div className="flex items-center justify-between px-3 py-1 border-b border-border bg-secondary/20">
                <div className="flex items-center gap-1">
                  {[
                    { key: 'split', icon: Braces, label: 'Split' },
                    { key: 'preview', icon: Eye, label: 'Preview' },
                    { key: 'code', icon: Code2, label: 'Code' },
                    { key: 'versions', icon: History, label: 'History' },
                    { key: 'console', icon: Terminal, label: 'Console' },
                  ].map(({ key, icon: Icon, label }) => (
                    <Button
                      key={key}
                      variant="ghost"
                      size="sm"
                      className={`text-[10px] h-6 px-2 ${devPanel === key ? 'bg-secondary text-emerald-400' : 'text-muted-foreground'}`}
                      onClick={() => setDevPanel(key as DevPanel)}
                    >
                      <Icon className="w-3 h-3 mr-1" />
                      {label}
                      {key === 'console' && consoleEntries.length > 0 && (
                        <Badge variant="outline" className="ml-1 text-[8px] h-3.5 px-1">
                          {consoleEntries.filter(e => e.type === 'error').length || consoleEntries.length}
                        </Badge>
                      )}
                      {key === 'versions' && versions.length > 0 && (
                        <Badge variant="outline" className="ml-1 text-[8px] h-3.5 px-1">
                          {versions.length}
                        </Badge>
                      )}
                    </Button>
                  ))}
                </div>
                <div className="flex items-center gap-1">
                  {/* Device toggle */}
                  {(devPanel === 'preview' || devPanel === 'split') && (
                    <>
                      <Button variant="ghost" size="icon" className={`w-5 h-5 ${previewDevice === 'desktop' ? 'text-emerald-400' : 'text-muted-foreground'}`} onClick={() => setPreviewDevice('desktop')}>
                        <Monitor className="w-3 h-3" />
                      </Button>
                      <Button variant="ghost" size="icon" className={`w-5 h-5 ${previewDevice === 'tablet' ? 'text-emerald-400' : 'text-muted-foreground'}`} onClick={() => setPreviewDevice('tablet')}>
                        <Tablet className="w-3 h-3" />
                      </Button>
                      <Button variant="ghost" size="icon" className={`w-5 h-5 ${previewDevice === 'mobile' ? 'text-emerald-400' : 'text-muted-foreground'}`} onClick={() => setPreviewDevice('mobile')}>
                        <Smartphone className="w-3 h-3" />
                      </Button>
                      <Button variant="ghost" size="icon" className="w-5 h-5 text-muted-foreground" onClick={() => setPreviewKey(k => k + 1)} title="Refresh preview">
                        <RefreshCw className="w-3 h-3" />
                      </Button>
                    </>
                  )}
                </div>
              </div>

              {/* ─── Panel Content ─── */}
              <div className="flex-1 flex min-h-0 overflow-hidden">
                {/* Split mode: Code + Preview side by side */}
                {devPanel === 'split' && (
                  <>
                    {/* Code editor side */}
                    <div className={`${isFullscreen ? 'w-0' : 'w-1/2'} flex flex-col border-r border-border overflow-hidden`}>
                      <div className="flex items-center gap-1 px-3 py-1 border-b border-border bg-secondary/30">
                        <Code2 className="w-3 h-3 text-muted-foreground" />
                        <span className="text-[10px] text-muted-foreground">Source</span>
                        <span className="ml-auto text-[9px] text-muted-foreground">
                          {editMode ? editContent.content.length : selectedArtifact.content.length} chars
                        </span>
                        {editMode && (
                          <Button variant="ghost" size="sm" className="text-[10px] h-5 text-emerald-400 hover:text-emerald-300 ml-1" onClick={generateArtifact}>
                            <Sparkles className="w-3 h-3 mr-1" /> AI
                          </Button>
                        )}
                      </div>
                      {editMode ? (
                        <Textarea
                          value={editContent.content}
                          onChange={(e) => { setEditContent({ ...editContent, content: e.target.value }); setHasUnsavedChanges(true); }}
                          className="flex-1 bg-transparent border-0 font-mono text-xs resize-none focus-visible:ring-0 p-4 rounded-none leading-relaxed"
                          placeholder="Write your code here..."
                        />
                      ) : (
                        <ScrollArea className="flex-1">
                          <pre className="p-4 text-xs font-mono leading-relaxed text-foreground/80 overflow-x-auto">
                            <code>{selectedArtifact.content}</code>
                          </pre>
                        </ScrollArea>
                      )}
                    </div>

                    {/* Live Preview side */}
                    <div className={`${isFullscreen ? 'flex-1' : 'w-1/2'} flex flex-col overflow-hidden`}>
                      <div className="flex items-center justify-between px-3 py-1 border-b border-border bg-secondary/30">
                        <div className="flex items-center gap-1.5">
                          <Eye className="w-3 h-3 text-muted-foreground" />
                          <span className="text-[10px] text-muted-foreground">Preview</span>
                          {liveConnected && devServerLive && (
                            <span className="flex items-center gap-1 text-[9px] text-emerald-400">
                              <span className="w-1.5 h-1.5 bg-emerald-400 rounded-full animate-pulse" />
                              Live
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="flex-1 flex items-start justify-center bg-secondary/20 p-4 overflow-auto">
                        <div
                          className="bg-white rounded-lg shadow-lg overflow-hidden transition-all duration-300"
                          style={{
                            width: previewWidths[previewDevice],
                            maxWidth: '100%',
                            height: previewDevice === 'desktop' ? '100%' : previewDevice === 'tablet' ? '1024px' : '812px',
                            minHeight: '300px',
                          }}
                        >
                          <iframe
                            ref={iframeRef}
                            key={previewKey}
                            src={`/api/artifacts/${selectedArtifact.id}/preview`}
                            className="w-full h-full border-0"
                            sandbox="allow-scripts allow-same-origin"
                            title="Preview"
                          />
                        </div>
                      </div>
                    </div>
                  </>
                )}

                {/* Preview only */}
                {devPanel === 'preview' && (
                  <div className="flex-1 flex flex-col overflow-hidden">
                    <div className="flex-1 flex items-start justify-center bg-secondary/20 p-4 overflow-auto">
                      <div
                        className="bg-white rounded-lg shadow-lg overflow-hidden transition-all duration-300"
                        style={{
                          width: previewWidths[previewDevice],
                          maxWidth: '100%',
                          height: previewDevice === 'desktop' ? '100%' : previewDevice === 'tablet' ? '1024px' : '812px',
                          minHeight: '300px',
                        }}
                      >
                        <iframe
                          key={previewKey}
                          src={`/api/artifacts/${selectedArtifact.id}/preview`}
                          className="w-full h-full border-0"
                          sandbox="allow-scripts allow-same-origin"
                          title="Preview"
                        />
                      </div>
                    </div>
                  </div>
                )}

                {/* Code only */}
                {devPanel === 'code' && (
                  <div className="flex-1 flex flex-col overflow-hidden">
                    <div className="flex items-center gap-2 px-3 py-1 border-b border-border bg-secondary/20">
                      {editMode && (
                        <>
                          <Select value={editContent.type} onValueChange={(v) => { setEditContent({ ...editContent, type: v }); setHasUnsavedChanges(true); }}>
                            <SelectTrigger className="bg-secondary border-border text-[10px] h-5 w-20">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent className="bg-card border-border">
                              <SelectItem value="html">HTML</SelectItem>
                              <SelectItem value="react">React/JSX</SelectItem>
                              <SelectItem value="code">Code</SelectItem>
                              <SelectItem value="css">CSS</SelectItem>
                              <SelectItem value="json">JSON</SelectItem>
                              <SelectItem value="markdown">Markdown</SelectItem>
                              <SelectItem value="text">Text</SelectItem>
                            </SelectContent>
                          </Select>
                          <Button variant="ghost" size="sm" className="text-[10px] h-5 text-emerald-400 hover:text-emerald-300 ml-auto" onClick={generateArtifact}>
                            <Sparkles className="w-3 h-3 mr-1" /> AI Generate
                          </Button>
                        </>
                      )}
                      {!editMode && (
                        <Button variant="ghost" size="sm" className="text-[10px] h-5 ml-auto" onClick={() => setEditMode(true)}>
                          <Code2 className="w-3 h-3 mr-1" /> Edit
                        </Button>
                      )}
                    </div>
                    {editMode ? (
                      <Textarea
                        value={editContent.content}
                        onChange={(e) => { setEditContent({ ...editContent, content: e.target.value }); setHasUnsavedChanges(true); }}
                        className="flex-1 bg-transparent border-0 font-mono text-xs resize-none focus-visible:ring-0 p-4 rounded-none leading-relaxed"
                        placeholder="Write your code here..."
                      />
                    ) : (
                      <ScrollArea className="flex-1">
                        <pre className="p-4 text-xs font-mono leading-relaxed text-foreground/80 overflow-x-auto">
                          <code>{selectedArtifact.content}</code>
                        </pre>
                      </ScrollArea>
                    )}
                  </div>
                )}

                {/* Version History */}
                {devPanel === 'versions' && (
                  <div className="flex-1 flex flex-col overflow-hidden">
                    <div className="flex items-center justify-between px-4 py-2 border-b border-border bg-secondary/20">
                      <span className="text-xs font-medium">Version History</span>
                      <Button variant="ghost" size="sm" className="text-[10px] h-6" onClick={() => loadVersions(selectedArtifact.id)}>
                        <RefreshCw className="w-3 h-3 mr-1" /> Refresh
                      </Button>
                    </div>
                    <ScrollArea className="flex-1">
                      <div className="p-3 space-y-2">
                        {/* Current version */}
                        <div className="p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/20">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <Badge className="bg-emerald-500/20 text-emerald-400 text-[9px]">Current</Badge>
                              <span className="text-xs font-medium">v{selectedArtifact.version}</span>
                            </div>
                            <span className="text-[9px] text-muted-foreground">
                              {new Date(selectedArtifact.updatedAt).toLocaleString()}
                            </span>
                          </div>
                          <p className="text-[10px] text-muted-foreground mt-1 truncate">{selectedArtifact.title}</p>
                        </div>

                        {/* Past versions */}
                        {versions.length === 0 && (
                          <div className="text-center py-8">
                            <History className="w-8 h-8 text-muted-foreground/40 mx-auto mb-2" />
                            <p className="text-xs text-muted-foreground">No version history yet</p>
                            <p className="text-[10px] text-muted-foreground/60 mt-1">Versions are saved automatically when content changes</p>
                          </div>
                        )}
                        {versions
                          .filter(v => v.version !== selectedArtifact.version)
                          .map((v) => (
                            <div
                              key={v.id}
                              className={`p-3 rounded-lg border transition-colors cursor-pointer ${
                                diffVersion?.id === v.id
                                  ? 'bg-blue-500/10 border-blue-500/30'
                                  : 'bg-secondary/30 border-border hover:bg-accent'
                              }`}
                              onClick={() => setDiffVersion(diffVersion?.id === v.id ? null : v)}
                            >
                              <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                  <span className="text-xs font-medium">v{v.version}</span>
                                  {v.changeNote && (
                                    <Badge variant="outline" className="text-[8px]">{v.changeNote}</Badge>
                                  )}
                                </div>
                                <div className="flex items-center gap-1.5">
                                  <span className="text-[9px] text-muted-foreground">
                                    {new Date(v.createdAt).toLocaleString()}
                                  </span>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    className="text-[9px] h-5 text-emerald-400 hover:text-emerald-300"
                                    onClick={(e) => { e.stopPropagation(); restoreVersion(v.version); }}
                                  >
                                    <RotateCcw className="w-2.5 h-2.5 mr-0.5" /> Restore
                                  </Button>
                                </div>
                              </div>

                              {/* Diff preview */}
                              {diffVersion?.id === v.id && (
                                <div className="mt-2 p-2 bg-background rounded text-[10px] font-mono leading-relaxed max-h-40 overflow-auto">
                                  <pre className="text-muted-foreground whitespace-pre-wrap">
                                    {v.content.slice(0, 500)}{v.content.length > 500 ? '\n...(truncated)' : ''}
                                  </pre>
                                </div>
                              )}
                            </div>
                          ))}
                      </div>
                    </ScrollArea>
                  </div>
                )}

                {/* Console */}
                {devPanel === 'console' && (
                  <div className="flex-1 flex flex-col overflow-hidden">
                    <div className="flex items-center justify-between px-4 py-2 border-b border-border bg-secondary/20">
                      <div className="flex items-center gap-2">
                        <Terminal className="w-3 h-3 text-muted-foreground" />
                        <span className="text-xs font-medium">Console</span>
                        {consoleEntries.filter(e => e.type === 'error').length > 0 && (
                          <Badge variant="outline" className="text-[8px] border-red-500/30 text-red-400">
                            {consoleEntries.filter(e => e.type === 'error').length} errors
                          </Badge>
                        )}
                      </div>
                      <Button variant="ghost" size="sm" className="text-[10px] h-6" onClick={() => setConsoleEntries([])}>
                        Clear
                      </Button>
                    </div>
                    <ScrollArea className="flex-1 bg-[#1a1b26]">
                      <div className="p-2 space-y-0.5 font-mono text-xs">
                        {consoleEntries.length === 0 && (
                          <div className="text-center py-12">
                            <Terminal className="w-8 h-8 text-muted-foreground/20 mx-auto mb-2" />
                            <p className="text-muted-foreground/40 text-[10px]">Console output will appear here</p>
                            <p className="text-muted-foreground/30 text-[9px] mt-1">
                              Use console.log/warn/error in iframe scripts to see output
                            </p>
                          </div>
                        )}
                        {consoleEntries.map((entry) => (
                          <div
                            key={entry.id}
                            className={`flex items-start gap-2 px-2 py-1 rounded ${
                              entry.type === 'error' ? 'bg-red-500/10 text-red-400' :
                              entry.type === 'warn' ? 'bg-yellow-500/10 text-yellow-400' :
                              entry.type === 'info' ? 'bg-blue-500/10 text-blue-400' :
                              'text-green-400/80'
                            }`}
                          >
                            {entry.type === 'error' ? <AlertTriangle className="w-3 h-3 shrink-0 mt-0.5" /> :
                             entry.type === 'warn' ? <AlertTriangle className="w-3 h-3 shrink-0 mt-0.5" /> :
                             entry.type === 'info' ? <Info className="w-3 h-3 shrink-0 mt-0.5" /> :
                             <ChevronRight className="w-3 h-3 shrink-0 mt-0.5" />}
                            <span className="flex-1 break-all">{entry.message}</span>
                            <span className="text-[8px] opacity-50 shrink-0">{entry.timestamp.toLocaleTimeString()}</span>
                          </div>
                        ))}
                        <div ref={consoleEndRef} />
                      </div>
                    </ScrollArea>
                  </div>
                )}
              </div>

              {/* ─── Footer: Build log + metadata ─── */}
              <div className="border-t border-border">
                {/* Collapsible build log */}
                <div className="px-3 py-1">
                  <button
                    className="flex items-center gap-1.5 text-[10px] text-muted-foreground hover:text-foreground w-full"
                    onClick={() => setConsoleOpen(!consoleOpen)}
                  >
                    {consoleOpen ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
                    <Terminal className="w-3 h-3" />
                    Build Log
                    {buildLog.length > 0 && (
                      <Badge variant="outline" className="text-[8px] h-3.5 px-1 ml-1">{buildLog.length}</Badge>
                    )}
                  </button>
                </div>
                {consoleOpen && (
                  <div className="px-3 pb-1 max-h-24 overflow-auto">
                    <div className="font-mono text-[10px] text-muted-foreground space-y-0.5">
                      {buildLog.map((log, i) => (
                        <div key={i} className={log.includes('[Error]') || log.includes('Failed') ? 'text-red-400' : log.includes('[AI]') ? 'text-purple-400' : log.includes('[Deploy]') ? 'text-cyan-400' : log.includes('[Restore]') ? 'text-yellow-400' : ''}>
                          {log}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                {/* Metadata bar */}
                <div className="px-3 py-1.5 border-t border-border flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    {selectedArtifact.tags && selectedArtifact.tags.split(',').map((tag) => (
                      <Badge key={tag} variant="outline" className="text-[10px]">
                        {tag.trim()}
                      </Badge>
                    ))}
                  </div>
                  <div className="flex items-center gap-3 text-[10px] text-muted-foreground">
                    {selectedArtifact.agent && (
                      <div className="flex items-center gap-1">
                        <User className="w-3 h-3" />
                        {selectedArtifact.agent.avatar || '🤖'} {selectedArtifact.agent.name}
                      </div>
                    )}
                    <div className="flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      {new Date(selectedArtifact.updatedAt).toLocaleString()}
                    </div>
                    <div className="flex items-center gap-1">
                      <Braces className="w-3 h-3" />
                      v{selectedArtifact.version}
                    </div>
                    <div className="flex items-center gap-1">
                      {liveConnected && devServerLive ? (
                        <><Zap className="w-3 h-3 text-emerald-400" /> <span className="text-emerald-400">Live</span></>
                      ) : (
                        <><ZapOff className="w-3 h-3" /> <span>Static</span></>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </>
          ) : (
            /* ─── Empty State ─── */
            <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
              <Globe className="w-16 h-16 mb-4 text-emerald-500/30" />
              <h3 className="text-lg font-medium mb-2">Dev Server</h3>
              <p className="text-sm mb-1">Select an artifact to preview, or create a new one</p>
              <p className="text-xs text-muted-foreground/60 max-w-md text-center mt-2">
                Agents can create artifacts (HTML pages, React components, APIs) that render live here.
                The dev server provides hot reload, version history, and a full development workflow.
              </p>
              <div className="flex items-center gap-3 mt-6">
                <Button className="bg-emerald-600 hover:bg-emerald-700 text-white" onClick={() => setCreateOpen(true)}>
                  <Plus className="w-4 h-4 mr-1.5" />
                  New Artifact
                </Button>
                <Button variant="outline" className="border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/10" onClick={() => setTemplateOpen(true)}>
                  <LayoutGrid className="w-4 h-4 mr-1.5" />
                  Templates
                </Button>
                <Button variant="outline" className="border-purple-500/30 text-purple-400 hover:bg-purple-500/10" onClick={() => {
                  setCreateOpen(true);
                  setNewArtifact({ title: '', content: '', type: 'html', description: '', tags: '' });
                }}>
                  <Sparkles className="w-4 h-4 mr-1.5" />
                  AI Generate
                </Button>
              </div>

              {/* Quick stats */}
              <div className="flex items-center gap-6 mt-8">
                <div className="text-center">
                  <p className="text-2xl font-bold text-foreground">{artifacts.length}</p>
                  <p className="text-[10px] text-muted-foreground">Artifacts</p>
                </div>
                <div className="text-center">
                  <p className="text-2xl font-bold text-emerald-400">{artifacts.filter(a => a.status === 'deployed').length}</p>
                  <p className="text-[10px] text-muted-foreground">Deployed</p>
                </div>
                <div className="text-center">
                  <p className="text-2xl font-bold text-cyan-400">{artifacts.filter(a => a.type === 'html' || a.type === 'react').length}</p>
                  <p className="text-[10px] text-muted-foreground">Components</p>
                </div>
              </div>
            </div>
          )}
        </Card>
      </div>

      {/* ─── Template Gallery Dialog ─── */}
      <Dialog open={templateOpen} onOpenChange={setTemplateOpen}>
        <DialogContent className="bg-card border-border max-w-3xl">
          <DialogHeader>
            <DialogTitle>Template Gallery</DialogTitle>
            <DialogDescription>Start from a pre-built template and customize it</DialogDescription>
          </DialogHeader>
          <div className="grid grid-cols-2 gap-3 max-h-[60vh] overflow-auto">
            {TEMPLATES.map((template) => {
              const Icon = typeIcons[template.type] || FileType;
              return (
                <div
                  key={template.name}
                  className="p-4 rounded-lg border border-border hover:border-emerald-500/30 hover:bg-emerald-500/5 cursor-pointer transition-all"
                  onClick={() => useTemplate(template)}
                >
                  <div className="flex items-center gap-2 mb-2">
                    <Icon className="w-4 h-4 text-emerald-400" />
                    <span className="text-sm font-medium">{template.name}</span>
                    <Badge variant="outline" className={`text-[9px] ml-auto ${typeColors[template.type]}`}>
                      {template.type}
                    </Badge>
                  </div>
                  <p className="text-xs text-muted-foreground">{template.description}</p>
                </div>
              );
            })}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

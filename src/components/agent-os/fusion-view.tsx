'use client';

import { useEffect, useState, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
  DialogDescription,
} from '@/components/ui/dialog';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import {
  Sparkles,
  Trash2,
  RefreshCw,
  Plus,
  X,
  Key,
  Loader2,
  CheckCircle2,
  XCircle,
  Clock,
  Coins,
  Zap,
  ListChecks,
  AlertTriangle,
  Lightbulb,
  EyeOff,
  Users,
  Download,
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { RECOMMENDED_MODELS, FUSION_PRESETS } from '@/lib/openrouter-constants';

interface PanelResponse {
  id: string;
  modelSlug: string;
  response: string;
  tokensUsed: number | null;
  latencyMs: number | null;
}

interface FusionRun {
  id: string;
  prompt: string;
  status: string;
  preset: string | null;
  analysisModels: string | null;
  judgeModel: string | null;
  finalModel: string | null;
  finalAnswer: string | null;
  judgeAnalysis: string | null;
  totalTokens: number | null;
  totalCost: number | null;
  latencyMs: number | null;
  errorMessage: string | null;
  agentId: string | null;
  agent?: { id: string; name: string } | null;
  panelResponses: PanelResponse[];
  createdAt: string;
}

function parseAnalysis(raw: string | null): any | null {
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

function parseModels(raw: string | null): string[] {
  if (!raw) return [];
  try {
    return JSON.parse(raw);
  } catch {
    return [];
  }
}

export function FusionView() {
  const { toast } = useToast();

  // Composer state
  const [prompt, setPrompt] = useState('');
  const [usePreset, setUsePreset] = useState(true);
  const [preset, setPreset] = useState<string>('general-high');
  const [panelModels, setPanelModels] = useState<string[]>([
    '~anthropic/claude-opus-latest',
    '~openai/gpt-latest',
    '~google/gemini-pro-latest',
  ]);
  const [judgeModel, setJudgeModel] = useState<string>('~openai/gpt-latest');
  const [finalModel, setFinalModel] = useState<string>('openrouter/fusion');
  const [maxToolCalls, setMaxToolCalls] = useState<number>(8);
  const [running, setRunning] = useState(false);

  // Runs list
  const [runs, setRuns] = useState<FusionRun[]>([]);
  const [selectedRunId, setSelectedRunId] = useState<string | null>(null);
  const [loadingRuns, setLoadingRuns] = useState(false);

  // Settings
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [apiKeyInput, setApiKeyInput] = useState('');
  const [apiKeyMasked, setApiKeyMasked] = useState<string | null>(null);
  const [verifying, setVerifying] = useState(false);
  const [configured, setConfigured] = useState(false);

  const loadRuns = useCallback(async () => {
    setLoadingRuns(true);
    try {
      const res = await fetch('/api/fusion/run?limit=50');
      const data = await res.json();
      if (res.ok) {
        setRuns(data.runs);
      }
    } finally {
      setLoadingRuns(false);
    }
  }, []);

  const loadSettings = useCallback(async () => {
    const res = await fetch('/api/settings/openrouter');
    const data = await res.json();
    if (res.ok) {
      setConfigured(data.configured);
      setApiKeyMasked(data.masked);
    }
  }, []);

  useEffect(() => {
    loadRuns();
    loadSettings();
  }, [loadRuns, loadSettings]);

  const selectedRun = runs.find((r) => r.id === selectedRunId) || null;

  async function handleRun() {
    if (!prompt.trim()) {
      toast({ title: 'Enter a prompt first', variant: 'destructive' });
      return;
    }
    if (!configured) {
      toast({ title: 'OpenRouter API key not set', description: 'Open Settings to add it.', variant: 'destructive' });
      setSettingsOpen(true);
      return;
    }

    setRunning(true);
    try {
      const body: any = {
        prompt,
        finalModel,
        maxToolCalls,
      };
      if (usePreset) {
        body.preset = preset;
      } else {
        body.analysisModels = panelModels;
        body.judgeModel = judgeModel;
      }

      const res = await fetch('/api/fusion/run', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed');
      }
      toast({ title: 'Fusion complete', description: `${data.run.totalTokens ?? 0} tokens · ${data.run.latencyMs ?? 0}ms` });
      setPrompt('');
      await loadRuns();
      setSelectedRunId(data.run.id);
    } catch (e: any) {
      toast({ title: 'Fusion failed', description: e.message, variant: 'destructive' });
      await loadRuns();
    } finally {
      setRunning(false);
    }
  }

  async function handleSaveKey() {
    if (!apiKeyInput.trim()) {
      toast({ title: 'Paste an API key first', variant: 'destructive' });
      return;
    }
    setVerifying(true);
    try {
      const res = await fetch('/api/settings/openrouter', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ apiKey: apiKeyInput.trim(), verify: true }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed');
      }
      toast({ title: 'API key saved', description: 'Verified with OpenRouter.' });
      setApiKeyInput('');
      await loadSettings();
      setSettingsOpen(false);
    } catch (e: any) {
      toast({ title: 'Verification failed', description: e.message, variant: 'destructive' });
    } finally {
      setVerifying(false);
    }
  }

  async function handleDeleteKey() {
    await fetch('/api/settings/openrouter', { method: 'DELETE' });
    await loadSettings();
    toast({ title: 'API key removed' });
  }

  async function handleDeleteRun(id: string) {
    await fetch(`/api/fusion/runs/${id}`, { method: 'DELETE' });
    if (selectedRunId === id) setSelectedRunId(null);
    await loadRuns();
  }

  function togglePanelModel(slug: string) {
    setPanelModels((cur) =>
      cur.includes(slug) ? cur.filter((m) => m !== slug) : cur.length >= 8 ? cur : [...cur, slug],
    );
  }

  return (
    <div className="flex h-full">
      {/* Main column */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-border">
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center w-9 h-9 rounded-lg bg-fuchsia-500/15 text-fuchsia-400">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-lg font-semibold">Fusion</h1>
              <p className="text-xs text-muted-foreground">Multi-model deliberation via OpenRouter</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant={configured ? 'default' : 'destructive'} className="text-xs">
              {configured ? `Key: ${apiKeyMasked}` : 'No API key'}
            </Badge>
            <Dialog open={settingsOpen} onOpenChange={setSettingsOpen}>
              <DialogTrigger asChild>
                <Button variant="outline" size="sm">
                  <Key className="w-3.5 h-3.5 mr-1.5" /> Settings
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>OpenRouter API Key</DialogTitle>
                  <DialogDescription>
                    Stored locally in your Hermes DB. Get a key at{' '}
                    <a href="https://openrouter.ai/keys" target="_blank" rel="noreferrer" className="underline">
                      openrouter.ai/keys
                    </a>
                    .
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-3 py-2">
                  {configured && (
                    <div className="flex items-center justify-between rounded-md border border-emerald-500/30 bg-emerald-500/10 px-3 py-2">
                      <span className="text-xs text-emerald-400">Current key: {apiKeyMasked}</span>
                      <Button variant="ghost" size="sm" onClick={handleDeleteKey}>
                        Remove
                      </Button>
                    </div>
                  )}
                  <Label htmlFor="apiKey">New API key</Label>
                  <Input
                    id="apiKey"
                    type="password"
                    placeholder="sk-or-v1-..."
                    value={apiKeyInput}
                    onChange={(e) => setApiKeyInput(e.target.value)}
                  />
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setSettingsOpen(false)}>
                    Cancel
                  </Button>
                  <Button onClick={handleSaveKey} disabled={verifying}>
                    {verifying ? <Loader2 className="w-4 h-4 mr-1.5 animate-spin" /> : null}
                    Save & Verify
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        </div>

        {/* Composer */}
        <div className="p-6 border-b border-border space-y-4">
          <div>
            <Label htmlFor="prompt">Prompt</Label>
            <Textarea
              id="prompt"
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder="Ask something that benefits from multiple model perspectives — research, critique, multi-angle analysis."
              rows={4}
              className="resize-none mt-1.5"
            />
          </div>

          <div className="flex items-center gap-6">
            <div className="flex items-center gap-2">
              <Switch checked={usePreset} onCheckedChange={setUsePreset} id="usePreset" />
              <Label htmlFor="usePreset" className="cursor-pointer">
                Use preset
              </Label>
            </div>
            {usePreset ? (
              <div className="flex-1">
                <Select value={preset} onValueChange={setPreset}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select preset" />
                  </SelectTrigger>
                  <SelectContent>
                    {FUSION_PRESETS.map((p) => (
                      <SelectItem key={p.slug} value={p.slug}>
                        <div className="flex flex-col">
                          <span>{p.label}</span>
                          <span className="text-[10px] text-muted-foreground">{p.description}</span>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            ) : (
              <div className="flex-1 grid grid-cols-2 gap-3">
                <div>
                  <Label className="text-xs">Judge model</Label>
                  <Select value={judgeModel} onValueChange={setJudgeModel}>
                    <SelectTrigger className="mt-1">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {RECOMMENDED_MODELS.map((m) => (
                        <SelectItem key={m.slug} value={m.slug}>
                          {m.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="text-xs">Max tool calls (1-16)</Label>
                  <Input
                    type="number"
                    min={1}
                    max={16}
                    value={maxToolCalls}
                    onChange={(e) => setMaxToolCalls(Number(e.target.value) || 8)}
                    className="mt-1"
                  />
                </div>
              </div>
            )}
          </div>

          {!usePreset && (
            <div>
              <Label className="text-xs">
                Panel models ({panelModels.length}/8)
              </Label>
              <div className="mt-1.5 flex flex-wrap gap-1.5">
                {RECOMMENDED_MODELS.map((m) => {
                  const active = panelModels.includes(m.slug);
                  const disabled = !active && panelModels.length >= 8;
                  return (
                    <button
                      key={m.slug}
                      type="button"
                      disabled={disabled}
                      onClick={() => togglePanelModel(m.slug)}
                      className={`px-2 py-1 rounded-md text-[11px] border transition-colors ${
                        active
                          ? 'bg-fuchsia-500/20 text-fuchsia-300 border-fuchsia-500/40'
                          : 'bg-transparent text-muted-foreground border-border hover:border-fuchsia-500/40'
                      } ${disabled ? 'opacity-40 cursor-not-allowed' : ''}`}
                    >
                      {m.label}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Label className="text-xs">Final-answer model</Label>
              <Select value={finalModel} onValueChange={setFinalModel}>
                <SelectTrigger className="h-7 w-[280px] text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="openrouter/fusion">openrouter/fusion (alias)</SelectItem>
                  {RECOMMENDED_MODELS.map((m) => (
                    <SelectItem key={m.slug} value={m.slug}>
                      {m.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <Button onClick={handleRun} disabled={running || !prompt.trim()}>
              {running ? <Loader2 className="w-4 h-4 mr-1.5 animate-spin" /> : <Sparkles className="w-4 h-4 mr-1.5" />}
              {running ? 'Deliberating...' : 'Run Fusion'}
            </Button>
          </div>
        </div>

        {/* Result viewer */}
        <div className="flex-1 overflow-hidden">
          {selectedRun ? (
            <RunDetail run={selectedRun} onClose={() => setSelectedRunId(null)} onDelete={handleDeleteRun} />
          ) : (
            <div className="flex items-center justify-center h-full text-sm text-muted-foreground">
              <div className="text-center">
                <Sparkles className="w-8 h-8 mx-auto mb-2 opacity-40" />
                <p>Run a Fusion query to see results here.</p>
                <p className="text-xs mt-1">A panel of models answers in parallel, a judge produces structured analysis, and a final model writes the answer.</p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* History sidebar */}
      <div className="w-72 border-l border-border flex flex-col">
        <div className="flex items-center justify-between px-4 py-3 border-b border-border">
          <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">History</span>
          <Button variant="ghost" size="sm" onClick={loadRuns} disabled={loadingRuns}>
            <RefreshCw className={`w-3.5 h-3.5 ${loadingRuns ? 'animate-spin' : ''}`} />
          </Button>
        </div>
        <ScrollArea className="flex-1">
          <div className="p-2 space-y-1">
            {runs.length === 0 && !loadingRuns && (
              <p className="text-xs text-muted-foreground text-center py-6">No runs yet.</p>
            )}
            {runs.map((run) => {
              const analysis = parseAnalysis(run.judgeAnalysis);
              return (
                <button
                  key={run.id}
                  onClick={() => setSelectedRunId(run.id)}
                  className={`w-full text-left p-2.5 rounded-md border transition-colors ${
                    selectedRunId === run.id
                      ? 'bg-fuchsia-500/10 border-fuchsia-500/40'
                      : 'border-transparent hover:bg-accent'
                  }`}
                >
                  <div className="flex items-center gap-1.5 mb-1">
                    {run.status === 'success' ? (
                      <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                    ) : run.status === 'failed' ? (
                      <XCircle className="w-3 h-3 text-red-400" />
                    ) : (
                      <Loader2 className="w-3 h-3 text-yellow-400 animate-spin" />
                    )}
                    <span className="text-[10px] text-muted-foreground">
                      {new Date(run.createdAt).toLocaleString(undefined, { hour: '2-digit', minute: '2-digit', month: 'short', day: 'numeric' })}
                    </span>
                  </div>
                  <p className="text-xs line-clamp-2 leading-tight">{run.prompt}</p>
                  <div className="flex items-center gap-2 mt-1.5">
                    {run.preset && <Badge variant="secondary" className="text-[9px] h-4">{run.preset}</Badge>}
                    {analysis && (
                      <Badge variant="outline" className="text-[9px] h-4">
                        {analysis.consensus?.length || 0}+{analysis.contradictions?.length || 0}
                      </Badge>
                    )}
                    {run.totalTokens && (
                      <span className="text-[9px] text-muted-foreground flex items-center gap-0.5">
                        <Coins className="w-2.5 h-2.5" /> {run.totalTokens}
                      </span>
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        </ScrollArea>
      </div>
    </div>
  );
}

function RunDetail({ run, onClose, onDelete }: { run: FusionRun; onClose: () => void; onDelete: (id: string) => void }) {
  const analysis = parseAnalysis(run.judgeAnalysis);
  const panelModels = parseModels(run.analysisModels);

  return (
    <ScrollArea className="h-full">
      <div className="p-6 max-w-5xl mx-auto space-y-5">
        {/* Header */}
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              {run.status === 'success' ? (
                <Badge variant="default" className="bg-emerald-500/20 text-emerald-300 border-emerald-500/40">
                  <CheckCircle2 className="w-3 h-3 mr-1" /> Success
                </Badge>
              ) : run.status === 'failed' ? (
                <Badge variant="destructive">
                  <XCircle className="w-3 h-3 mr-1" /> Failed
                </Badge>
              ) : (
                <Badge variant="secondary">
                  <Loader2 className="w-3 h-3 mr-1 animate-spin" /> {run.status}
                </Badge>
              )}
              {run.preset && <Badge variant="outline">{run.preset}</Badge>}
              {run.latencyMs != null && (
                <Badge variant="outline" className="text-xs">
                  <Clock className="w-3 h-3 mr-1" /> {(run.latencyMs / 1000).toFixed(1)}s
                </Badge>
              )}
              {run.totalTokens != null && (
                <Badge variant="outline" className="text-xs">
                  <Coins className="w-3 h-3 mr-1" /> {run.totalTokens} tok
                </Badge>
              )}
              {run.totalCost != null && (
                <Badge variant="outline" className="text-xs">
                  <Zap className="w-3 h-3 mr-1" /> ${run.totalCost.toFixed(4)}
                </Badge>
              )}
            </div>
            <p className="text-sm font-medium">{run.prompt}</p>
            {run.errorMessage && (
              <p className="text-xs text-red-400 mt-2">{run.errorMessage}</p>
            )}
          </div>
          <div className="flex items-center gap-1">
            <Button variant="ghost" size="sm" asChild title="Export as Markdown">
              <a href={`/api/fusion/runs/${run.id}/export?format=markdown`} download>
                <Download className="w-4 h-4" />
              </a>
            </Button>
            <Button variant="ghost" size="sm" asChild title="Export as JSON">
              <a href={`/api/fusion/runs/${run.id}/export?format=json`} download>
                <span className="text-[10px] font-mono">JSON</span>
              </a>
            </Button>
            <Button variant="ghost" size="sm" onClick={onClose}>
              <X className="w-4 h-4" />
            </Button>
            <Button variant="ghost" size="sm" onClick={() => onDelete(run.id)}>
              <Trash2 className="w-4 h-4 text-red-400" />
            </Button>
          </div>
        </div>

        <Separator />

        {/* Final answer */}
        {run.finalAnswer && (
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-fuchsia-400" /> Final Answer
                <span className="text-xs font-normal text-muted-foreground">
                  · {run.finalModel || 'openrouter/fusion'}
                </span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="prose prose-sm prose-invert max-w-none whitespace-pre-wrap text-sm leading-relaxed">
                {run.finalAnswer}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Judge analysis */}
        {analysis && (
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-1.5">
                <ListChecks className="w-3.5 h-3.5 text-blue-400" /> Judge Analysis
                {run.judgeModel && (
                  <span className="text-xs font-normal text-muted-foreground">· {run.judgeModel}</span>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <AnalysisSection
                icon={<ListChecks className="w-3 h-3" />}
                title="Consensus"
                items={analysis.consensus}
                color="emerald"
              />
              <AnalysisSection
                icon={<AlertTriangle className="w-3 h-3" />}
                title="Contradictions"
                items={analysis.contradictions}
                color="red"
              />
              <AnalysisSection
                icon={<ListChecks className="w-3 h-3" />}
                title="Partial coverage"
                items={analysis.partial_coverage}
                color="yellow"
              />
              <AnalysisSection
                icon={<Lightbulb className="w-3 h-3" />}
                title="Unique insights"
                items={analysis.unique_insights}
                color="blue"
              />
              <AnalysisSection
                icon={<EyeOff className="w-3 h-3" />}
                title="Blind spots"
                items={analysis.blind_spots}
                color="slate"
              />
            </CardContent>
          </Card>
        )}

        {/* Panel responses */}
        {run.panelResponses.length > 0 && (
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-1.5">
                <Users className="w-3.5 h-3.5 text-purple-400" /> Panel Responses
                <span className="text-xs font-normal text-muted-foreground">
                  · {run.panelResponses.length} models
                </span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Tabs defaultValue={run.panelResponses[0]?.id}>
                <TabsList className="flex flex-wrap h-auto">
                  {run.panelResponses.map((p) => (
                    <TabsTrigger key={p.id} value={p.id} className="text-xs">
                      {p.modelSlug.replace('~', '')}
                    </TabsTrigger>
                  ))}
                </TabsList>
                {run.panelResponses.map((p) => (
                  <TabsContent key={p.id} value={p.id} className="mt-3">
                    <div className="flex items-center gap-2 mb-2 text-[10px] text-muted-foreground">
                      <Badge variant="outline" className="text-[10px]">{p.modelSlug}</Badge>
                      {p.tokensUsed != null && <span>{p.tokensUsed} tok</span>}
                      {p.latencyMs != null && <span>{(p.latencyMs / 1000).toFixed(1)}s</span>}
                    </div>
                    <div className="prose prose-sm prose-invert max-w-none whitespace-pre-wrap text-sm leading-relaxed">
                      {p.response}
                    </div>
                  </TabsContent>
                ))}
              </Tabs>
            </CardContent>
          </Card>
        )}

        {/* When no panel data is exposed by OpenRouter (common case), show info */}
        {!analysis && run.panelResponses.length === 0 && run.status === 'success' && (
          <Card>
            <CardContent className="py-6 text-center text-xs text-muted-foreground">
              <p>
                OpenRouter does not always surface the panel/judge details in the public response — only the
                final answer is shown. The full deliberation happens server-side on OpenRouter.
              </p>
            </CardContent>
          </Card>
        )}
      </div>
    </ScrollArea>
  );
}

function AnalysisSection({
  icon,
  title,
  items,
  color,
}: {
  icon: React.ReactNode;
  title: string;
  items: string[] | undefined;
  color: 'emerald' | 'red' | 'yellow' | 'blue' | 'slate';
}) {
  if (!items || items.length === 0) return null;
  const colors: Record<string, string> = {
    emerald: 'text-emerald-400',
    red: 'text-red-400',
    yellow: 'text-yellow-400',
    blue: 'text-blue-400',
    slate: 'text-slate-400',
  };
  return (
    <div>
      <div className={`flex items-center gap-1.5 text-xs font-medium ${colors[color]} mb-1.5`}>
        {icon}
        {title} <span className="text-muted-foreground font-normal">({items.length})</span>
      </div>
      <ul className="space-y-1 ml-5">
        {items.map((item, i) => (
          <li key={i} className="text-xs leading-relaxed list-disc">
            {item}
          </li>
        ))}
      </ul>
    </div>
  );
}

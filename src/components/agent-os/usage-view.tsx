'use client';

import { useEffect, useState, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Coins, Sparkles, Clock, TrendingUp, RefreshCw, Users, Zap,
} from 'lucide-react';
import {
  AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, Tooltip, ResponsiveContainer, Legend,
} from 'recharts';

interface FusionStats {
  totalRuns: number;
  successfulRuns: number;
  failedRuns: number;
  todayRuns: number;
  weekRuns: number;
  totalTokens: number;
  weekCost: number;
  todayCost: number;
  avgLatencyMs: number;
  successRate: number;
  presetBreakdown: { preset: string; runs: number; cost: number; tokens: number }[];
  spendTrend: { day: string; cost: number; tokens: number; runs: number }[];
  topAgents: { agentId: string | null; agentName: string; runs: number; cost: number; tokens: number }[];
  lastRun: { id: string; status: string; prompt: string; createdAt: string; tokens: number | null; cost: number | null } | null;
}

const CHART_COLORS = ['#d946ef', '#10b981', '#6366f1', '#f59e0b', '#ec4899', '#8b5cf6', '#06b6d4', '#ef4444'];

function CustomTooltip({ active, payload, label }: { active?: boolean; payload?: Array<{ name: string; value: number; color: string }>; label?: string }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-card border border-border rounded-lg px-3 py-2 shadow-lg">
      {label && <p className="text-xs text-muted-foreground mb-1">{label}</p>}
      {payload.map((p, i) => (
        <p key={i} className="text-xs font-medium" style={{ color: p.color }}>
          {p.name}: {typeof p.value === 'number' ? p.value.toFixed(p.value < 1 ? 4 : 0) : p.value}
        </p>
      ))}
    </div>
  );
}

export function UsageView() {
  const [stats, setStats] = useState<FusionStats | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/stats/fusion');
      if (res.ok) setStats(await res.json());
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="w-8 h-8 border-2 border-fuchsia-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!stats || stats.totalRuns === 0) {
    return (
      <div className="flex items-center justify-center h-full text-sm text-muted-foreground">
        <div className="text-center">
          <Sparkles className="w-8 h-8 mx-auto mb-2 opacity-40" />
          <p>No Fusion usage yet.</p>
          <p className="text-xs mt-1">Run a Fusion query to see cost & token analytics here.</p>
        </div>
      </div>
    );
  }

  const presetData = stats.presetBreakdown.map((p, i) => ({
    name: p.preset,
    value: p.cost,
    runs: p.runs,
    tokens: p.tokens,
    color: CHART_COLORS[i % CHART_COLORS.length],
  }));

  const agentData = stats.topAgents.map((a, i) => ({
    name: a.agentName.length > 16 ? a.agentName.slice(0, 16) + '...' : a.agentName,
    runs: a.runs,
    cost: a.cost,
    tokens: a.tokens,
    color: CHART_COLORS[i % CHART_COLORS.length],
  }));

  const totalCost = stats.spendTrend.reduce((sum, d) => sum + d.cost, 0);
  const totalTokensFromTrend = stats.spendTrend.reduce((sum, d) => sum + d.tokens, 0);

  return (
    <ScrollArea className="h-full">
      <div className="p-6 space-y-6 max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center w-9 h-9 rounded-lg bg-amber-500/15 text-amber-400">
              <Coins className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-lg font-semibold">Usage & Billing</h1>
              <p className="text-xs text-muted-foreground">Fusion cost & token analytics via OpenRouter</p>
            </div>
          </div>
          <Button variant="outline" size="sm" onClick={load}>
            <RefreshCw className="w-3.5 h-3.5 mr-1.5" /> Refresh
          </Button>
        </div>

        {/* Top KPI cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <Card className="bg-card border-border">
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs text-muted-foreground">Total Spend</span>
                <Coins className="w-3.5 h-3.5 text-amber-400" />
              </div>
              <p className="text-xl font-bold">${(totalCost || 0).toFixed(4)}</p>
              <p className="text-[10px] text-muted-foreground mt-1">${(stats.todayCost || 0).toFixed(4)} today</p>
            </CardContent>
          </Card>
          <Card className="bg-card border-border">
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs text-muted-foreground">Total Runs</span>
                <Sparkles className="w-3.5 h-3.5 text-fuchsia-400" />
              </div>
              <p className="text-xl font-bold">{stats.totalRuns}</p>
              <p className="text-[10px] text-muted-foreground mt-1">{stats.todayRuns} today · {stats.weekRuns} this week</p>
            </CardContent>
          </Card>
          <Card className="bg-card border-border">
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs text-muted-foreground">Total Tokens</span>
                <Zap className="w-3.5 h-3.5 text-yellow-400" />
              </div>
              <p className="text-xl font-bold">{stats.totalTokens.toLocaleString()}</p>
              <p className="text-[10px] text-muted-foreground mt-1">{totalTokensFromTrend.toLocaleString()} in last 14d</p>
            </CardContent>
          </Card>
          <Card className="bg-card border-border">
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs text-muted-foreground">Avg Latency</span>
                <Clock className="w-3.5 h-3.5 text-blue-400" />
              </div>
              <p className="text-xl font-bold">{(stats.avgLatencyMs / 1000).toFixed(1)}s</p>
              <p className="text-[10px] text-muted-foreground mt-1">{stats.successRate.toFixed(1)}% success rate</p>
            </CardContent>
          </Card>
        </div>

        {/* Spend trend */}
        <Card className="bg-card border-border">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-emerald-400" /> Spend & Tokens (14 days)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={280}>
              <AreaChart data={stats.spendTrend}>
                <defs>
                  <linearGradient id="costG" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#d946ef" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#d946ef" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="tokG" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <XAxis dataKey="day" tick={{ fontSize: 10, fill: '#64748b' }} axisLine={false} tickLine={false} tickFormatter={(d) => d.slice(5)} />
                <YAxis yAxisId="left" tick={{ fontSize: 10, fill: '#64748b' }} axisLine={false} tickLine={false} />
                <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 10, fill: '#64748b' }} axisLine={false} tickLine={false} />
                <Tooltip content={<CustomTooltip />} />
                <Legend wrapperStyle={{ fontSize: 11 }} />
                <Area yAxisId="left" type="monotone" dataKey="cost" name="Cost ($)" stroke="#d946ef" fill="url(#costG)" strokeWidth={2} />
                <Area yAxisId="right" type="monotone" dataKey="tokens" name="Tokens" stroke="#10b981" fill="url(#tokG)" strokeWidth={2} />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Preset + Agent breakdown */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <Card className="bg-card border-border">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">Cost by Preset</CardTitle>
            </CardHeader>
            <CardContent>
              {presetData.length === 0 ? (
                <p className="text-xs text-muted-foreground text-center py-8">No preset data yet.</p>
              ) : (
                <ResponsiveContainer width="100%" height={240}>
                  <PieChart>
                    <Pie data={presetData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80} label={(e) => `${e.name}: $${(e.value || 0).toFixed(4)}`}>
                      {presetData.map((d, i) => <Cell key={i} fill={d.color} />)}
                    </Pie>
                    <Tooltip content={<CustomTooltip />} />
                  </PieChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>

          <Card className="bg-card border-border">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-2">
                <Users className="w-4 h-4 text-blue-400" /> Top Agents by Usage
              </CardTitle>
            </CardHeader>
            <CardContent>
              {agentData.length === 0 ? (
                <p className="text-xs text-muted-foreground text-center py-8">No agent usage yet.</p>
              ) : (
                <ResponsiveContainer width="100%" height={240}>
                  <BarChart data={agentData} layout="vertical" margin={{ left: 20 }}>
                    <XAxis type="number" tick={{ fontSize: 10, fill: '#64748b' }} axisLine={false} tickLine={false} />
                    <YAxis type="category" dataKey="name" tick={{ fontSize: 10, fill: '#64748b' }} axisLine={false} tickLine={false} width={100} />
                    <Tooltip content={<CustomTooltip />} />
                    <Bar dataKey="runs" name="Runs" radius={[0, 4, 4, 0]}>
                      {agentData.map((d, i) => <Cell key={i} fill={d.color} />)}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Per-day breakdown table */}
        <Card className="bg-card border-border">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Daily Breakdown</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-border text-muted-foreground">
                    <th className="text-left py-2 px-2">Date</th>
                    <th className="text-right py-2 px-2">Runs</th>
                    <th className="text-right py-2 px-2">Tokens</th>
                    <th className="text-right py-2 px-2">Cost</th>
                    <th className="text-right py-2 px-2">Avg / run</th>
                  </tr>
                </thead>
                <tbody>
                  {[...stats.spendTrend].reverse().map((d) => (
                    <tr key={d.day} className="border-b border-border/50">
                      <td className="py-2 px-2 font-mono">{d.day}</td>
                      <td className="text-right py-2 px-2">{d.runs}</td>
                      <td className="text-right py-2 px-2">{d.tokens.toLocaleString()}</td>
                      <td className="text-right py-2 px-2 text-amber-400">${d.cost.toFixed(4)}</td>
                      <td className="text-right py-2 px-2 text-muted-foreground">
                        {d.runs > 0 ? `$${(d.cost / d.runs).toFixed(4)}` : '—'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      </div>
    </ScrollArea>
  );
}

import { db } from '@/lib/db';
import { NextResponse } from 'next/server';

export async function GET() {
  try {
    const now = Date.now();
    const dayMs = 24 * 60 * 60 * 1000;
    const weekAgo = new Date(now - 7 * dayMs);
    const todayStart = new Date(now - dayMs);

    const [
      totalRuns,
      successfulRuns,
      failedRuns,
      todayRuns,
      weekRuns,
      totalTokens,
      weekCost,
      todayCost,
      avgLatency,
      presetBreakdown,
      lastRun,
    ] = await Promise.all([
      db.fusionRun.count(),
      db.fusionRun.count({ where: { status: 'success' } }),
      db.fusionRun.count({ where: { status: 'failed' } }),
      db.fusionRun.count({ where: { createdAt: { gte: todayStart } } }),
      db.fusionRun.count({ where: { createdAt: { gte: weekAgo } } }),
      db.fusionRun.aggregate({ _sum: { totalTokens: true } }),
      db.fusionRun.aggregate({ where: { createdAt: { gte: weekAgo } }, _sum: { totalCost: true } }),
      db.fusionRun.aggregate({ where: { createdAt: { gte: todayStart } }, _sum: { totalCost: true } }),
      db.fusionRun.aggregate({ where: { status: 'success', latencyMs: { not: null } }, _avg: { latencyMs: true } }),
      db.fusionRun.groupBy({ by: ['preset'], _count: true, _sum: { totalCost: true, totalTokens: true } }),
      db.fusionRun.findFirst({ orderBy: { createdAt: 'desc' }, include: { agent: true } }),
    ]);

    const fourteenDaysAgo = new Date(now - 14 * dayMs);
    const recentRuns = await db.fusionRun.findMany({
      where: { createdAt: { gte: fourteenDaysAgo }, status: 'success' },
      select: { createdAt: true, totalCost: true, totalTokens: true },
    });

    const spendByDay: Record<string, { cost: number; tokens: number; runs: number }> = {};
    for (const r of recentRuns) {
      const day = r.createdAt.toISOString().slice(0, 10);
      if (!spendByDay[day]) spendByDay[day] = { cost: 0, tokens: 0, runs: 0 };
      spendByDay[day].cost += r.totalCost || 0;
      spendByDay[day].tokens += r.totalTokens || 0;
      spendByDay[day].runs += 1;
    }
    const spendTrend = Object.entries(spendByDay)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([day, v]) => ({ day, ...v }));

    const topAgentsRaw = await db.fusionRun.groupBy({
      by: ['agentId'],
      _count: true,
      _sum: { totalCost: true, totalTokens: true },
      orderBy: { _count: { agentId: 'desc' } },
      take: 5,
    });
    const agentIds = topAgentsRaw.filter((a) => a.agentId).map((a) => a.agentId!) as string[];
    const agents = agentIds.length
      ? await db.agent.findMany({ where: { id: { in: agentIds } }, select: { id: true, name: true } })
      : [];
    const agentMap = new Map(agents.map((a) => [a.id, a.name]));
    const topAgents = topAgentsRaw
      .filter((a) => a.agentId)
      .map((a) => ({
        agentId: a.agentId,
        agentName: agentMap.get(a.agentId!) || 'Unknown',
        runs: a._count,
        cost: a._sum.totalCost || 0,
        tokens: a._sum.totalTokens || 0,
      }));

    return NextResponse.json({
      totalRuns,
      successfulRuns,
      failedRuns,
      todayRuns,
      weekRuns,
      totalTokens: totalTokens._sum.totalTokens || 0,
      weekCost: weekCost._sum.totalCost || 0,
      todayCost: todayCost._sum.totalCost || 0,
      avgLatencyMs: avgLatency._avg.latencyMs || 0,
      successRate: totalRuns > 0 ? (successfulRuns / totalRuns) * 100 : 0,
      presetBreakdown: presetBreakdown.map((p) => ({
        preset: p.preset || 'custom',
        runs: p._count,
        cost: p._sum.totalCost || 0,
        tokens: p._sum.totalTokens || 0,
      })),
      spendTrend,
      topAgents,
      lastRun: lastRun
        ? {
            id: lastRun.id,
            status: lastRun.status,
            prompt: lastRun.prompt.slice(0, 100),
            createdAt: lastRun.createdAt,
            tokens: lastRun.totalTokens,
            cost: lastRun.totalCost,
          }
        : null,
    });
  } catch (error: any) {
    console.error('Failed to fetch Fusion stats:', error);
    return NextResponse.json({ error: error?.message || 'Failed' }, { status: 500 });
  }
}

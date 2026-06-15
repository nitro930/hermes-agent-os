import { db } from '@/lib/db';
import { NextRequest, NextResponse } from 'next/server';
import { logger } from '@/lib/logger';

const searchLogger = logger.withContext('api:search');

export const dynamic = 'force-dynamic';

/**
 * Global search endpoint — searches across all entity types.
 * Query params: q (search term), limit (max results per type, default 5)
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const query = searchParams.get('q')?.trim();
    const limit = Math.min(parseInt(searchParams.get('limit') || '5', 10), 20);

    if (!query || query.length < 1) {
      return NextResponse.json({ results: {}, total: 0 });
    }

    const searchTerm = `%${query}%`;
    const results: Record<string, unknown[]> = {};
    let total = 0;

    // Search agents
    const agents = await db.agent.findMany({
      where: {
        OR: [
          { name: { contains: query } },
          { description: { contains: query } },
          { type: { contains: query } },
        ],
      },
      take: limit,
      select: { id: true, name: true, type: true, status: true, avatar: true, description: true },
    });
    results.agents = agents;
    total += agents.length;

    // Search tasks
    const tasks = await db.task.findMany({
      where: {
        OR: [
          { title: { contains: query } },
          { description: { contains: query } },
          { tags: { contains: query } },
        ],
      },
      take: limit,
      select: { id: true, title: true, status: true, priority: true, agentId: true },
    });
    results.tasks = tasks;
    total += tasks.length;

    // Search memories
    const memories = await db.memory.findMany({
      where: {
        OR: [
          { title: { contains: query } },
          { content: { contains: query } },
          { folder: { contains: query } },
          { tags: { contains: query } },
        ],
      },
      take: limit,
      select: { id: true, title: true, type: true, folder: true, agentId: true },
    });
    results.memories = memories;
    total += memories.length;

    // Search skills
    const skills = await db.skill.findMany({
      where: {
        OR: [
          { name: { contains: query } },
          { description: { contains: query } },
          { category: { contains: query } },
        ],
      },
      take: limit,
      select: { id: true, name: true, category: true, usageCount: true },
    });
    results.skills = skills;
    total += skills.length;

    // Search goals
    const goals = await db.goal.findMany({
      where: {
        OR: [
          { title: { contains: query } },
          { description: { contains: query } },
        ],
      },
      take: limit,
      select: { id: true, title: true, status: true, progress: true, agentId: true },
    });
    results.goals = goals;
    total += goals.length;

    // Search artifacts
    const artifacts = await db.artifact.findMany({
      where: {
        OR: [
          { title: { contains: query } },
          { description: { contains: query } },
          { type: { contains: query } },
          { tags: { contains: query } },
        ],
      },
      take: limit,
      select: { id: true, title: true, type: true, status: true, version: true },
    });
    results.artifacts = artifacts;
    total += artifacts.length;

    // Search cron jobs
    const cronJobs = await db.cronJob.findMany({
      where: {
        OR: [
          { name: { contains: query } },
          { description: { contains: query } },
          { action: { contains: query } },
          { schedule: { contains: query } },
        ],
      },
      take: limit,
      select: { id: true, name: true, schedule: true, action: true, isActive: true },
    });
    results.cronJobs = cronJobs;
    total += cronJobs.length;

    // Search conversations
    const conversations = await db.conversation.findMany({
      where: {
        OR: [
          { title: { contains: query } },
        ],
      },
      take: limit,
      select: { id: true, title: true, agentId: true, createdAt: true },
    });
    results.conversations = conversations;
    total += conversations.length;

    return NextResponse.json({ results, total, query });
  } catch (error) {
    searchLogger.error('Search failed', { error: String(error) });
    return NextResponse.json({ error: 'Search failed' }, { status: 500 });
  }
}

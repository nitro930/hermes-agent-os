import { db } from '@/lib/db';
import { NextResponse } from 'next/server';

export async function GET() {
  try {
    const [totalAgents, activeAgents, tasksCompleted, memoryEntries, totalTasks, runningAutomations, totalSkills, totalGoals, activeGoals, mcpConnections, totalMcpServers] =
      await Promise.all([
        db.agent.count(),
        db.agent.count({ where: { status: 'running' } }),
        db.task.count({ where: { status: 'done' } }),
        db.memory.count(),
        db.task.count(),
        db.automation.count({ where: { isActive: true } }),
        db.skill.count(),
        db.goal.count(),
        db.goal.count({ where: { status: 'active' } }),
        db.mcpServer.count({ where: { status: 'connected' } }),
        db.mcpServer.count(),
      ]);

    const agentsByStatus = await db.agent.groupBy({ by: ['status'], _count: true });
    const tasksByStatus = await db.task.groupBy({ by: ['status'], _count: true });

    return NextResponse.json({
      totalAgents,
      activeAgents,
      tasksCompleted,
      memoryEntries,
      totalTasks,
      runningAutomations,
      totalSkills,
      totalGoals,
      activeGoals,
      mcpConnections,
      totalMcpServers,
      agentsByStatus,
      tasksByStatus,
    });
  } catch (error) {
    console.error('Failed to fetch stats:', error);
    return NextResponse.json({ error: 'Failed to fetch stats' }, { status: 500 });
  }
}

import { db } from '@/lib/db';
import { NextResponse } from 'next/server';

export async function POST() {
  try {
    await db.activityLog.deleteMany();
    await db.message.deleteMany();
    await db.conversation.deleteMany();
    await db.task.deleteMany();
    await db.memory.deleteMany();
    await db.agent.deleteMany();
    await db.automation.deleteMany();
    await db.team.deleteMany();

    const agents = await Promise.all([
      db.agent.create({
        data: {
          name: 'Hermes',
          description: 'Central orchestrator that coordinates all agents and manages workflows',
          type: 'orchestration',
          status: 'running',
          avatar: '🧠',
          systemPrompt: 'You are Hermes, the central orchestrator of the Agent OS. You coordinate all agents, manage workflows, and help users accomplish complex tasks by delegating to specialized agents. Be concise, helpful, and proactive.',
          model: 'default',
        },
      }),
      db.agent.create({
        data: {
          name: 'Jarvis',
          description: 'Voice-activated assistant for hands-free control',
          type: 'voice',
          status: 'idle',
          avatar: '🎙️',
          systemPrompt: 'You are Jarvis, a voice-activated AI assistant. You help users with hands-free control of the Agent OS. Be conversational, friendly, and efficient.',
          model: 'default',
        },
      }),
      db.agent.create({
        data: {
          name: 'Research Agent',
          description: 'Specialized in web research, data gathering, and analysis',
          type: 'research',
          status: 'idle',
          avatar: '🔍',
          systemPrompt: 'You are the Research Agent, specialized in web research, data gathering, and analysis. Provide thorough, well-sourced information and insights.',
          model: 'default',
        },
      }),
      db.agent.create({
        data: {
          name: 'Code Agent',
          description: 'Expert at writing, reviewing, and debugging code',
          type: 'coding',
          status: 'idle',
          avatar: '💻',
          systemPrompt: 'You are the Code Agent, an expert at writing, reviewing, and debugging code. Provide clean, efficient, and well-documented code solutions.',
          model: 'default',
        },
      }),
      db.agent.create({
        data: {
          name: 'Writer Agent',
          description: 'Creates and edits content, documentation, and reports',
          type: 'writing',
          status: 'idle',
          avatar: '✍️',
          systemPrompt: 'You are the Writer Agent, specialized in creating and editing content, documentation, and reports. Write clearly, engagingly, and with proper structure.',
          model: 'default',
        },
      }),
    ]);

    const teams = await Promise.all([
      db.team.create({
        data: {
          name: 'Core Team',
          description: 'Core orchestration and voice control team',
          color: '#10b981',
        },
      }),
      db.team.create({
        data: {
          name: 'Specialist Team',
          description: 'Specialized research, coding, and writing team',
          color: '#6366f1',
        },
      }),
    ]);

    await db.agent.update({ where: { id: agents[0].id }, data: { teamId: teams[0].id } });
    await db.agent.update({ where: { id: agents[1].id }, data: { teamId: teams[0].id } });
    await db.agent.update({ where: { id: agents[2].id }, data: { teamId: teams[1].id } });
    await db.agent.update({ where: { id: agents[3].id }, data: { teamId: teams[1].id } });
    await db.agent.update({ where: { id: agents[4].id }, data: { teamId: teams[1].id } });

    await Promise.all([
      db.task.create({
        data: {
          title: 'Design system architecture',
          description: 'Create the overall system architecture for the Agent OS platform',
          status: 'todo',
          priority: 'high',
          column: 'todo',
          order: 0,
          agentId: agents[0].id,
          tags: 'architecture,design',
        },
      }),
      db.task.create({
        data: {
          title: 'Research competitor agents',
          description: 'Analyze existing AI agent platforms and their capabilities',
          status: 'in_progress',
          priority: 'medium',
          column: 'in_progress',
          order: 0,
          agentId: agents[2].id,
          tags: 'research,competitive',
        },
      }),
      db.task.create({
        data: {
          title: 'Write documentation',
          description: 'Create comprehensive documentation for the Agent OS API',
          status: 'todo',
          priority: 'medium',
          column: 'todo',
          order: 1,
          agentId: agents[4].id,
          tags: 'docs,writing',
        },
      }),
      db.task.create({
        data: {
          title: 'Build API endpoints',
          description: 'Implement all REST API endpoints for the platform',
          status: 'review',
          priority: 'high',
          column: 'review',
          order: 0,
          agentId: agents[3].id,
          tags: 'api,backend',
        },
      }),
      db.task.create({
        data: {
          title: 'Test integration',
          description: 'Run integration tests across all agent workflows',
          status: 'done',
          priority: 'low',
          column: 'done',
          order: 0,
          agentId: agents[3].id,
          tags: 'testing,qa',
        },
      }),
    ]);

    await Promise.all([
      db.memory.create({
        data: {
          title: 'Project Overview',
          content: '# Agent OS Project Overview\n\nThe Agent OS is a comprehensive platform for managing AI agents. It provides:\n\n- **Agent Management**: Create, configure, and monitor AI agents\n- **Team Coordination**: Group agents into teams for complex workflows\n- **Task Management**: Kanban-style task tracking with drag-and-drop\n- **Memory System**: Persistent storage for agent knowledge\n- **Automation Engine**: Event-driven automation rules\n- **Chat Interface**: Direct communication with agents\n\n## Architecture\n\nThe system is built on Next.js 16 with Prisma ORM and uses a dark theme with emerald accents.',
          type: 'document',
          folder: 'General',
          isPinned: true,
          tags: 'overview,architecture',
        },
      }),
      db.memory.create({
        data: {
          title: 'API Design Notes',
          content: '# API Design Notes\n\n## REST Endpoints\n\n### Agents\n- GET /api/agents - List all agents\n- POST /api/agents - Create agent\n- GET /api/agents/[id] - Get agent\n- PATCH /api/agents/[id] - Update agent\n- DELETE /api/agents/[id] - Delete agent\n\n### Tasks\n- GET /api/tasks - List all tasks\n- POST /api/tasks - Create task\n- PATCH /api/tasks/[id] - Update task\n- DELETE /api/tasks/[id] - Delete task\n\n## Response Format\nAll responses use JSON with consistent error handling.',
          type: 'reference',
          folder: 'Code',
          isPinned: false,
          tags: 'api,design,reference',
        },
      }),
      db.memory.create({
        data: {
          title: 'Research Findings',
          content: '# Research Findings\n\n## Key Insights\n\n1. Multi-agent systems are becoming increasingly popular\n2. Orchestration is the key challenge in agent coordination\n3. Memory persistence is critical for agent effectiveness\n4. Visual task management improves team productivity\n\n## Competitor Analysis\n- AutoGPT: Open source, autonomous agent\n- BabyAGI: Task-driven autonomous agent\n- CrewAI: Multi-agent framework\n- LangGraph: Graph-based agent orchestration',
          type: 'document',
          folder: 'Research',
          isPinned: false,
          tags: 'research,analysis',
        },
      }),
    ]);

    await Promise.all([
      db.automation.create({
        data: {
          name: 'Auto-assign research tasks',
          description: 'Automatically assign research tasks to the Research Agent',
          trigger: 'on_task_create',
          action: 'run_agent',
          config: JSON.stringify({ agentType: 'research', taskFilter: { tags: 'research' } }),
          isActive: true,
        },
      }),
      db.automation.create({
        data: {
          name: 'Daily summary',
          description: 'Send a daily summary of completed tasks and agent activity',
          trigger: 'on_schedule',
          action: 'send_message',
          config: JSON.stringify({ schedule: '0 9 * * *', channel: 'general' }),
          isActive: true,
        },
      }),
    ]);

    await Promise.all([
      db.activityLog.create({
        data: {
          agentId: agents[0].id,
          agentName: 'Hermes',
          action: 'System Boot',
          details: 'Agent OS initialized successfully',
          type: 'success',
        },
      }),
      db.activityLog.create({
        data: {
          agentId: agents[0].id,
          agentName: 'Hermes',
          action: 'Agent Online',
          details: 'Hermes orchestrator is now running',
          type: 'success',
        },
      }),
      db.activityLog.create({
        data: {
          agentId: agents[2].id,
          agentName: 'Research Agent',
          action: 'Task Assigned',
          details: 'Research Agent assigned to "Research competitor agents"',
          type: 'info',
        },
      }),
      db.activityLog.create({
        data: {
          agentId: agents[3].id,
          agentName: 'Code Agent',
          action: 'Task Moved',
          details: 'Task "Build API endpoints" moved to review',
          type: 'info',
        },
      }),
      db.activityLog.create({
        data: {
          agentName: 'System',
          action: 'Automation Activated',
          details: '"Auto-assign research tasks" automation is now active',
          type: 'success',
        },
      }),
    ]);

    return NextResponse.json({ success: true, message: 'Database seeded successfully' });
  } catch (error) {
    console.error('Seed error:', error);
    return NextResponse.json({ error: 'Failed to seed database' }, { status: 500 });
  }
}

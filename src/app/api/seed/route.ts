import { db } from '@/lib/db';
import { NextResponse } from 'next/server';
import { parseCronExpression, getNextRun } from '@/lib/cron-parser';

export async function POST() {
  try {
    await db.activityLog.deleteMany();
    await db.cronExecution.deleteMany();
    await db.cronJob.deleteMany();
    await db.message.deleteMany();
    await db.conversation.deleteMany();
    await db.artifact.deleteMany();
    await db.delegate.deleteMany();
    await db.skill.deleteMany();
    await db.goal.deleteMany();
    await db.task.deleteMany();
    await db.memory.deleteMany();
    await db.agent.deleteMany();
    await db.automation.deleteMany();
    await db.team.deleteMany();
    await db.mcpServer.deleteMany();

    const agents = await Promise.all([
      db.agent.create({
        data: {
          name: 'Hermes',
          description: 'Central orchestrator that coordinates all agents and manages workflows',
          type: 'orchestration',
          status: 'running',
          avatar: '🧠',
          systemPrompt: 'You are Hermes, the central orchestrator of the Agent OS. You coordinate all agents, manage workflows, and help users accomplish complex tasks by delegating to specialized agents. Be concise, helpful, and proactive.',
          soulMd: 'You are Hermes, the central orchestrator. You coordinate, delegate, and synthesize. You think in systems and workflows.',
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
          soulMd: 'You are Jarvis, a voice-activated assistant. You are always listening, always ready. You communicate concisely and clearly.',
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
          soulMd: 'You are a research specialist. You dig deep, verify sources, and present findings clearly.',
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
          soulMd: 'You are a coding expert. You write clean, efficient code and review critically.',
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
          soulMd: 'You are a content creator. You write clearly, structure well, and adapt your tone to the audience.',
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

    // Seed Skills
    await Promise.all([
      db.skill.create({
        data: {
          name: 'Web Research Protocol',
          description: 'Systematic approach to conducting web research and synthesizing findings',
          category: 'research',
          steps: JSON.stringify(['Define search query', 'Execute web search', 'Extract key findings', 'Synthesize results']),
          triggers: 'When user asks for research or information gathering',
          isAutoLearned: true,
          usageCount: 24,
          agentId: agents[2].id,
        },
      }),
      db.skill.create({
        data: {
          name: 'Code Review Checklist',
          description: 'Comprehensive checklist for reviewing code quality and correctness',
          category: 'coding',
          steps: JSON.stringify(['Check for bugs', 'Verify naming conventions', 'Review error handling', 'Test edge cases']),
          triggers: 'When new code is submitted for review',
          isAutoLearned: true,
          usageCount: 18,
          agentId: agents[3].id,
        },
      }),
      db.skill.create({
        data: {
          name: 'Content Brief Builder',
          description: 'Build structured content briefs for writing tasks',
          category: 'writing',
          steps: JSON.stringify(['Define audience', 'Set key messages', 'Outline structure', 'Draft content']),
          triggers: 'When a writing task is assigned',
          usageCount: 12,
          agentId: agents[4].id,
        },
      }),
      db.skill.create({
        data: {
          name: 'Task Delegation',
          description: 'Protocol for delegating tasks to the most appropriate agent',
          category: 'automation',
          steps: JSON.stringify(['Analyze task requirements', 'Match to agent capabilities', 'Assign with context', 'Monitor progress']),
          triggers: 'When a new task needs to be assigned',
          isAutoLearned: true,
          usageCount: 31,
          agentId: agents[0].id,
        },
      }),
      db.skill.create({
        data: {
          name: 'Meeting Summary',
          description: 'Generate concise meeting summaries with action items',
          category: 'communication',
          steps: JSON.stringify(['Capture key points', 'List action items', 'Assign responsibilities', 'Schedule follow-ups']),
          triggers: 'When a meeting or discussion concludes',
          usageCount: 9,
        },
      }),
    ]);

    // Seed Goals
    const futureDate = (monthsAhead: number) => {
      const d = new Date();
      d.setMonth(d.getMonth() + monthsAhead);
      return d.toISOString().split('T')[0];
    };

    await Promise.all([
      db.goal.create({
        data: {
          title: 'Launch v1.0 API',
          description: 'Complete and deploy the v1.0 API with all core endpoints',
          status: 'active',
          priority: 'high',
          progress: 75,
          agentId: agents[3].id,
          dueDate: futureDate(2),
        },
      }),
      db.goal.create({
        data: {
          title: 'Research Market Trends',
          description: 'Analyze current market trends and produce a comprehensive report',
          status: 'active',
          priority: 'medium',
          progress: 40,
          agentId: agents[2].id,
          dueDate: futureDate(3),
        },
      }),
      db.goal.create({
        data: {
          title: 'Build Documentation Site',
          description: 'Create and deploy a documentation website for the Agent OS platform',
          status: 'active',
          priority: 'medium',
          progress: 20,
          agentId: agents[4].id,
          dueDate: futureDate(4),
        },
      }),
      db.goal.create({
        data: {
          title: 'Voice Integration POC',
          description: 'Build a proof of concept for voice-activated agent control',
          status: 'active',
          priority: 'high',
          progress: 60,
          agentId: agents[1].id,
          dueDate: futureDate(1),
        },
      }),
    ]);

    // Seed MCP Servers
    await Promise.all([
      db.mcpServer.create({
        data: {
          name: 'Web Search',
          description: 'Web search MCP server for internet queries',
          url: 'mcp://web-search',
          status: 'connected',
          toolsCount: 5,
        },
      }),
      db.mcpServer.create({
        data: {
          name: 'File System',
          description: 'File system access MCP server',
          url: 'mcp://filesystem',
          status: 'connected',
          toolsCount: 8,
        },
      }),
      db.mcpServer.create({
        data: {
          name: 'Database',
          description: 'Database query and management MCP server',
          url: 'mcp://database',
          status: 'disconnected',
          toolsCount: 0,
        },
      }),
      db.mcpServer.create({
        data: {
          name: 'Code Interpreter',
          description: 'Code execution and interpretation MCP server',
          url: 'mcp://code-interpreter',
          status: 'connected',
          toolsCount: 3,
        },
      }),
    ]);

    // Seed Artifacts
    await Promise.all([
      db.artifact.create({
        data: {
          title: 'Landing Page',
          description: 'A modern landing page with hero section and feature cards',
          type: 'html',
          content: `<div style="max-width: 900px; margin: 0 auto;">
  <div style="text-align: center; padding: 3rem 1rem;">
    <h1 style="font-size: 2.5rem; font-weight: 800; margin-bottom: 0.5rem; background: linear-gradient(135deg, #10b981, #6366f1); -webkit-background-clip: text; -webkit-text-fill-color: transparent;">
      Hermes Agent OS
    </h1>
    <p style="font-size: 1.1rem; color: #64748b; max-width: 500px; margin: 0 auto 2rem;">
      Your AI-powered command center for managing agents, automating workflows, and building intelligent applications.
    </p>
    <div style="display: flex; gap: 0.75rem; justify-content: center;">
      <button style="padding: 0.75rem 1.5rem; background: #10b981; color: white; border: none; border-radius: 8px; font-weight: 600; font-size: 0.95rem; cursor: pointer;">
        Get Started
      </button>
      <button style="padding: 0.75rem 1.5rem; background: transparent; color: #10b981; border: 2px solid #10b981; border-radius: 8px; font-weight: 600; font-size: 0.95rem; cursor: pointer;">
        Documentation
      </button>
    </div>
  </div>
  <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 1.25rem; padding: 1rem;">
    <div class="card" style="padding: 1.5rem;">
      <div style="font-size: 1.5rem; margin-bottom: 0.5rem;">🤖</div>
      <h3 style="font-weight: 700; margin-bottom: 0.4rem;">Agent Management</h3>
      <p style="color: #64748b; font-size: 0.85rem;">Create, configure, and monitor AI agents with unique personalities and skills.</p>
    </div>
    <div class="card" style="padding: 1.5rem;">
      <div style="font-size: 1.5rem; margin-bottom: 0.5rem;">⚡</div>
      <h3 style="font-weight: 700; margin-bottom: 0.4rem;">Automation Engine</h3>
      <p style="color: #64748b; font-size: 0.85rem;">Event-driven workflows that trigger automatically based on your rules.</p>
    </div>
    <div class="card" style="padding: 1.5rem;">
      <div style="font-size: 1.5rem; margin-bottom: 0.5rem;">🧠</div>
      <h3 style="font-weight: 700; margin-bottom: 0.4rem;">Memory System</h3>
      <p style="color: #64748b; font-size: 0.85rem;">Persistent knowledge storage that helps agents learn and improve over time.</p>
    </div>
  </div>
</div>`,
          status: 'ready',
          agentId: agents[3].id,
          tags: 'landing,homepage,demo',
          isPublic: true,
        },
      }),
      db.artifact.create({
        data: {
          title: 'Dashboard Widget',
          description: 'A stats dashboard widget with live counters',
          type: 'html',
          content: `<div style="max-width: 700px; margin: 0 auto;">
  <h2 style="font-size: 1.25rem; font-weight: 700; margin-bottom: 1rem;">System Dashboard</h2>
  <div style="display: grid; grid-template-columns: repeat(4, 1fr); gap: 0.75rem; margin-bottom: 1.5rem;">
    <div class="card" style="text-align: center; padding: 1.25rem;">
      <div style="font-size: 1.75rem; font-weight: 800; color: #10b981;">5</div>
      <div style="font-size: 0.75rem; color: #64748b;">Active Agents</div>
    </div>
    <div class="card" style="text-align: center; padding: 1.25rem;">
      <div style="font-size: 1.75rem; font-weight: 800; color: #f59e0b;">12</div>
      <div style="font-size: 0.75rem; color: #64748b;">Pending Tasks</div>
    </div>
    <div class="card" style="text-align: center; padding: 1.25rem;">
      <div style="font-size: 1.75rem; font-weight: 800; color: #6366f1;">8</div>
      <div style="font-size: 0.75rem; color: #64748b;">Skills</div>
    </div>
    <div class="card" style="text-align: center; padding: 1.25rem;">
      <div style="font-size: 1.75rem; font-weight: 800; color: #ec4899;">4</div>
      <div style="font-size: 0.75rem; color: #64748b;">Goals</div>
    </div>
  </div>
  <div class="card" style="padding: 1rem;">
    <h3 style="font-size: 0.85rem; font-weight: 600; margin-bottom: 0.75rem;">Recent Activity</h3>
    <div style="display: flex; flex-direction: column; gap: 0.5rem;">
      <div style="display: flex; align-items: center; gap: 0.5rem; font-size: 0.8rem;">
        <span style="color: #10b981;">●</span> Hermes completed task "Design system architecture"
      </div>
      <div style="display: flex; align-items: center; gap: 0.5rem; font-size: 0.8rem;">
        <span style="color: #f59e0b;">●</span> Research Agent started "Market analysis"
      </div>
      <div style="display: flex; align-items: center; gap: 0.5rem; font-size: 0.8rem;">
        <span style="color: #6366f1;">●</span> New skill auto-learned: "Task Delegation"
      </div>
    </div>
  </div>
</div>`,
          status: 'ready',
          agentId: agents[0].id,
          tags: 'dashboard,stats,widget',
        },
      }),
      db.artifact.create({
        data: {
          title: 'API Config',
          description: 'Agent API configuration schema',
          type: 'json',
          content: JSON.stringify({
            apiVersion: "v1",
            agents: { maxConcurrent: 5, defaultModel: "default", timeout: 30000 },
            automation: { maxRetries: 3, retryDelay: 5000 },
            memory: { maxEntries: 1000, autoCleanup: true, retentionDays: 90 }
          }, null, 2),
          status: 'ready',
          agentId: agents[3].id,
          tags: 'config,api,schema',
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
      db.activityLog.create({
        data: {
          agentName: 'Hermes',
          action: 'Skill Auto-Learned',
          details: 'New skill "Task Delegation" was auto-learned from workflow patterns',
          type: 'info',
        },
      }),
      db.activityLog.create({
        data: {
          agentName: 'Hermes',
          action: 'Skill Auto-Learned',
          details: 'New skill "Web Research Protocol" was auto-learned from agent behavior',
          type: 'info',
        },
      }),
      db.activityLog.create({
        data: {
          agentName: 'System',
          action: 'MCP Server Connected',
          details: 'MCP server "Web Search" connected with 5 tools available',
          type: 'success',
        },
      }),
    ]);

    // Seed Cron Jobs
    const hourlyFields = parseCronExpression('0 * * * *');
    const dailyFields = parseCronExpression('0 9 * * *');
    const weekdayFields = parseCronExpression('0 9 * * 1-5');
    const fifteenMinFields = parseCronExpression('*/15 * * * *');

    await Promise.all([
      db.cronJob.create({
        data: {
          name: 'Hourly Health Check',
          description: 'Runs a health check on all active agents every hour',
          schedule: '0 * * * *',
          timezone: 'UTC',
          action: 'run_agent',
          config: JSON.stringify({ agentId: agents[0].id, prompt: 'Check the status of all agents and report any issues. Provide a brief summary of system health.' }),
          isActive: true,
          isSystem: true,
          agentId: agents[0].id,
          nextRunAt: getNextRun(hourlyFields),
        },
      }),
      db.cronJob.create({
        data: {
          name: 'Daily Standup Report',
          description: 'Generates a daily standup report at 9 AM with task status and agent activity',
          schedule: '0 9 * * *',
          timezone: 'UTC',
          action: 'create_task',
          config: JSON.stringify({ taskTitle: 'Daily Standup Report', taskDescription: 'Generate and review the daily standup report', priority: 'medium' }),
          isActive: true,
          nextRunAt: getNextRun(dailyFields),
        },
      }),
      db.cronJob.create({
        data: {
          name: 'Weekday Morning Briefing',
          description: 'Sends a morning briefing to Hermes on weekdays at 9 AM',
          schedule: '0 9 * * 1-5',
          timezone: 'Europe/London',
          action: 'send_message',
          config: JSON.stringify({ agentId: agents[0].id, message: 'Good morning! Here is your weekday briefing. Please review pending tasks and priorities for the day.' }),
          isActive: true,
          agentId: agents[0].id,
          nextRunAt: getNextRun(weekdayFields),
        },
      }),
      db.cronJob.create({
        data: {
          name: 'System Metrics Pulse',
          description: 'Every 15 minutes, log a system metrics notification',
          schedule: '*/15 * * * *',
          timezone: 'UTC',
          action: 'notify',
          config: JSON.stringify({ notificationTitle: 'Metrics Pulse', notificationMessage: '15-minute system metrics check completed' }),
          isActive: false,
          nextRunAt: null,
        },
      }),
    ]);

    return NextResponse.json({ success: true, message: 'Database seeded successfully' });
  } catch (error) {
    console.error('Seed error:', error);
    return NextResponse.json({ error: 'Failed to seed database' }, { status: 500 });
  }
}

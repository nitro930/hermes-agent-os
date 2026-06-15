import { z } from 'zod';

// ─── Shared schemas ─────────────────────────────────────────────────────────

export const paginationSchema = z.object({
  take: z.coerce.number().int().min(1).max(200).default(50),
  skip: z.coerce.number().int().min(0).default(0),
  cursor: z.string().optional(),
});

export const idSchema = z.object({
  id: z.string().min(1),
});

// ─── Agent schemas ──────────────────────────────────────────────────────────

export const createAgentSchema = z.object({
  name: z.string().min(1).max(200),
  description: z.string().min(1).max(2000),
  type: z.enum(['general', 'research', 'coding', 'writing', 'voice', 'orchestration']).default('general'),
  avatar: z.string().max(50).optional(),
  systemPrompt: z.string().max(10000).optional(),
  soulMd: z.string().max(20000).optional(),
  model: z.string().max(100).default('default'),
  teamId: z.string().optional(),
});

export const updateAgentSchema = z.object({
  name: z.string().min(1).max(200).optional(),
  description: z.string().min(1).max(2000).optional(),
  type: z.enum(['general', 'research', 'coding', 'writing', 'voice', 'orchestration']).optional(),
  avatar: z.string().max(50).optional(),
  status: z.enum(['idle', 'running', 'error', 'paused']).optional(),
  systemPrompt: z.string().max(10000).optional(),
  soulMd: z.string().max(20000).optional(),
  model: z.string().max(100).optional(),
  teamId: z.string().nullable().optional(),
});

// ─── Task schemas ───────────────────────────────────────────────────────────

export const createTaskSchema = z.object({
  title: z.string().min(1).max(500),
  description: z.string().max(5000).optional(),
  status: z.enum(['todo', 'in_progress', 'review', 'done']).default('todo'),
  priority: z.enum(['low', 'medium', 'high', 'urgent']).default('medium'),
  column: z.string().max(50).default('todo'),
  order: z.number().int().default(0),
  agentId: z.string().optional(),
  tags: z.string().max(500).optional(),
  dueDate: z.string().max(50).optional(),
});

export const updateTaskSchema = z.object({
  title: z.string().min(1).max(500).optional(),
  description: z.string().max(5000).optional(),
  status: z.enum(['todo', 'in_progress', 'review', 'done']).optional(),
  priority: z.enum(['low', 'medium', 'high', 'urgent']).optional(),
  column: z.string().max(50).optional(),
  order: z.number().int().optional(),
  agentId: z.string().nullable().optional(),
  tags: z.string().max(500).optional(),
  dueDate: z.string().max(50).optional(),
});

// ─── Memory schemas ─────────────────────────────────────────────────────────

export const createMemorySchema = z.object({
  title: z.string().min(1).max(500),
  content: z.string().min(1).max(100000),
  type: z.enum(['note', 'document', 'reference', 'log']).default('note'),
  tags: z.string().max(500).optional(),
  folder: z.string().max(100).default('General'),
  agentId: z.string().optional(),
  isPinned: z.boolean().default(false),
});

export const updateMemorySchema = z.object({
  title: z.string().min(1).max(500).optional(),
  content: z.string().min(1).max(100000).optional(),
  type: z.enum(['note', 'document', 'reference', 'log']).optional(),
  tags: z.string().max(500).optional(),
  folder: z.string().max(100).optional(),
  isPinned: z.boolean().optional(),
});

// ─── Conversation schemas ───────────────────────────────────────────────────

export const createConversationSchema = z.object({
  title: z.string().min(1).max(500),
  agentId: z.string().min(1),
});

// ─── Automation schemas ─────────────────────────────────────────────────────

export const createAutomationSchema = z.object({
  name: z.string().min(1).max(200),
  description: z.string().max(2000).optional(),
  trigger: z.enum(['on_message', 'on_task_create', 'on_schedule', 'on_agent_idle']),
  action: z.enum(['send_message', 'create_task', 'run_agent', 'notify']),
  config: z.string().max(10000),
  isActive: z.boolean().default(true),
});

export const updateAutomationSchema = z.object({
  name: z.string().min(1).max(200).optional(),
  description: z.string().max(2000).optional(),
  trigger: z.enum(['on_message', 'on_task_create', 'on_schedule', 'on_agent_idle']).optional(),
  action: z.enum(['send_message', 'create_task', 'run_agent', 'notify']).optional(),
  config: z.string().max(10000).optional(),
  isActive: z.boolean().optional(),
  lastRunAt: z.string().optional(),
});

// ─── Team schemas ───────────────────────────────────────────────────────────

export const createTeamSchema = z.object({
  name: z.string().min(1).max(200),
  description: z.string().min(1).max(2000),
  color: z.string().max(20).default('#6366f1'),
});

export const updateTeamSchema = z.object({
  name: z.string().min(1).max(200).optional(),
  description: z.string().min(1).max(2000).optional(),
  color: z.string().max(20).optional(),
});

// ─── Skill schemas ──────────────────────────────────────────────────────────

export const createSkillSchema = z.object({
  name: z.string().min(1).max(200),
  description: z.string().min(1).max(2000),
  category: z.enum(['general', 'research', 'coding', 'writing', 'automation', 'communication']).default('general'),
  steps: z.string().min(1).max(50000),
  triggers: z.string().max(1000).optional(),
  isAutoLearned: z.boolean().default(false),
  agentId: z.string().optional(),
});

export const updateSkillSchema = z.object({
  name: z.string().min(1).max(200).optional(),
  description: z.string().min(1).max(2000).optional(),
  category: z.enum(['general', 'research', 'coding', 'writing', 'automation', 'communication']).optional(),
  steps: z.string().min(1).max(50000).optional(),
  triggers: z.string().max(1000).optional(),
  isAutoLearned: z.boolean().optional(),
  usageCount: z.number().int().optional(),
});

// ─── Goal schemas ───────────────────────────────────────────────────────────

export const createGoalSchema = z.object({
  title: z.string().min(1).max(500),
  description: z.string().max(2000).optional(),
  priority: z.enum(['low', 'medium', 'high', 'urgent']).default('medium'),
  agentId: z.string().optional(),
  dueDate: z.string().max(50).optional(),
});

export const updateGoalSchema = z.object({
  title: z.string().min(1).max(500).optional(),
  description: z.string().max(2000).optional(),
  status: z.enum(['active', 'completed', 'abandoned']).optional(),
  priority: z.enum(['low', 'medium', 'high', 'urgent']).optional(),
  progress: z.number().int().min(0).max(100).optional(),
  dueDate: z.string().max(50).optional(),
});

// ─── Delegate schemas ───────────────────────────────────────────────────────

export const createDelegateSchema = z.object({
  name: z.string().min(1).max(200),
  description: z.string().max(2000).optional(),
  task: z.string().min(1).max(2000),
  parentAgentId: z.string().min(1),
});

export const updateDelegateSchema = z.object({
  name: z.string().min(1).max(200).optional(),
  description: z.string().max(2000).optional(),
  status: z.enum(['pending', 'running', 'completed', 'failed']).optional(),
  result: z.string().max(20000).optional(),
});

// ─── MCP Server schemas ─────────────────────────────────────────────────────

export const createMcpSchema = z.object({
  name: z.string().min(1).max(200),
  description: z.string().max(2000).optional(),
  url: z.string().min(1).max(2000).url(),
  toolsCount: z.number().int().min(0).default(0),
});

export const updateMcpSchema = z.object({
  name: z.string().min(1).max(200).optional(),
  description: z.string().max(2000).optional(),
  url: z.string().min(1).max(2000).url().optional(),
  status: z.enum(['connected', 'disconnected', 'error']).optional(),
  toolsCount: z.number().int().min(0).optional(),
});

// ─── Artifact schemas ───────────────────────────────────────────────────────

export const createArtifactSchema = z.object({
  title: z.string().min(1).max(500),
  description: z.string().max(2000).optional(),
  type: z.enum(['html', 'react', 'code', 'markdown', 'json', 'css', 'text']).default('html'),
  content: z.string().min(1).max(1000000),
  agentId: z.string().optional(),
  taskId: z.string().optional(),
  tags: z.string().max(500).optional(),
  isPublic: z.boolean().default(false),
});

export const updateArtifactSchema = z.object({
  title: z.string().min(1).max(500).optional(),
  description: z.string().max(2000).optional(),
  type: z.enum(['html', 'react', 'code', 'markdown', 'json', 'css', 'text']).optional(),
  content: z.string().min(1).max(1000000).optional(),
  status: z.enum(['draft', 'building', 'ready', 'error', 'deployed']).optional(),
  tags: z.string().max(500).optional(),
  isPublic: z.boolean().optional(),
});

export const generateArtifactSchema = z.object({
  description: z.string().min(1).max(5000),
  type: z.enum(['html', 'react', 'code', 'markdown', 'json', 'css', 'text']).default('html'),
});

// ─── Chat schema ────────────────────────────────────────────────────────────

export const chatSchema = z.object({
  message: z.string().min(1).max(10000),
  agentId: z.string().min(1),
  conversationId: z.string().optional(),
});

// ─── Version restore schema ─────────────────────────────────────────────────

export const restoreVersionSchema = z.object({
  artifactId: z.string().min(1),
  version: z.number().int().min(1),
});

// ─── Delegate task schema ───────────────────────────────────────────────────

export const delegateTaskSchema = z.object({
  fromAgentId: z.string().min(1),
  toAgentId: z.string().min(1),
  task: z.string().min(1).max(2000),
});

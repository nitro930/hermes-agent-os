# Hermes Agent OS

A self-hosted multi-agent operating system with built-in OpenRouter Fusion integration for multi-model deliberation, cron scheduling, RAG-grounded memory, per-team cost attribution, and production-grade security hardening.

## Features

### Core OS
- **Agents** — configurable AI agents with system prompts, SOUL.md personalities, model selection, and per-team membership
- **Chat** — multi-conversation chat with memory + tasks + goals context, Fusion toggle for one-click multi-model deliberation
- **Memory** — pinned notes / docs / references / logs, organized in folders
- **Tasks** — Kanban-style task board with priorities and tags
- **Goals** — progress-tracked objectives per agent
- **Teams** — group agents, share OpenRouter API keys for cost attribution, trigger team debates
- **Skills** — reusable playbooks, executable via Fusion
- **Automations** — fire-and-forget triggers
- **MCP** — Model Context Protocol server registry
- **Dev Server** — live artifact preview + versioning
- **Voice** — TTS + ASR via ZAI SDK
- **Cron** — full scheduler with parser, supports `run_agent`, `create_task`, `send_message`, `notify`, `webhook`, and `fusion` actions

### OpenRouter Fusion
Multi-model deliberation: a panel of up to 8 models answers in parallel (each with web_search), a judge produces structured analysis (consensus / contradictions / partial coverage / unique insights / blind spots), and a final model writes the answer.

- **Fusion view** — composer with preset or custom panel + judge + final-model picker, history sidebar, structured result viewer with per-model panel tabs
- **Streaming** — SSE endpoint `/api/fusion/stream` for live token streaming of the final answer
- **A/B compare** — run the same prompt through two presets side-by-side and compare cost/quality/latency
- **RAG-grounded** — pinned memories for the linked agent are automatically injected into the panel's system prompt
- **Cron-triggered** — schedule recurring Fusion deliberations (e.g. daily news brief, weekly market analysis) with optional auto-save to memory
- **Webhook** — fire Fusion from external systems via `POST /api/fusion/webhook` (requires `FUSION_WEBHOOK_SECRET`)
- **Skill execution** — any skill can be executed via Fusion, with the skill's steps + agent context as the prompt
- **Team debate** — map each team member's `model` field to a Fusion panel seat; the team's combined pinned memories provide RAG context
- **Multi-tenant keys** — each Team can have its own OpenRouter API key for cost attribution (overrides the global key)
- **Model availability** — `/api/fusion/models` polls OpenRouter's live model list, caches for 5 min
- **Auto memory** — successful Fusion runs linked to an agent automatically save the final answer + judge analysis as a memory entry tagged `fusion,auto-saved`
- **Audit log** — every Fusion run produces an ActivityLog entry with tokens, cost, latency, and agent attribution

### Usage & Billing
- **Dashboard widgets** — Fusion runs, weekly cost, success rate, avg latency, last run, 14-day spend trend
- **Usage view** — dedicated analytics page with daily breakdown table, spend-by-preset pie, top-agents-by-usage bar chart, dual-axis area chart for cost + tokens

### Production Hardening
- **Security headers** — X-Frame-Options, X-Content-Type-Options, X-XSS-Protection, Referrer-Policy, Permissions-Policy
- **CORS** — configurable allowed origins via `CORS_ORIGINS` env var (defaults to localhost + space-z.ai previews + vercel.app)
- **Rate limiting** — per-IP sliding window:
  - Fusion endpoints: 10 req/min
  - Webhook: 30 req/min
  - Other AI endpoints: 20 req/min
  - SSE streams: 30 req/min
  - Generic API: 100 req/min
- **Admin secret** — `/api/seed` is protected by `ADMIN_SECRET` env var in production (refuses to operate if not set)
- **Webhook secret** — `/api/fusion/webhook` requires `Authorization: Bearer <FUSION_WEBHOOK_SECRET>`
- **Request size limit** — 10 MB max for any request, 1 MB for Fusion runs
- **Input validation** — prompts capped at 32K chars, panel models at 8, Zod validation on chat
- **API key storage** — OpenRouter keys stored in the Setting table (DB), never returned to the client (only masked)
- **Per-team key isolation** — team keys only used for that team's agents
- **Health endpoint** — `/api/health` with database + memory checks (exempt from rate limiting)
- **Backup / restore** — `scripts/backup.sh` and `scripts/restore.sh` for SQLite + Prisma schema + sanitized env

## Quick start (Docker)

```bash
# 1. Set required env vars
cat > .env << EOF
DATABASE_URL=file:./db/production.db
ADMIN_SECRET=$(openssl rand -hex 32)
FUSION_WEBHOOK_SECRET=$(openssl rand -hex 32)
CORS_ORIGINS=https://your-domain.com,https://app.your-domain.com
EOF

# 2. Build & run
docker compose up -d --build

# 3. Check health
curl http://localhost:3000/api/health
```

## Quick start (dev)

```bash
# 1. Install deps
bun install

# 2. Set up DB
echo "DATABASE_URL=file:/home/z/my-project/db/custom.db" > .env
npx prisma db push
npx prisma generate

# 3. Run
bun run dev
```

## Configuration

### OpenRouter API key
1. Get a key at <https://openrouter.ai/keys>
2. Open the **Fusion** view in the sidebar
3. Click **Settings** → paste your key → **Save & Verify**

### Per-team keys (multi-tenant)
1. Create a Team in the **Teams** view
2. Use `POST /api/teams/{id}/key` with `{ "apiKey": "sk-or-v1-...", "verify": true }` to set a team-specific OpenRouter key
3. Any Fusion run linked to an agent in that team will automatically use the team key (overriding the global key)

### Agent model routing
Each agent has a `model` field (visible in the agent edit dialog). Options:
- `default` — use the bundled ZAI SDK (no OpenRouter cost)
- `openrouter/fusion` — always invoke multi-model deliberation via OpenRouter
- Any specific OpenRouter model slug (e.g. `~anthropic/claude-sonnet-latest`) — route chat through that model

When set to anything other than `default`, the chat endpoint automatically routes through OpenRouter using the appropriate key (team key if the agent is in a team with one, else global key).

### Cron-triggered Fusion
Create a cron job with:
- **Action:** `fusion`
- **Config:**
  ```json
  {
    "prompt": "Summarize today's top AI news and identify emerging trends.",
    "preset": "general-high",
    "agentId": "<optional-agent-id>",
    "saveMemory": true
  }
  ```

The result is automatically saved as a memory entry tagged `fusion,cron,auto-saved`.

### Webhook trigger
```bash
curl -X POST https://your-domain.com/api/fusion/webhook \
  -H "Authorization: Bearer $FUSION_WEBHOOK_SECRET" \
  -H "Content-Type: application/json" \
  -d '{
    "prompt": "Analyze the attached paper.",
    "preset": "general-high",
    "async": true
  }'
```

Response (async mode): `202 { "runId": "...", "status": "running" }` — poll `GET /api/fusion/runs/{runId}` for the result.

### Team debate
```bash
curl -X POST https://your-domain.com/api/teams/{teamId}/debate \
  -H "Content-Type: application/json" \
  -d '{ "prompt": "Should we ship feature X now or wait for Q4?" }'
```

Each agent in the team that has a non-default `model` field becomes a panel seat. The team's combined pinned memories provide RAG context.

## API reference

### Fusion
| Method | Path | Description |
|---|---|---|
| `POST` | `/api/fusion/run` | Start a Fusion run (rate-limited 10/min) |
| `GET` | `/api/fusion/run` | List recent runs (`?limit=50&agentId=...`) |
| `GET` | `/api/fusion/runs/{id}` | Fetch a single run with panel responses |
| `DELETE` | `/api/fusion/runs/{id}` | Delete a run |
| `GET` | `/api/fusion/runs/{id}/export?format=markdown\|json\|txt` | Export a run, persisted to `download/fusion/` |
| `POST` | `/api/fusion/stream` | SSE stream of a Fusion run |
| `POST` | `/api/fusion/ab` | A/B compare two presets/configs |
| `POST` | `/api/fusion/webhook` | External webhook trigger (auth required) |
| `GET` | `/api/fusion/models` | Live OpenRouter model availability (5-min cache) |

### Stats
| Method | Path | Description |
|---|---|---|
| `GET` | `/api/stats` | Core OS stats (agents, tasks, cron, etc.) |
| `GET` | `/api/stats/fusion` | Fusion spend, tokens, success rate, trends |

### Teams
| Method | Path | Description |
|---|---|---|
| `GET` | `/api/teams/{id}/key` | Check if team has an OpenRouter key (masked) |
| `POST` | `/api/teams/{id}/key` | Set/verify team OpenRouter key |
| `DELETE` | `/api/teams/{id}/key` | Remove team OpenRouter key |
| `POST` | `/api/teams/{id}/debate` | Trigger a team debate via Fusion |

### Skills
| Method | Path | Description |
|---|---|---|
| `POST` | `/api/skills/{id}/execute` | Execute a skill via Fusion; auto-increments usageCount + saves memory |

### Settings
| Method | Path | Description |
|---|---|---|
| `GET` | `/api/settings/openrouter` | Check global OpenRouter key (masked) |
| `POST` | `/api/settings/openrouter` | Set/verify global OpenRouter key |
| `DELETE` | `/api/settings/openrouter` | Remove global OpenRouter key |

### Health
| Method | Path | Description |
|---|---|---|
| `GET` | `/api/health` | DB + memory health (exempt from rate limit) |

## Backup & restore

```bash
# Backup
./scripts/backup.sh                    # → backups/hermes-backup-YYYYMMDD-HHMMSS.tar.gz
./scripts/backup.sh /path/to/output    # custom output dir

# Restore
./scripts/restore.sh backups/hermes-backup-20260101-120000.tar.gz
```

Backups include:
- SQLite database (`custom.db`, `.db-wal`, `.db-journal`)
- Prisma schema + migrations
- `download/` artifacts
- Sanitized `.env` (secrets redacted — re-enter manually after restore)

Retention: keeps the last 30 backups, prunes older ones automatically.

## Environment variables

| Variable | Required | Default | Description |
|---|---|---|---|
| `DATABASE_URL` | yes | — | Prisma datasource URL (`file:./db/production.db` for SQLite) |
| `ADMIN_SECRET` | prod | — | Protects `/api/seed`; auto-generated if missing in dev |
| `FUSION_WEBHOOK_SECRET` | prod | — | Protects `/api/fusion/webhook` |
| `CORS_ORIGINS` | no | localhost + space-z.ai | Comma-separated allowed origins |
| `NODE_ENV` | — | `development` | `production` enables strict checks |
| `PORT` | — | `3000` | Server port |

OpenRouter API keys are **not** in env vars — they live in the `Setting` table (managed via the UI or `/api/settings/openrouter`).

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    Next.js 16 App Router                     │
├─────────────────────────────────────────────────────────────┤
│  src/middleware.ts                                           │
│    Security headers, CORS, rate limiting, admin-secret gate  │
├─────────────────────────────────────────────────────────────┤
│  src/app/api/                                                │
│    fusion/   run | runs/[id] | runs/[id]/export | stream    │
│              ab | webhook | models                           │
│    teams/    [id]/key | [id]/debate                          │
│    skills/   [id]/execute                                    │
│    stats/    fusion                                          │
│    settings/ openrouter                                      │
│    (existing: agents, chat, cron, mcp, ...)                  │
├─────────────────────────────────────────────────────────────┤
│  src/lib/                                                    │
│    openrouter.ts          # Fusion client + key lookup      │
│    openrouter-constants.ts # Client-safe constants           │
│    rate-limit.ts          # In-memory rate limiter           │
│    cron-scheduler.ts      # Cron + fusion action             │
│    db.ts | store.ts | env.ts | ...                           │
├─────────────────────────────────────────────────────────────┤
│  Prisma (SQLite)                                             │
│    Agent | Team | Task | Memory | Conversation | Message     │
│    Automation | ActivityLog | Skill | Goal | Delegate        │
│    McpServer | Artifact | ArtifactVersion | CronJob          │
│    CronExecution | Setting | FusionRun | FusionPanelResponse │
├─────────────────────────────────────────────────────────────┤
│  External                                                    │
│    OpenRouter (Fusion + per-model chat)                      │
│    ZAI SDK (default chat + TTS + ASR)                        │
└─────────────────────────────────────────────────────────────┘
```

## Production checklist

Before going live:
- [ ] Set `ADMIN_SECRET` (32+ hex chars)
- [ ] Set `FUSION_WEBHOOK_SECRET` if using webhooks
- [ ] Set `CORS_ORIGINS` to your production domains
- [ ] Set `NODE_ENV=production`
- [ ] Add an OpenRouter API key via the Fusion → Settings UI
- [ ] Configure per-team keys if running multi-tenant
- [ ] Set up a daily cron on the host to run `./scripts/backup.sh`
- [ ] Test restore by running `./scripts/restore.sh` against a backup in a staging env
- [ ] Verify `/api/health` returns `healthy` after deploy
- [ ] Verify rate limits don't block legitimate traffic (check `429` responses in logs)
- [ ] Set up log aggregation (the container logs JSON to stdout)
- [ ] Configure reverse proxy (Caddyfile included) with TLS

## License

Private. See `LICENSE` if present.

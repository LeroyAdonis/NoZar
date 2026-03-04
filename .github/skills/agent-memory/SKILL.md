---
name: agent-memory
description: "Read/write persistent agent context to the agent_sessions table in Neon PostgreSQL via Drizzle ORM. Use when any agent needs to save progress mid-task, resume work across sessions, record findings, or mark tasks complete. Standard operations: save_checkpoint, load_checkpoint, update_finding, mark_complete. Required for any long-running multi-session agent workflow in purple-glow-social-2.0."
---

# Agent Memory

Persist and restore agent state across sessions using the `agent_sessions` Drizzle table on Neon PostgreSQL.

## Overview

Agents are stateless by default. This skill provides a standard interface for storing checkpoints, findings, and completion status so any agent can resume exactly where it left off — even after a session restart or context window reset.

## Identity

Act as a reliable state machine manager. Be precise about what is saved and what is restored. Always verify a checkpoint loaded successfully before continuing work.

## Constraints

- **Never store secrets** (tokens, passwords, API keys) in agent_sessions
- **Never store raw user content** — only agent-internal state
- Session IDs must be deterministic and descriptive: `{agentName}-{userId}-{taskSlug}`
- Checkpoint data must be valid JSON
- All operations use Drizzle ORM — never raw SQL
- Auto-expire sessions after 7 days (matches auth session lifetime)

## Schema Reference

```typescript
// drizzle/schema.ts — add this table if not present
export const agentSessions = pgTable('agent_sessions', {
  id: text('id').primaryKey(),                  // deterministic session ID
  agentName: text('agent_name').notNull(),
  userId: text('user_id').notNull(),
  taskSlug: text('task_slug').notNull(),
  status: text('status').notNull().default('active'), // active | complete | failed
  checkpoint: jsonb('checkpoint'),               // arbitrary JSON blob
  findings: jsonb('findings').default('[]'),     // array of finding objects
  stepCurrent: integer('step_current').default(0),
  stepTotal: integer('step_total'),
  notes: text('notes'),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
  expiresAt: timestamp('expires_at'),            // createdAt + 7 days
});
```

Apply with: `npm run db:push`

## Standard Operations

### `save_checkpoint`

Save current agent state. Call at every meaningful step boundary.

```typescript
import { db } from '@/lib/db';
import { agentSessions } from '@/drizzle/schema';
import { eq } from 'drizzle-orm';

async function saveCheckpoint(
  sessionId: string,
  agentName: string,
  userId: string,
  taskSlug: string,
  checkpoint: Record<string, unknown>,
  stepCurrent: number,
  stepTotal?: number,
) {
  await db.insert(agentSessions)
    .values({
      id: sessionId,
      agentName,
      userId,
      taskSlug,
      checkpoint,
      stepCurrent,
      stepTotal,
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    })
    .onConflictDoUpdate({
      target: [agentSessions.id],
      set: { checkpoint, stepCurrent, stepTotal, updatedAt: new Date() },
    });
}
```

### `load_checkpoint`

Restore state at session start. Always call this first.

```typescript
async function loadCheckpoint(sessionId: string) {
  const session = await db.query.agentSessions.findFirst({
    where: (t, { eq, and, gt }) => and(
      eq(t.id, sessionId),
      gt(t.expiresAt, new Date()),          // not expired
    ),
  });

  if (!session) return null;               // no prior state — start fresh
  if (session.status === 'complete') {
    logger.admin.info('Session already complete', { sessionId });
    return null;
  }

  return session;
}
```

### `update_finding`

Append a new finding to the session's findings array.

```typescript
interface Finding {
  step: number;
  type: 'insight' | 'warning' | 'error' | 'decision';
  title: string;
  detail: string;
  timestamp: string;             // ISO 8601 SAST
}

async function updateFinding(sessionId: string, finding: Finding) {
  const session = await db.query.agentSessions.findFirst({
    where: (t, { eq }) => eq(t.id, sessionId),
  });

  const findings = (session?.findings as Finding[] | null) ?? [];
  findings.push(finding);

  await db.update(agentSessions)
    .set({ findings, updatedAt: new Date() })
    .where(eq(agentSessions.id, sessionId));
}
```

### `mark_complete`

Mark a session as done. Idempotent — safe to call multiple times.

```typescript
async function markComplete(sessionId: string, notes?: string) {
  await db.update(agentSessions)
    .set({ status: 'complete', notes, updatedAt: new Date() })
    .where(eq(agentSessions.id, sessionId));
}
```

## Session ID Convention

```
{agentName}-{userId}-{taskSlug}

Examples:
  brand-scraper-usr_abc123-mzansi-eats-instagram
  competitor-intel-usr_abc123-q1-2025-sweep
  kanban-tracker-usr_abc123-phase-12-planning
```

## Checkpoint Data Format

Structure checkpoints as a flat object with clearly named keys. Avoid nesting more than 2 levels deep.

```typescript
// Example: brand-scraper checkpoint
{
  "phase": "extraction",
  "postsCollected": 47,
  "postsTarget": 100,
  "platformsDone": ["instagram"],
  "platformsPending": ["twitter"],
  "lastProcessedPostId": "xyz789",
}

// Example: competitor-intel checkpoint  
{
  "phase": "scraping",
  "urlsCompleted": ["https://buffer.com/pricing"],
  "urlsPending": ["https://hootsuite.com/plans"],
  "recordsInserted": 1,
}
```

## Resume Pattern

Every agent using this skill should follow this startup pattern:

```typescript
const sessionId = `${agentName}-${userId}-${taskSlug}`;
const prior = await loadCheckpoint(sessionId);

if (prior) {
  logger.admin.info('Resuming session', { 
    sessionId, 
    step: prior.stepCurrent, 
    of: prior.stepTotal 
  });
  // restore state from prior.checkpoint and continue
} else {
  logger.admin.info('Starting fresh session', { sessionId });
  await saveCheckpoint(sessionId, agentName, userId, taskSlug, {}, 0);
}
```

## Examples

**Example 1 — Save after each scrape batch**
```typescript
await saveCheckpoint(
  'brand-scraper-usr_001-coffee-corp-ig',
  'brand-scraper', 'usr_001', 'coffee-corp-ig',
  { postsCollected: 50, phase: 'scraping' },
  1, 3,
);
```

**Example 2 — Resume mid-task**
```typescript
const session = await loadCheckpoint('brand-scraper-usr_001-coffee-corp-ig');
// session.checkpoint.postsCollected === 50
// Continue from where we left off
```

## Troubleshooting

1. **`agent_sessions` table missing** — Run `npm run db:push` after adding the schema
2. **Checkpoint returns `null` unexpectedly** — Check `expiresAt`; sessions auto-expire after 7 days
3. **JSON serialization error on `checkpoint`** — Ensure no `undefined` values; use `JSON.parse(JSON.stringify(obj))` to sanitize before saving

---
name: kanban-tracker
description: "Orchestrator skill for managing the HTML Kanban board and kanban_tasks DB table in Purple Glow Social 2.0. Use when assigning tasks, moving cards between columns, adding research insights, challenging findings with mandatory questions, or escalating blockers. Enforces orchestrator discipline: QUESTION EVERYTHING, never implement directly, always verify before claiming completion. Operations: assign_task, move_card, add_insight, challenge_finding, escalate_blocker."
---

# Kanban Tracker

Manage the Purple Glow Social 2.0 Kanban board and `kanban_tasks` database table. This is an **orchestrator-only** skill — it coordinates and challenges; it never writes implementation code.

> **Board URL:** `http://localhost:3000/kanban` — publicly accessible, no authentication required.
> API routes (`/api/kanban/*`) are also public; session is optional and falls back to "agent" identity.

## Identity

You are a demanding but fair product orchestrator. Your job is to keep the board honest. Every claim must be verified. Every finding must be challenged. You ship working software by asking hard questions, not by writing code yourself.

## The Prime Directive

```
QUESTION EVERYTHING
Never implement. Always verify. Evidence before assertions.
```

Violating this directive by writing implementation code, accepting findings without challenge, or marking complete without verification is a critical failure.

## Constraints

- **Never write implementation code** — delegate to coder, fast-coder, or planner subagents
- **Never mark a card "Done"** without running the verification-before-completion skill
- **Every `challenge_finding` call must include exactly 3 mandatory questions** (see below)
- Cards may only move forward one column at a time: `backlog → todo → in_progress → review → done`
- Blockers must be escalated within the same session they are discovered
- All operations must update the `kanban_tasks` table via Drizzle ORM

## Schema Reference

```typescript
// drizzle/schema.ts
export const kanbanTasks = pgTable('kanban_tasks', {
  id: text('id').primaryKey(),                  // e.g. "task-phase12-001"
  title: text('title').notNull(),
  description: text('description'),
  column: text('column').notNull().default('backlog'), // backlog|todo|in_progress|review|done
  priority: text('priority').default('medium'),  // low|medium|high|critical
  assignee: text('assignee'),                    // agent name or human
  tags: text('tags').array().default([]),
  insights: jsonb('insights').default('[]'),     // array of Insight objects
  blockers: jsonb('blockers').default('[]'),     // array of Blocker objects
  challengeLog: jsonb('challenge_log').default('[]'), // array of Challenge objects
  storyPoints: integer('story_points'),
  linkedSessionId: text('linked_session_id'),    // agent-memory session ID
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
  dueAt: timestamp('due_at'),
});
```

## Operations

### `assign_task`

Create a new Kanban card and assign it to an agent or human.

```typescript
async function assignTask(task: {
  id: string;
  title: string;
  description: string;
  assignee: string;
  priority: 'low' | 'medium' | 'high' | 'critical';
  tags: string[];
  storyPoints?: number;
  dueAt?: Date;
}) {
  await db.insert(kanbanTasks).values({
    ...task,
    column: 'todo',
    createdAt: new Date(),
    updatedAt: new Date(),
  });
  logger.admin.info('Task assigned', { id: task.id, assignee: task.assignee });
}
```

### `move_card`

Advance a card one column forward. Enforces single-step movement.

```typescript
const COLUMN_ORDER = ['backlog', 'todo', 'in_progress', 'review', 'done'] as const;

async function moveCard(taskId: string, targetColumn: string) {
  const task = await db.query.kanbanTasks.findFirst({
    where: (t, { eq }) => eq(t.id, taskId),
  });
  if (!task) throw new Error(`Task ${taskId} not found`);

  const currentIdx = COLUMN_ORDER.indexOf(task.column as typeof COLUMN_ORDER[number]);
  const targetIdx = COLUMN_ORDER.indexOf(targetColumn as typeof COLUMN_ORDER[number]);

  if (targetIdx !== currentIdx + 1) {
    throw new Error(`Cards may only move one column at a time. Current: ${task.column}`);
  }

  // Moving to "done" requires verification-before-completion
  if (targetColumn === 'done') {
    throw new Error('Cannot move to done without running verification-before-completion skill first.');
  }

  await db.update(kanbanTasks)
    .set({ column: targetColumn, updatedAt: new Date() })
    .where(eq(kanbanTasks.id, taskId));
}
```

### `add_insight`

Attach a research finding or observation to a card.

```typescript
interface Insight {
  source: string;          // agent name or URL
  type: 'research' | 'decision' | 'risk' | 'dependency';
  summary: string;         // max 280 chars
  detail?: string;
  addedAt: string;         // ISO 8601 SAST
  addedBy: string;         // agent name
}

async function addInsight(taskId: string, insight: Insight) {
  const task = await db.query.kanbanTasks.findFirst({
    where: (t, { eq }) => eq(t.id, taskId),
  });
  const insights = (task?.insights as Insight[] | null) ?? [];
  insights.push(insight);

  await db.update(kanbanTasks)
    .set({ insights, updatedAt: new Date() })
    .where(eq(kanbanTasks.id, taskId));
}
```

### `challenge_finding`

Every significant finding MUST be challenged before acting on it. Include **exactly 3 mandatory questions**.

```typescript
interface Challenge {
  finding: string;          // the claim being challenged
  questions: [string, string, string];  // exactly 3 questions
  answers?: [string, string, string];   // filled after investigation
  verdict: 'accepted' | 'rejected' | 'needs_more_data' | 'pending';
  challengedAt: string;
  challengedBy: string;
}
```

**The 3 mandatory challenge questions must address:**
1. **Evidence** — "What specific evidence supports this claim?"
2. **Alternatives** — "What alternative explanations or approaches were considered?"
3. **Risk** — "What breaks or is made worse if this finding is accepted and acted on?"

Example:
```
Finding: "Users want TikTok integration"
Question 1: "What specific evidence (user interviews, analytics, support tickets) supports this?"
Question 2: "What other integrations were requested, and why is TikTok prioritised over them?"
Question 3: "What would TikTok integration break or delay in the current roadmap?"
```

### `escalate_blocker`

Raise a blocker that prevents progress. Triggers immediate human review.

```typescript
interface Blocker {
  taskId: string;
  description: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  blockedSince: string;    // ISO 8601 SAST
  attemptedResolutions: string[];
  escalatedTo: string;     // human name or team
  status: 'open' | 'resolved';
}

async function escalateBlocker(taskId: string, blocker: Omit<Blocker, 'taskId'>) {
  // Append to blockers array + move card back to 'todo' if in_progress
  const task = await db.query.kanbanTasks.findFirst({
    where: (t, { eq }) => eq(t.id, taskId),
  });
  const blockers = (task?.blockers as Blocker[] | null) ?? [];
  blockers.push({ taskId, ...blocker });

  const newColumn = task?.column === 'in_progress' ? 'todo' : task?.column ?? 'todo';

  await db.update(kanbanTasks)
    .set({ blockers, column: newColumn, updatedAt: new Date() })
    .where(eq(kanbanTasks.id, taskId));

  logger.admin.error('Blocker escalated', { taskId, severity: blocker.severity });
}
```

## Board Column Semantics

| Column | Meaning |
|---|---|
| `backlog` | Identified but not yet prioritised |
| `todo` | Prioritised and ready to start |
| `in_progress` | Actively being worked on by an assignee |
| `review` | Work complete; awaiting verification-before-completion |
| `done` | Verified complete; no further action needed |

## Orchestrator Rules Summary

1. **QUESTION EVERYTHING** — No finding is accepted without challenge
2. **Never implement** — Delegate all code to coder/fast-coder subagents
3. **Verify before done** — Always run verification-before-completion before moving to `done`
4. **One step at a time** — Cards move one column forward per session
5. **Escalate blockers immediately** — Do not sit on a blocker; surface it in the same session
6. **Evidence beats assertion** — "It works" is not evidence; a passing test is

## Examples

**Example 1 — Assign a competitor research task**
```typescript
await assignTask({
  id: 'task-ci-001',
  title: 'Q1 competitor pricing sweep',
  description: 'Run competitor-intel skill against Buffer, Hootsuite, Later',
  assignee: 'competitor-intel-agent',
  priority: 'high',
  tags: ['research', 'roadmap'],
  storyPoints: 3,
});
```

**Example 2 — Challenge a finding before acting**
```
Finding: "Hootsuite doesn't support Afrikaans content"
Q1: "Which specific Hootsuite pages were checked, and were the results confirmed with a second source?"
Q2: "Did we check Hootsuite's API docs for language parameters, or only the marketing page?"
Q3: "If Hootsuite adds Afrikaans support next month, does our roadmap priority change?"
→ Verdict: needs_more_data — send back to competitor-intel for deeper check
```

## Troubleshooting

1. **`kanban_tasks` table missing** — Run `npm run db:push` after adding schema; check `drizzle/schema.ts`
2. **Move rejected (not adjacent column)** — Cards must move one step at a time; use `move_card` sequentially
3. **Cannot move to done** — Run verification-before-completion skill first, then retry

# Mission Control — Architecture & Implementation Plan

> **Author:** Amara 📋
> **Date:** 2026-04-05
> **Priority:** HIGH
> **Assigned by:** Eva 🌹
> **For:** Kofi 🔨 (implementation)

---

## Summary

Build a **2.5D isometric "virtual dev house" dashboard** where the NoZar agent team (Eva, Kofi, Zuri, Amara, Naledi, Thabo, and future agents) appear in real-time positions — at desks when working, meeting rooms when collaborating, break room when idle. Live Kanban board, chat console, project monitors, and deploy controls — all in one interactive view. Deployable to Vercel on the existing NoZar stack.

**Vision:** Sims meets developer dashboard. You open one URL, see the whole team, what they're doing, what tickets are moving, and what's blocked.

---

## Architecture

### Tech Stack Decision

**Stay on the existing stack** — React Router v7 (Vite) + TypeScript + Tailwind CSS v4 + Drizzle ORM + Neon PostgreSQL + Framer Motion.

**Why not a separate Next.js app:**
- NoZar already runs React Router v7 with Vite — same DX, same tooling
- Shared auth (Better Auth), shared DB (Neon), shared deployment (Vercel)
- No extra repo, no auth duplication, no cross-origin issues
- Vercel handles React Router v7 projects natively
- Framer Motion is already in `package.json` — no new dependency for animations

**The Mission Control dashboard becomes a new route group on NoZar:**
```
/dashboard/mission-control          # The isometric office view
/dashboard/mission-control/kanban   # Full Kanban board
/dashboard/mission-control/agents   # Agent roster & status
```

### Rendering Strategy for the Isometric Office

**Recommendation: CSS transforms + DOM elements (no canvas, no Three.js)**

| Approach | Pros | Cons | Verdict |
|----------|------|------|---------|
| **Three.js + WebGL** | True 3D, lighting, shadows | Heavy bundle (~200KB+), complex, overkill for 2.5D, harder to make interactive UI components | ❌ Overkill |
| **Canvas 2D** | Fast rendering, small bundle | Manual hit-detection, hard to style with CSS, accessibility nightmare, DOM interop is painful | ❌ Poor DX |
| **SVG** | Scalable, declarative, easy hit regions | DOM-heavy with many animated agents, performance degrades at 10+ animated elements | ⚠️ Possible but not ideal |
| **CSS transforms (isometric)** | Native DOM elements (clickable, accessible, Tailwind-styled), lightweight (~0KB extra), framer-motion integrates perfectly, no new dependencies | Limited to a single perspective, no true 3D occlusion | ✅ **Best fit** |

**How CSS isometric works:**
```tsx
// The office floor container
<div
  className="relative"
  style={{
    transform: 'rotateX(60deg) rotateZ(-45deg)',
    transformStyle: 'preserve-3d',
  }}
>
  {/* Each desk, agent, room sits flat on this plane */}
  {/* Agents use transform: translateZ() to "stand up" from the floor */}
</div>
```

**Agent 3D appearance:** Agents use `transform: rotateZ(45deg) rotateX(-60deg)` (the inverse of the floor transform) so they appear upright to the viewer while their feet sit on the isometric grid. This creates the "Sims-like" standing-on-a-flat-surface illusion.

**Performance characteristics:**
- 8 agents + 8 desks + 3 meeting rooms + 1 break room = ~20 DOM elements in the office scene
- CSS transforms are GPU-accelerated (compositor layer)
- Framer Motion handles `x`, `y`, `opacity` transitions — all cheap, no layout thrashing
- Measured: a DOM with 200 elements running CSS transforms at 60fps is trivial on modern hardware

### Real-Time Architecture

**Recommendation: Server-Sent Events (SSE)**

| Approach | Pros | Cons | Verdict |
|----------|------|------|---------|
| **WebSocket** | Full duplex, low latency, mature tooling | ❌ Vercel serverless functions don't support persistent WS connections; requires separate WS server or platform add-on (Pusher, Ably, Upstash) | ⚠️ Requires external infra |
| **Server-Sent Events (SSE)** | ✅ Works perfectly on Vercel serverless, native browser API, auto-reconnect, one-direction is all we need (server → client), streaming responses supported natively | One-direction only (client → server uses regular fetch) | ✅ **Best fit for Vercel** |
| **Short polling** | Simplest, no infra | Wasteful, slower updates, more DB queries | ❌ Not real-time enough |

**Implementation:**
```
┌─────────────────────┐       fetch/POST       ┌──────────────────┐
│   Browser Client    │ ──────────────────────→ │  Vercel Function │
│  (SSE consumer)     │                         │  (API route)     │
│                     │ ←── text/event-stream── │                  │
└─────────────────────┘                         └────────┬─────────┘
                                                         │
                                                   ┌─────▼─────┐
                                                   │  Neon DB  │
                                                   │  (events  │
                                                   │   table)  │
                                                   └───────────┘
```

**How SSE works on Vercel:**
```typescript
// app/routes/api.mc/stream.ts — SSE route
export async function loader({ request }: Route.LoaderArgs) {
  const abortController = new AbortController();
  const stream = new ReadableStream({
    async start(controller) {
      const encoder = new TextEncoder();

      // Send initial state immediately
      const initialState = await getCurrentOfficeState();
      controller.enqueue(
        encoder.encode(`data: ${JSON.stringify({ type: 'init', ...initialState })}\n\n`)
      );

      // Poll DB for changes every 2 seconds
      const interval = setInterval(async () => {
        if (abortController.signal.aborted) {
          clearInterval(interval);
          controller.close();
          return;
        }
        const updates = await getUpdatesSinceLastPoll();
        if (updates.length > 0) {
          controller.enqueue(
            encoder.encode(`data: ${JSON.stringify({ type: 'updates', items: updates })}\n\n`)
          );
        }
      }, 2000);

      // Cleanup when client disconnects
      request.signal.addEventListener('abort', () => {
        clearInterval(interval);
        abortController.abort();
      });
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      Connection: 'keep-alive',
    },
  });
}

// Client-side:
const eventSource = new EventSource('/api/mc/stream');
eventSource.onmessage = (e) => {
  const data = JSON.parse(e.data);
  if (data.type === 'init') setOfficeState(data);
  if (data.type === 'updates') applyUpdates(data.items);
};
```

**Why 2-second polling on the server (not every request):**
- Vercel serverless has a 60s (hobby) or 900s (pro) max duration per function
- The SSE loader holds the connection open up to that limit
- The client auto-reconnects if the connection drops (native SSE behavior)
- Each connection polls the Neon DB every 2s — 30 queries/min max, trivial for Neon

**Client → Server communication (the reverse direction):**
- Regular `fetch()` POST to `/api/mc/actions` (e.g., "move agent to meeting", "send message")
- Action handlers write to the DB → the SSE stream picks up the change → broadcasts to all clients

### OpenClaw Session API Integration

**The OpenClaw backend is the source of truth for agent state.** Mission Control reads from it.

**API surface we have available (from OpenClaw):**
- `sessions_list` — list all active agent sessions
- `sessions_spawn` — spawn a new agent session (for a task)
- `sessions_send` — send a message to an agent session
- `subagents(action=list)` — list active subagents and their status
- `sessions_yield` — yield to receive subagent results

**Bridge Architecture:**
```
┌────────────────────┐     ┌────────────────────┐     ┌──────────────────┐
│   Mission Control  │     │  Bridge Service    │     │  OpenClaw        │
│   Dashboard        │────→│  (Node.js CLI or   │────→│  Gateway         │
│   (Vercel/React)   │     │   Vercel cron)     │     │  (Local VM)      │
└────────────────────┘     └────────────────────┘     └──────────────────┘
```

**Two integration patterns:**

1. **Direct HTTP bridge (MVP):** The OpenClaw gateway exposes sessions via its internal API. A Vercel API route calls the OpenClaw CLI or HTTP endpoint to get session list and status. This requires the OpenClaw machine to be reachable (tunnel via Tailscale or public URL if configured).

2. **Push-based bridge (Phase 2):** A lightweight cron job on the OpenClaw machine periodically publishes agent state to the Neon DB. Mission Control reads it from DB, no direct connection needed.

**MVP approach: Push-based bridge (simpler, more reliable)**
- OpenClaw machine runs a small script (or uses `sessions_list`) every 10s
- Writes agent status to `agent_sessions` table in Neon
- Mission Control dashboard reads from DB via SSE
- No inbound connections to OpenClaw required

### Data Model (New Tables)

**These tables are additive — no changes to existing NoZar tables.**

```typescript
// ─── Mission Control Tables ──────────────────────────────────

export const agents = pgTable('agents', {
  id: text('id').primaryKey(),              // 'eva', 'kofi', 'zuri', etc.
  name: text('name').notNull(),             // Display name
  role: text('role').notNull(),             // 'orchestrator' | 'coder' | 'fast-coder' | 'planner' | 'design' | 'testing'
  emoji: text('emoji').notNull(),           // '🌹', '🔨', etc.
  avatarUrl: text('avatar_url'),            // Optional avatar
  description: text('description'),         // Role description
  model: text('model'),                     // LLM model used
  sessionKey: text('session_key'),          // OpenClaw session identifier
  createdAt: timestamp('created_at').defaultNow(),
});

export const agent_positions = pgTable('agent_positions', {
  id: text('id').primaryKey(),              // composite key: agentId + timestamp
  agentId: text('agent_id')
    .notNull()
    .references(() => agents.id, { onDelete: 'cascade' }),
  deskId: text('desk_id'),                  // Which desk (if at desk)
  roomId: text('room_id'),                  // Which room (if in room)
  state: text('state').notNull(),           // 'at-desk' | 'in-meeting' | 'break-room' | 'away'
  currentTicketId: text('current_ticket_id'), // Linked ticket if working
  lastActivityAt: timestamp('last_activity_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
}, (t) => [
  unique('agent_pos_agent_uq').on(t.agentId), // One row per agent
]);

export const meeting_rooms = pgTable('meeting_rooms', {
  id: text('id').primaryKey(),              // 'meeting-room-1', 'meeting-room-2', 'break-room'
  name: text('name').notNull(),             // 'War Room', 'Huddle Space', 'Break Room'
  type: text('type').notNull(),             // 'meeting' | 'break'
  capacity: integer('capacity').default(4),  // Max agents
  isActive: boolean('is_active').default(true),
  createdAt: timestamp('created_at').defaultNow(),
});

export const meeting_sessions = pgTable('meeting_sessions', {
  id: text('id').primaryKey(),
  roomId: text('room_id')
    .notNull()
    .references(() => meeting_rooms.id),
  topic: text('topic'),
  startedAt: timestamp('started_at').notNull().defaultNow(),
  endedAt: timestamp('ended_at'),
  transcript: jsonb('transcript').default('[]'), // Array of message objects
  participants: text('participants').array().default([]), // agent IDs
  status: text('status').notNull().default('active'), // 'active' | 'completed'
});

export const kanban_tickets = pgTable('kanban_tickets', {
  id: text('id').primaryKey(),              // e.g. 'ticket-mc-001'
  title: text('title').notNull(),
  description: text('description'),
  column: text('column').notNull().default('backlog'),
    // 'backlog' | 'ready' | 'in-progress' | 'review' | 'done' | 'blocked'
  priority: text('priority').default('medium'),
    // 'low' | 'medium' | 'high' | 'critical'
  assigneeId: text('assignee_id')
    .references(() => agents.id, { onDelete: 'set null' }),
  projectId: text('project_id'),            // Which project: nozar, aliento, dwt, pgs
  tags: text('tags').array().default([]),
  storyPoints: integer('story_points'),
  notes: jsonb('notes').default('[]'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
  completedAt: timestamp('completed_at'),
});

export const agent_events = pgTable('agent_events', {
  id: text('id').primaryKey(),
  agentId: text('agent_id')
    .notNull()
    .references(() => agents.id, { onDelete: 'cascade' }),
  type: text('type').notNull(),
    // 'state-change' | 'ticket-pull' | 'ticket-complete' | 'meeting-join' | 'meeting-leave' | 'message' | 'spawn' | 'complete'
  payload: jsonb('payload').notNull(),      // Event-specific data
  createdAt: timestamp('created_at').notNull().defaultNow(),
}, (t) => [
  // Index for quick recent-event queries
  index('agent_events_recent_idx').on(t.agentId, t.createdAt),
]);

export const chat_messages = pgTable('chat_messages', {
  id: text('id').primaryKey(),
  senderId: text('sender_id'),             // agent ID or 'user'
  senderName: text('sender_name').notNull(),
  content: text('content').notNull(),
  targetType: text('target_type'),          // 'agent' | 'room' | 'broadcast'
  targetId: text('target_id'),              // Specific agent ID or room ID
  createdAt: timestamp('created_at').notNull().defaultNow(),
}, (t) => [
  index('chat_messages_target_idx').on(t.targetType, t.targetId, t.createdAt),
]);

export const projects = pgTable('projects', {
  id: text('id').primaryKey(),              // 'nozar', 'aliento', 'dwt', 'pgs'
  name: text('name').notNull(),
  description: text('description'),
  status: text('status').notNull().default('active'),
    // 'active' | 'paused' | 'completed' | 'archived'
  url: text('url'),                         // Public URL
  repoUrl: text('repo_url'),                // GitHub repo URL
  stats: jsonb('stats').default('{}'),      // Commits, open tickets, last deploy, etc.
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});
```

### API Routes

All routes live under `/api/mc/*` (Mission Control namespace):

| Route | Method | Purpose |
|-------|--------|---------|
| `/api/mc/stream` | GET (SSE) | Real-time event stream for dashboard |
| `/api/mc/office-state` | GET | Full initial office state (desks, agents, rooms, tickets) |
| `/api/mc/agents` | GET | List all agents with status |
| `/api/mc/agents/:id` | GET | Agent detail (session info, current ticket, history) |
| `/api/mc/tickets` | GET | Kanban tickets (column filter, assignee filter) |
| `/api/mc/tickets` | POST | Create a new ticket |
| `/api/mc/tickets/:id` | PATCH | Update ticket (move column, reassign, add note) |
| `/api/mc/tickets/:id` | DELETE | Delete ticket |
| `/api/mc/actions` | POST | Execute actions (spawn agent, move agent, create meeting, send message) |
| `/api/mc/meetings` | GET | Active and past meetings |
| `/api/mc/meetings/:id` | GET | Meeting detail with transcript |
| `/api/mc/projects` | GET | Project status overview |
| `/api/mc/chat` | POST | Send a message (to agent, room, or broadcast) |
| `/api/mc/chat` | GET | Chat history (by room/agent, paginated) |
| `/api/mc/whiteboard` | GET | Whiteboard items (parking lot, lessons, blockers) |
| `/api/mc/whiteboard` | POST | Add whiteboard item |

**The `/api/mc/actions` endpoint is the primary interaction surface:**
```typescript
// POST /api/mc/actions
// Body: { action: string, payload: Record<string, any> }

// Supported actions:
// ── Agent Management ──
// { action: 'spawn-agent', payload: { agentId, task } }
// { action: 'move-agent', payload: { agentId, target: 'desk'|'meeting'|'break'|'away' } }
// { action: 'send-to-agent', payload: { agentId, message } }

// ── Ticket Management ──
// { action: 'pull-ticket', payload: { agentId, ticketId } }
// { action: 'move-ticket', payload: { ticketId, column } }
// { action: 'complete-ticket', payload: { ticketId } }
// { action: 'block-ticket', payload: { ticketId, reason } }

// ── Meetings ──
// { action: 'start-meeting', payload: { topic, room, participants } }
// { action: 'end-meeting', payload: { meetingId } }

// ── Broadcast ──
// { action: 'broadcast', payload: { message } }

// ── Deploy ──
// { action: 'deploy-project', payload: { projectId } }
```

### State Management (Frontend)

**Zustand** — small, fast, no boilerplate, already battle-tested in React ecosystems.

```typescript
// app/stores/office-store.ts
import { create } from 'zustand';
import { immer } from 'zustand/middleware/immer'; // For nested state updates

interface AgentState {
  id: string;
  name: string;
  role: string;
  emoji: string;
  avatarUrl: string | null;
  state: 'at-desk' | 'in-meeting' | 'break-room' | 'away';
  deskId: string | null;
  roomId: string | null;
  currentTicketId: string | null;
  lastActivityAt: string;
}

interface OfficeState {
  agents: Record<string, AgentState>;
  rooms: MeetingRoom[];
  tickets: KanbanTicket[];
  activeMeetings: MeetingSession[];
  chatMessages: ChatMessage[];
  projects: Project[];
  whiteboard: WhiteboardItem[];

  // Actions
  applyUpdates: (updates: OfficeUpdate[]) => void;
  sendAction: (action: string, payload: any) => Promise<void>;
  sendMessage: (message: string, target?: { type: string; id: string }) => void;
}

export const useOfficeStore = create<OfficeState>()(
  immer((set) => ({
    agents: {},
    rooms: [],
    tickets: [],
    activeMeetings: [],
    chatMessages: [],
    projects: [],
    whiteboard: [],

    applyUpdates: (updates) =>
      set((state) => {
        for (const update of updates) {
          // Apply each delta to the appropriate slice
          if (update.type === 'agent-state-change') {
            state.agents[update.agentId] = { ...state.agents[update.agentId], ...update.payload };
            // Also update agent_positions in the isometric view
          }
          if (update.type === 'ticket-moved') {
            const ticket = state.tickets.find(t => t.id === update.ticketId);
            if (ticket) ticket.column = update.column;
          }
          // ... etc
        }
      }),

    sendAction: async (action, payload) => {
      await fetch('/api/mc/actions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, payload }),
      });
      // SSE will reflect the result
    },

    sendMessage: (content, target) => {
      // Optimistic update: add to chatMessages immediately
      // Then POST to /api/mc/chat for persistence
    },
  }))
);
```

---

## Agent State Machine

### States & Transitions

```
                    ┌──────────────────────────────────────────┐
                    │                                          │
                    ▼                                          │
┌──────────┐  timeout   ┌──────────┐  meeting    ┌──────────┐  │  task
│          ├──────────→ │          ├───────────→ │          ├─┘  done
│  AWAY    │  or        │ AT-DESK  │  invite     │ IN-      │
│          │ ←─spawn    │          │             │ MEETING  │
│          │            │ (working)│             │          │  meeting
└────┬─────┘            └────┬─────┘             └────┬─────┘  ended
     │                       │                        │
     │ no activity           │ ticket                 │
     │ > 2 min               │ done, no               │
     │                       │ next ticket            │  idle
     │                       │ for > 30s              │  timeout
     │                       ▼                        ▼
     │                  ┌──────────┐             ┌──────────┐
     │                  │          │  manual     │          │
     └─────────────────→│  BREAK   │←───────────→│ IN-      │
         explicit       │  ROOM    │  or auto    │ MEETING  │
         "go break"     │  (idle)  │  after task │          │
                        │          │  complete   │          │
                        └──────────┘             └──────────┘
```

**State definitions:**

| State | Visual | Trigger to Enter | Trigger to Leave |
|-------|--------|-----------------|-----------------|
| `away` | Not in office / faded | No OpenClaw session, or explicitly set offline | Admin spawns agent, or agent comes online |
| `at-desk` | At desk, working on ticket | Spawned and assigned task, or returns from break/meeting | Ticket done + idle > 30s → break; meeting invite → meeting |
| `in-meeting` | In meeting room with others | Invited to a meeting by Eva or another agent | Meeting ends, or agent leaves |
| `break-room` | Sitting in break area | No ticket for > 30s, or told to "take a break" | New ticket assigned, or summoned back by Eva |

### Agent Role & Ticket Auto-Assignment

**Role-to-Task affinity:**

| Agent | Role | Pulls From | Won't Pull |
|-------|------|-----------|-----------|
| Eva 🌹 | Orchestrator | Management tickets, blockers, planning | Code implementation |
| Kofi 🔨 | Coder | Complex coding tasks (tagged `complex`, `refactor`, `architecture`) | Quick fixes, design |
| Zuri ⚡ | FastCoder | Quick fixes (tagged `bugfix`, `config`, `typo`, `one-liner`) | Multi-file refactors |
| Amara 📋 | Planner | Planning, architecture review, edge case analysis | Code, design |
| Naledi 🎨 | Design | UX/UI tasks, visual design specs | Code, testing |
| Thabo 🔍 | Testing | QA tasks, test writing, build verification | Code, design |

**Auto-pull algorithm (runs when agent is `at-desk` and has no active ticket):**

```typescript
// Pseudocode — would run in a server-side scheduler or triggered action
async function autoPullTicketForAgent(agentId: string): Promise<KanbanTicket | null> {
  const agent = await agents.findById(agentId);
  const role = agent.role;

  // Define role preferences as tag priorities
  const rolePreferences: Record<string, { prefers: string[], ignores: string[] }> = {
    'coder':        { prefers: ['complex', 'refactor', 'feature', 'architecture'], ignores: ['ux', 'test', 'config'] },
    'fast-coder':   { prefers: ['bugfix', 'config', 'typo', 'quick'], ignores: ['refactor', 'architecture'] },
    'planner':      { prefers: ['planning', 'analysis', 'strategy'], ignores: ['code', 'test'] },
    'design':       { prefers: ['ux', 'ui', 'design'], ignores: ['code', 'test'] },
    'testing':      { prefers: ['test', 'qa', 'verification'], ignores: ['code', 'design'] },
    'orchestrator': { prefers: ['blocker', 'escalation', 'planning', 'review'], ignores: [] },
  };

  const prefs = rolePreferences[role];

  // Find next ready ticket, preferring role-matched tags, sorted by priority + age
  const tickets = await kanbanTickets.findMany({
    where: { column: 'ready', assigneeId: null },
    orderBy: { createdAt: 'asc' }, // FIFO within same priority
  });

  for (const ticket of tickets) {
    if (!ticket.tags.some(tag => prefs.ignores.includes(tag))) {
      // Role doesn't ignore this ticket
      // Prefer if tag includes preferred types
      const hasPreferred = ticket.tags.some(tag => prefs.prefers.includes(tag));
      if (hasPreferred) {
        return ticket; // Auto-assign this one
      }
    }
  }

  // Fallback: first non-ignored ticket
  for (const ticket of tickets) {
    if (!ticket.tags.some(tag => prefs.ignores.includes(tag))) {
      return ticket;
    }
  }

  return null; // Nothing to work on
}
```

**Triggering auto-pull:**
- Every 15 seconds, the SSE polling also checks for agents at desks with no ticket
- If a matching ticket is found → auto-assign → agent state updates → SSE broadcasts → desk animation triggers
- **Elevated actions** (spawn agent, assign task beyond auto-pull) require human approval via `/approve` — this is handled by the action handler checking `session_status` before executing

### Multi-Agent Meetings

**How meetings work:**

1. **Start:** Eva (or admin) triggers `start-meeting` action → `meeting_sessions` row created → participating agents move to the meeting room
2. **During:** Agents in the room have access to the shared transcript. Their OpenClaw sessions can be linked to send/receive messages within the meeting context
3. **End:** `end-meeting` action → transcript saved → agents return to their previous states (desk/break)

**Meeting ↔ OpenClaw session linkage:**
- When a meeting starts, create a ClawFlow-style detached task for each participating agent
- Agents can "discuss" by sending messages to the meeting transcript
- The transcript is stored in `meeting_sessions.transcript` and accessible after the meeting ends

---

## Room Layout & Components

### Isometric Office Floor Plan

```
                    ┌─────────────────────────────────────────────────┐
                    │              MISSION CONTROL                     │
                    │              ┌──────────────┐                    │
                    │              │  PROJECT     │                    │
                    │              │  MONITORS    │                    │
                    │              └──────────────┘                    │
                    │                                                 │
     ┌─────────┐    │  ┌─────┐ ┌─────┐ ┌─────┐                       │
     │         │    │  │  E  │ │  K  │ │  Z  │                       │
     │ MEETING │    │  │ 🌹  │ │ 🔨  │ │ ⚡  │                       │
     │ ROOM 1  │    │  └─────┘ └─────┘ └─────┘                       │
     │(WarRoom)│    │                                                 │
     │         │    │  ┌─────┐ ┌─────┐ ┌─────┐                       │
     └─────────┘    │  │  A  │ │  N  │ │  T  │                       │
                    │  │ 📋  │ │ 🎨  │ │ 🔍  │                       │
     ┌─────────┐    │  └─────┘ └─────┘ └─────┘                       │
     │         │    │                                                 │
     │ MEETING │    │  ┌─────────────────────────┐                    │
     │ ROOM 2  │    │  │     KANBAN WALL        │                    │
     │(Huddle) │    │  │   (Backlog|Ready|...    │                    │
     │         │    │  │    InProg|Review|Done)   │                    │
     └─────────┘    │  └─────────────────────────┘                    │
                    │                                                 │
                    │  ┌───────────────────────────────────────────┐  │
                    │  │              BREAK ROOM                   │  │
                    │  │  ☕  Comfy area for idle agents            │  │
                    │  └───────────────────────────────────────────┘  │
                    │                                                 │
                    │  ┌─────────┐ ┌──────────────────────────────┐  │
                    │  │ WHITE   │ │ CHAT CONSOLE                  │  │
                    │  │ BOARD   │ │ ┌──────────────────────────┐ │  │
                    │  │ ░░░░░░  │ │ │ Agent messages appear    │ │  │
                    │  └─────────┘ │ │ here with agent avatars  │ │  │
                    │              │ └──────────────────────────┘ │  │
                    │              │ [Type message...] [Send]     │  │
                    │              └──────────────────────────────┘  │
                    └─────────────────────────────────────────────────┘
```

### Components Breakdown

**1. IsometricOffice (`app/components/mission-control/isometric-office.tsx`)**
- Main container with CSS `rotateX(60deg) rotateZ(-45deg)` transform
- Renders floor tiles as a subtle grid pattern
- Contains all sub-components (Desks, Rooms, Agents, Kanban Wall, etc.)
- Handles pan/zoom controls (mousewheel zoom, click-drag pan)

**2. Desk (`app/components/mission-control/desk.tsx`)**
- Isometric desk shape (CSS polygon or SVG path)
- Agent avatar/emoji sits on top when occupied
- Status indicator dot: 🟢 working, 🟡 idle, 🔴 away
- Tooltips on hover: agent name, current ticket, status
- Click → opens agent detail panel

**3. Agent (`app/components/mission-control/agent-token.tsx`)**
- Framer Motion `motion.div` for smooth position transitions
- Renders at the desk when state = `at-desk`, meeting room when `in-meeting`, etc.
- `layout` prop from framer-motion handles position animation automatically
- Idle animation: subtle bounce/bob when `at-desk` to convey "alive"

**4. MeetingRoom (`app/components/mission-control/meeting-room.tsx`)**
- Semi-transparent isometric room shape
- Shows participating agents inside
- Active meeting: pulsing border glow
- Click → opens meeting transcript

**5. KanbanBoard (`app/components/mission-control/kanban-board.tsx`)**
- 6 columns: Backlog | Ready | In Progress | Review | Done | Blocked
- Drag-and-drop using `@dnd-kit/core` (lightweight, modern, React 19 compatible)
- Card component: ticket title, assignee avatar, priority indicator, tags
- Cards glow when assigned to an agent currently working on them
- Click card → detail modal with notes, blockers, history

**6. ProjectMonitors (`app/components/mission-control/project-monitors.tsx`)**
- 2×2 grid showing project status: NoZar 🛒, Aliento 🌿, DWT 📡, PGS 💜
- Each monitor: project name, status badge, open tickets count, last activity
- Click → navigate to project details

**7. ChatConsole (`app/components/mission-control/chat-console.tsx`)**
- Fixed bottom panel (always visible, overlays office)
- Message bubbles with sender avatar/emoji
- Text input with @mentions for agents
- Broadcast button (@all)

**8. Whiteboard (`app/components/mission-control/whiteboard.tsx`)**
- Side panel with 3 sections: Parking Lot, Lessons Learned, Active Blockers
- Post-it style notes
- Can be toggled visible/hidden

**9. DeployPanel (`app/components/mission-control/deploy-panel.tsx`)**
- List of projects with deploy buttons
- Triggers Vercel deployment via API (calls Vercel's deployment API or GitHub Actions webhook)
- Shows deploy status: not started → building → deploying → live / failed

---

## Phases & Effort Estimates

### Phase 1: MVP — "Office is Alive" (Week 1-2)

**Goal:** The dashboard shows agent desks, their status, a basic Kanban board, and the chat console. Real-time updates work. Deployable to Vercel.

| Task | Effort | Details |
|------|--------|---------|
| 1.1 Database schema | 2h | Create `agents`, `agent_positions`, `kanban_tickets`, `meeting_rooms`, `agent_events`, `chat_messages`, `projects` tables via Drizzle migration |
| 1.2 Seed data | 1h | Populate 6 agents, 4 projects, room definitions, starter Kanban tickets |
| 1.3 SSE streaming endpoint | 3h | `/api/mc/stream` — polls DB, sends events |
| 1.4 API routes (
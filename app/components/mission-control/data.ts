/* ── Seed data for the isometric office ──────────────────── */

export interface Agent {
  id: string;
  name: string;
  emoji: string;
  role: string;
  state: 'at-desk' | 'in-meeting' | 'break-room' | 'away';
  task?: string;
}

export interface Room {
  id: string;
  name: string;
  type: 'meeting' | 'break';
  occupied: boolean;
  x: number;
  y: number;
  w: number;
  h: number;
}

export interface Ticket {
  id: string;
  title: string;
  column: 'backlog' | 'ready' | 'in-progress' | 'review' | 'done' | 'blocked';
  priority: 'low' | 'medium' | 'high' | 'critical';
  assignee?: string;
}

export interface Project {
  id: string;
  name: string;
  status: 'healthy' | 'warning' | 'critical';
  lastDeploy: string;
}

/* ── Agents ──────────────────────────────────────────────── */
export const AGENTS: Agent[] = [
  { id: 'eva',    name: 'Eva',    emoji: '🌹', role: 'Orchestrator',  state: 'at-desk',    task: 'Coordinating Phase 1 launch' },
  { id: 'kofi',   name: 'Kofi',   emoji: '🔨', role: 'Coder',         state: 'at-desk',    task: 'Building isometric views' },
  { id: 'zuri',   name: 'Zuri',   emoji: '⚡', role: 'FastCoder',      state: 'at-desk',    task: 'Quick config fixes' },
  { id: 'amara',  name: 'Amara',  emoji: '📋', role: 'Planner',        state: 'in-meeting', task: 'Architecture review' },
  { id: 'naledi', name: 'Naledi', emoji: '🎨', role: 'Design',         state: 'at-desk',    task: 'Visual design refinements' },
  { id: 'thabo',  name: 'Thabo',  emoji: '🔍', role: 'Testing',        state: 'at-desk',    task: 'Writing E2E tests' },
  { id: 'lebo',   name: 'Lebo',   emoji: '✍️', role: 'Writer',         state: 'away' },
  { id: 'kaya',   name: 'Kaya',   emoji: '📱', role: 'Mobile',         state: 'break-room', task: '' },
];

/* ── Desk Layout (px positions on the isometric plane) ───── */
/*
 * 6 desk positions in a 3×2 grid, starting at (220, 120)
 * Meeting rooms on the left (x: 20, y: 80 and 180)
 * Kanban wall at bottom-right
 * Break room at bottom-left
 * Project monitors at top-right
 */
export const DESK_LAYOUT: Record<string, { x: number; y: number }> = {
  // Agent desks (3-wide × 2 rows)
  eva:    { x: 220, y: 100 },
  kofi:   { x: 350, y: 100 },
  zuri:   { x: 480, y: 100 },
  amara:  { x: 220, y: 230 },
  naledi:  { x: 350, y: 230 },
  thabo:   { x: 480, y: 230 },

  // Kanban wall
  kanbanWall: { x: 220, y: 380 },

  // Project monitors
  projectWall: { x: 430, y: 15 },

  // Break room
  breakRoom: { x: 20, y: 440 },
};

/* ── Rooms ───────────────────────────────────────────────── */
export const ROOMS: Room[] = [
  { id: 'imbizo',   name: '🔥 Imbizo (War Room)', type: 'meeting', occupied: true,      x: 20,  y: 80,  w: 150, h: 80 },
  { id: 'lekgotla', name: '💬 Lekgotla (Huddle)', type: 'meeting', occupied: false,     x: 20,  y: 190, w: 150, h: 80 },
  { id: 'break',    name: '☕ Break Room',         type: 'break',   occupied: true,      x: 20,  y: 440, w: 140, h: 80 },
];

/* ── Kanban Tickets (seeder data) ────────────────────────── */
export const TICKETS: Ticket[] = [
  { id: 'mc-001', title: 'Isometric office view',          column: 'in-progress', priority: 'critical', assignee: 'kofi' },
  { id: 'mc-002', title: 'Agent desk components',          column: 'in-progress', priority: 'high',     assignee: 'kofi' },
  { id: 'mc-003', title: 'SSE real-time stream',           column: 'backlog',     priority: 'high',     assignee: 'amara' },
  { id: 'mc-004', title: 'Kanban drag-and-drop',           column: 'ready',       priority: 'medium',   assignee: 'kofi' },
  { id: 'mc-005', title: 'Meeting room glass effect',      column: 'backlog',     priority: 'low',      assignee: 'naledi' },
  { id: 'mc-006', title: 'Agent state machine',            column: 'review',      priority: 'high',     assignee: 'amara' },
  { id: 'mc-007', title: 'Responsive mobile layout',       column: 'ready',       priority: 'medium',   assignee: 'naledi' },
  { id: 'mc-008', title: 'E2E test suite',                 column: 'backlog',     priority: 'medium',   assignee: 'thabo' },
  { id: 'mc-009', title: 'Chat console UI',                column: 'backlog',     priority: 'low' },
  { id: 'mc-010', title: 'Fix login loading spinner',      column: 'done',        priority: 'medium',   assignee: 'zuri' },
];

/* ── Projects ────────────────────────────────────────────── */
export const PROJECTS: Project[] = [
  { id: 'nozar',   name: 'NoZar',   status: 'healthy',  lastDeploy: '2h ago' },
  { id: 'aliento', name: 'Aliento', status: 'warning',  lastDeploy: '1d ago' },
  { id: 'dwt',     name: 'DWT',     status: 'critical', lastDeploy: '3d ago' },
  { id: 'pgs',     name: 'PGS',     status: 'healthy',  lastDeploy: '5h ago' },
];

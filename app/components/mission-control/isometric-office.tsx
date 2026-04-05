import { useState } from 'react';
import { motion } from 'framer-motion';
import { Desk } from './desk';
import { MeetingRoom } from './meeting-room';
import { BreakRoom } from './break-room';
import { KanbanWall } from './kanban-wall';
import { ProjectWall } from './project-wall';
import { FloatingParticles } from './particles';
import { AGENTS, ROOMS, DESK_LAYOUT, TICKETS, PROJECTS } from './data';
import './isometric.css';

export function IsometricOffice() {
  const [hoveredAgent, setHoveredAgent] = useState<string | null>(null);

  return (
    <div className="mc-scene">
      {/* Ambient background */}
      <div className="mc-ambient-layer" />
      <div className="mc-scanlines" />
      <FloatingParticles />

      {/* Title */}
      <motion.div
        className="mc-title"
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8, ease: 'easeOut' }}
      >
        <h1>Mission Control</h1>
        <div className="subtitle">NoZar · Command Center</div>
      </motion.div>

      {/* Isometric floor */}
      <motion.div
        className="mc-floor"
        initial={{ opacity: 0, scale: 0.85 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 1, ease: 'easeOut' }}
      >
        {/* Floor tiles */}
        {RENDER_FLOOR_TILES}

        {/* Meeting rooms (left side) */}
        {ROOMS.filter(r => r.type === 'meeting').map(room => (
          <MeetingRoom
            key={room.id}
            room={room}
            style={{ left: room.x, top: room.y, width: room.w, height: room.h }}
          />
        ))}

        {/* Agent desks */}
        {AGENTS.map((agent, i) => {
          const pos = DESK_LAYOUT[agent.id];
          if (!pos) return null;
          return (
            <motion.div
              key={agent.id}
              initial={{ opacity: 0, translateZ: -20 }}
              animate={{
                opacity: agent.state === 'away' ? 0.35 : 1,
                translateZ: agent.state === 'away' ? -20 : 30,
              }}
              transition={{
                duration: 0.6,
                delay: 0.15 * i,
                ease: 'easeOut',
              }}
              onHoverStart={() => setHoveredAgent(agent.name)}
              onHoverEnd={() => setHoveredAgent(null)}
            >
              <Desk
                agent={agent}
                pos={{ left: pos.x, top: pos.y }}
              />
            </motion.div>
          );
        })}

        {/* Kanban wall */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.6, delay: 0.5 }}
          style={{ left: DESK_LAYOUT.kanbanWall.x, top: DESK_LAYOUT.kanbanWall.y }}
        >
          <KanbanWall tickets={TICKETS} />
        </motion.div>

        {/* Project monitors */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.6, delay: 0.6 }}
          style={{
            left: DESK_LAYOUT.projectWall.x,
            top: DESK_LAYOUT.projectWall.y,
          }}
        >
          <ProjectWall projects={PROJECTS} />
        </motion.div>

        {/* Break room */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.6, delay: 0.7 }}
          style={{ left: DESK_LAYOUT.breakRoom.x, top: DESK_LAYOUT.breakRoom.y }}
        >
          <BreakRoom room={ROOMS.find(r => r.type === 'break')!} />
        </motion.div>
      </motion.div>

      {/* Bottom nav */}
      <motion.div
        className="mc-nav"
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, delay: 1, ease: 'easeOut' }}
      >
        <button className="mc-nav-btn mc-nav-btn--active">🏠 Office</button>
        <button className="mc-nav-btn">📋 Kanban</button>
        <button className="mc-nav-btn">💬 Chat</button>
        <button className="mc-nav-btn">📊 Projects</button>
      </motion.div>
    </div>
  );
}

/* ── Floor tile generation ──────────────────────────────── */
const TILE = 60;
const GRID_ROWS = 12;
const GRID_COLS = 12;
const gridTiles: React.ReactElement[] = [];

for (let r = 0; r < GRID_ROWS; r++) {
  for (let c = 0; c < GRID_COLS; c++) {
    gridTiles.push(
      <div
        key={`tile-${r}-${c}`}
        className="mc-floor-tile"
        style={{
          left: c * TILE,
          top: r * TILE,
          width: TILE,
          height: TILE,
        }}
      />
    );
  }
}

// Accent lines (Ndebele-inspired)
gridTiles.push(
  <div
    key="accent-row-1"
    className="mc-floor-accent"
    style={{ left: 0, top: 300, width: 720, height: 2 }}
  />,
  <div
    key="accent-row-2"
    className="mc-floor-accent"
    style={{ left: 300, top: 0, width: 2, height: 720 }}
  />
);

const RENDER_FLOOR_TILES = gridTiles;

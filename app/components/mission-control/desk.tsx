import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import type { Agent } from './data';

interface DeskProps {
  agent: Agent;
  pos: { left: number; top: number };
}

const statusMap: Record<Agent['state'], string> = {
  'at-desk':    'mc-agent-status--working',
  'in-meeting': 'mc-agent-status--meeting',
  'break-room': 'mc-agent-status--break',
  'away':       'mc-agent-status--away',
};

/* Inline style vars for leaf sway */
const leafStyle = (start: string, end: string): React.CSSProperties => ({
  ['--sway-start' as string]: start,
  ['--sway-end' as string]: end,
});

export function Desk({ agent, pos }: DeskProps) {
  const [showTooltip, setShowTooltip] = useState(false);
  const isActive = agent.state === 'at-desk' || agent.state === 'in-meeting';

  return (
    <div
      className={`mc-desk ${isActive ? 'mc-desk--active' : ''}`}
      style={{ left: pos.left, top: pos.top }}
      onMouseEnter={() => setShowTooltip(true)}
      onMouseLeave={() => setShowTooltip(false)}
    >
      {/* Desk geometry — 3 faces of an isometric box */}
      <div className="mc-desk-surface" />
      <div className="mc-desk-front" />
      <div className="mc-desk-side" />

      {/* Desk items */}
      {/* Monitor — offset from desk center */}
      <div className="mc-desk-item" style={{ left: 18, top: 8 }}>
        <div className={`mc-monitor ${isActive ? 'mc-monitor--active' : ''}`}>
          <div className="mc-monitor-screen">
            {agent.state === 'at-desk' && (
              <div className="mc-monitor-code">
                <div className="line-purple">const x</div>
                <div className="line-teal">{agent.id}()</div>
                <div className="line-gold">await db</div>
              </div>
            )}
          </div>
          <div className="mc-monitor-stand" />
          <div className="mc-monitor-base" />
        </div>
      </div>

      {/* Coffee mug — only for some agents */}
      {(agent.id === 'kofi' || agent.id === 'zuri' || agent.id === 'thabo') && (
        <div className="mc-desk-item" style={{ left: 58, top: 22 }}>
          <div className="mc-coffee">
            <div className="mc-coffee-body" />
            <div className="mc-coffee-steam">
              <div className="mc-steam-line" />
              <div className="mc-steam-line" />
            </div>
          </div>
        </div>
      )}

      {/* Plant — only for certain desks */}
      {(agent.id === 'naledi' || agent.id === 'eva') && (
        <div className="mc-desk-item" style={{ left: 56, top: 2 }}>
          <div className="mc-plant">
            <div className="mc-plant-pot" />
            <div className="mc-plant-leaves">
              <div className="mc-plant-leaf" style={leafStyle('-15deg', '-20deg')} />
              <div className="mc-plant-leaf" style={leafStyle('10deg', '15deg')} />
              <div className="mc-plant-leaf" style={leafStyle('-5deg', '3deg')} />
            </div>
          </div>
        </div>
      )}

      {/* Agent token — counter-rotated to stand upright */}
      <AnimatePresence>
        {agent.state !== 'away' && (
          <motion.div
            className="mc-agent"
            style={{
              left: 20,
              top: -16,
              /* The counter-rotation that makes the agent stand upright */
              transform: 'rotateZ(45deg) rotateX(-55deg) translateZ(30px)',
            }}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{
              duration: 0.4,
              ease: 'easeOut',
            }}
          >
            {/* Idle bob animation for working agents */}
            <motion.div
              animate={
                agent.state === 'at-desk'
                  ? { y: [0, -2, 0] }
                  : { rotate: [-1, 1, -1] }
              }
              transition={{
                duration: agent.state === 'at-desk' ? 3 : 2.5,
                repeat: Infinity,
                ease: 'easeInOut',
              }}
            >
              {/* Avatar circle */}
              <div className="mc-agent-avatar">
                {agent.emoji}
                {/* Status dot */}
                <span className={`mc-agent-status ${statusMap[agent.state]}`} />
              </div>
            </motion.div>

            {/* Name label */}
            <div className="mc-agent-label">{agent.emoji === '🌹' ? 'eva' : agent.id}</div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Tooltip */}
      <AnimatePresence>
        {showTooltip && (
          <motion.div
            className="mc-tooltip"
            initial={{ opacity: 0, y: 4, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 2, scale: 0.95 }}
            transition={{ duration: 0.15 }}
            style={{
              position: 'absolute',
              left: 0,
              top: -120,
              zIndex: 200,
              pointerEvents: 'none',
              /* Counter-rotate tooltip so it's readable */
              transform: 'rotateZ(45deg) rotateX(-55deg) translateZ(80px)',
            }}
          >
            <div className="mc-tooltip-title">
              {agent.emoji} {agent.name}
            </div>
            <div className="mc-tooltip-sub">
              {agent.role} ({agent.state.replace('-', ' ')})
            </div>
            {agent.task && (
              <div className="mc-tooltip-sub" style={{ marginTop: 4, color: 'rgba(78,205,196,0.7)' }}>
                📌 {agent.task}
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

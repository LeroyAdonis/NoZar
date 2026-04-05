import { motion } from 'framer-motion';
import type { Ticket } from './data';

const COLUMNS = ['backlog', 'ready', 'in-progress', 'review', 'done'] as const;

const colLabels: Record<string, string> = {
  backlog: 'Backlog',
  ready: 'Ready',
  'in-progress': 'In Prog',
  review: 'Review',
  done: 'Done',
  blocked: 'Blocked',
};

interface KanbanWallProps {
  tickets: Ticket[];
}

export function KanbanWall({ tickets }: KanbanWallProps) {
  return (
    <div className="mc-kanban-wall">
      <div className="mc-kanban-columns">
        {COLUMNS.map((col) => (
          <div key={col} className="mc-kanban-col">
            <div className="mc-kanban-col-label">{colLabels[col]}</div>
            {tickets
              .filter((t) => t.column === col)
              .slice(0, 3)
              .map((ticket, i) => (
                <motion.div
                  key={ticket.id}
                  className={`mc-kanban-card mc-kanban-card--${ticket.priority}`}
                  initial={{ opacity: 0, x: -4 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.3 + i * 0.05 }}
                  whileHover={{ scale: 1.05 }}
                >
                  {ticket.title.length > 12 ? ticket.title.slice(0, 12) + '…' : ticket.title}
                </motion.div>
              ))}
          </div>
        ))}
      </div>
    </div>
  );
}

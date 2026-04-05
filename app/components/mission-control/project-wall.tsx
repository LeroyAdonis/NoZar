import { motion } from 'framer-motion';
import type { Project } from './data';

const statusClass: Record<Project['status'], string> = {
  healthy: 'mc-project-status--healthy',
  warning: 'mc-project-status--warning',
  critical: 'mc-project-status--critical',
};

interface ProjectWallProps {
  projects: Project[];
}

export function ProjectWall({ projects }: ProjectWallProps) {
  return (
    <div className="mc-project-wall">
      {projects.map((proj, i) => (
        <motion.div
          key={proj.id}
          className="mc-project-monitor"
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 * i }}
          whileHover={{ scale: 1.05 }}
        >
          <div className={`mc-project-status ${statusClass[proj.status]}`} />
          <div className="mc-project-name" style={{ color: proj.status === 'healthy' ? '#fff' : proj.status === 'warning' ? '#b8a052' : '#d45252' }}>
            {proj.name}
          </div>
          <div className="mc-project-time">{proj.lastDeploy}</div>
        </motion.div>
      ))}
    </div>
  );
}

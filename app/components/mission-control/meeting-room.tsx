import { motion } from 'framer-motion';
import type { Room } from './data';

interface MeetingRoomProps {
  room: Room;
  style: React.CSSProperties;
}

export function MeetingRoom({ room, style }: MeetingRoomProps) {
  return (
    <motion.div
      className={`mc-room mc-room--meeting ${room.occupied ? 'mc-room--occupying' : ''}`}
      style={style}
      whileHover={{ scale: 1.02 }}
      transition={{ duration: 0.2 }}
    >
      <div className="mc-room-label">
        {room.name} {room.occupied && '👥'}
      </div>

      {/* Interior — subtle table shape */}
      <div
        style={{
          position: 'absolute',
          left: '50%',
          top: '50%',
          transform: 'translate(-50%, -50%)',
          width: '50%',
          height: '40%',
          borderRadius: '50%',
          background: 'rgba(78, 205, 196, 0.04)',
          border: '1px dashed rgba(78, 205, 196, 0.08)',
        }}
      />

      {/* Glass effect overlay */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          background:
            'linear-gradient(135deg, rgba(78,205,196,0.03) 0%, transparent 50%, rgba(155,107,255,0.02) 100%)',
          pointerEvents: 'none',
        }}
      />
    </motion.div>
  );
}

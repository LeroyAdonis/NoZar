import { motion } from 'framer-motion';
import type { Room } from './data';

interface BreakRoomProps {
  room: Room;
}

export function BreakRoom({ room }: BreakRoomProps) {
  return (
    <motion.div
      className="mc-room mc-room--break"
      style={{
        width: room.w,
        height: room.h,
      }}
      whileHover={{ scale: 1.02 }}
      transition={{ duration: 0.2 }}
    >
      <div className="mc-room-label">{room.name}</div>

      {/* Interior — couch + coffee */}
      <div
        style={{
          position: 'absolute',
          left: 8,
          bottom: 8,
          width: '40%',
          height: '30%',
          borderRadius: '6px',
          background: 'rgba(74, 61, 50, 0.4)',
          border: '1px solid rgba(184, 160, 82, 0.1)',
        }}
      />

      {/* Coffee machine */}
      <div
        style={{
          position: 'absolute',
          right: 8,
          bottom: 8,
          width: '35%',
          height: '35%',
          borderRadius: '3px',
          background: 'rgba(30, 21, 18, 0.6)',
          border: '1px solid rgba(184, 160, 82, 0.12)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <span style={{ fontSize: 8 }}>☕</span>
        {/* Tiny animated steam */}
        <motion.div
          style={{
            position: 'absolute',
            top: -6,
            left: '50%',
            width: 3,
            height: 6,
          }}
          animate={{ y: [0, -4], opacity: [0.4, 0] }}
          transition={{ duration: 2, repeat: Infinity }}
        >
          <div
            style={{
              width: 1,
              height: 6,
              background: 'linear-gradient(to top, rgba(255,255,255,0.1), transparent)',
            }}
          />
        </motion.div>
      </div>

      {/* Glass overlay */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          background:
            'linear-gradient(135deg, rgba(184,160,82,0.03) 0%, transparent 60%)',
          pointerEvents: 'none',
        }}
      />
    </motion.div>
  );
}

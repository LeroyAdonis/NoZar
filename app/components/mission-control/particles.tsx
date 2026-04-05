import { useEffect, useMemo, useRef } from 'react';

/* Floating ambient particles */
export function FloatingParticles() {
  const containerRef = useRef<HTMLDivElement>(null);

  const particles = useMemo(
    () =>
      Array.from({ length: 25 }, (_, i) => ({
        id: i,
        left: `${Math.random() * 100}%`,
        delay: `${Math.random() * 15}s`,
        duration: `${8 + Math.random() * 12}s`,
        size: 1 + Math.random() * 2,
        color: i % 3 === 0 ? 'var(--mc-purple)' : i % 3 === 1 ? 'var(--mc-teal)' : 'var(--mc-springbok-gold)',
      })),
    []
  );

  return (
    <div className="mc-particles" ref={containerRef}>
      {particles.map((p) => (
        <div
          key={p.id}
          className="mc-particle"
          style={{
            left: p.left,
            width: p.size,
            height: p.size,
            background: p.color,
            animationDelay: p.delay,
            animationDuration: p.duration,
          }}
        />
      ))}
    </div>
  );
}

import {
  useRef,
  useState,
  useEffect,
  useCallback,
  type ReactNode,
} from "react";
import {
  motion,
  useMotionValue,
  useSpring,
  useReducedMotion,
} from "framer-motion";

interface MagneticButtonProps {
  children: ReactNode;
  /** Additional CSS class names for the wrapper */
  className?: string;
  /** How strongly the element follows the cursor (0–1). Default 0.3. */
  strength?: number;
  /** Proximity radius in px — magnetic effect activates within this distance. Default 150. */
  radius?: number;
}

/** Spring config tuned for a responsive yet organic feel. */
const SPRING_CONFIG = { damping: 20, stiffness: 200, mass: 0.5 } as const;

/**
 * A wrapper that makes its children subtly follow the cursor when the pointer
 * is within `radius` px of the element's centre. Falls back to a plain `<div>`
 * on touch-only devices or when the user prefers reduced motion.
 *
 * The `strength` prop controls the maximum displacement as a fraction of the
 * offset — 0.3 means the element will translate at most 30 % of the distance
 * between its centre and the pointer. This value is further attenuated by how
 * close the pointer is to the edge of the radius, producing a natural "gravity
 * well" feel where the pull is strongest at the centre and fades to zero at the
 * perimeter.
 */
export function MagneticButton({
  children,
  className,
  strength = 0.3,
  radius = 150,
}: MagneticButtonProps) {
  const ref = useRef<HTMLDivElement>(null);
  const shouldReduceMotion = useReducedMotion();
  const [isTouchDevice, setIsTouchDevice] = useState(false);

  // Detect touch-only devices after mount (window is not available during SSR).
  useEffect(() => {
    const hoverNone = window.matchMedia("(hover: none)").matches;
    const hasTouch = "ontouchstart" in window;
    setIsTouchDevice(hoverNone || hasTouch);
  }, []);

  // Raw motion values — these are set synchronously during mousemove for
  // zero-latency positional tracking before the spring takes over.
  const rawX = useMotionValue(0);
  const rawY = useMotionValue(0);

  // Springs smooth out the raw values and drive the actual transform.
  const x = useSpring(rawX, SPRING_CONFIG);
  const y = useSpring(rawY, SPRING_CONFIG);

  const handleMouseMove = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      const el = ref.current;
      if (!el) return;

      const rect = el.getBoundingClientRect();
      const centerX = rect.left + rect.width / 2;
      const centerY = rect.top + rect.height / 2;

      const distX = e.clientX - centerX;
      const distY = e.clientY - centerY;
      const distance = Math.sqrt(distX * distX + distY * distY);

      if (distance < radius) {
        // Attenuate strength based on proximity: full strength at centre,
        // tapering to zero at the radius boundary.
        const attenuation = 1 - distance / radius;
        rawX.set(distX * strength * attenuation);
        rawY.set(distY * strength * attenuation);
      } else {
        rawX.set(0);
        rawY.set(0);
      }
    },
    [radius, strength, rawX, rawY],
  );

  const handleMouseLeave = useCallback(() => {
    rawX.set(0);
    rawY.set(0);
  }, [rawX, rawY]);

  // Reduced-motion and touch-device fallback — no magnetic effect.
  if (shouldReduceMotion || isTouchDevice) {
    return (
      <div ref={ref} className={className}>
        {children}
      </div>
    );
  }

  return (
    <motion.div
      ref={ref}
      className={className}
      style={{ x, y }}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
    >
      {children}
    </motion.div>
  );
}

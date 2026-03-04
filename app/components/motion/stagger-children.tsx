import { createContext, useContext, useRef, type ReactNode } from "react";
import { motion, useInView, useReducedMotion } from "framer-motion";

// ── Context ────────────────────────────────────────────────────────────
// Passes the parent-configured `duration` down to each StaggerItem
// without requiring an explicit prop on every item.

const StaggerContext = createContext<{ duration: number }>({ duration: 0.5 });

// ── Types ──────────────────────────────────────────────────────────────

interface StaggerChildrenProps {
  /** Delay in seconds between each child animation (default: 0.1) */
  staggerDelay?: number;
  /** Duration in seconds for each child's animation (default: 0.5) */
  duration?: number;
  className?: string;
  children: ReactNode;
}

interface StaggerItemProps {
  className?: string;
  children: ReactNode;
}

// ── StaggerChildren ────────────────────────────────────────────────────

/**
 * Container that orchestrates staggered entrance animations for its children
 * when scrolled into the viewport (20% visible triggers the animation).
 *
 * Pair with `<StaggerItem>` to wrap each animatable child.
 *
 * @example
 * ```tsx
 * <StaggerChildren staggerDelay={0.15}>
 *   <StaggerItem><Card>Card 1</Card></StaggerItem>
 *   <StaggerItem><Card>Card 2</Card></StaggerItem>
 *   <StaggerItem><Card>Card 3</Card></StaggerItem>
 * </StaggerChildren>
 * ```
 */
export function StaggerChildren({
  staggerDelay = 0.1,
  duration = 0.5,
  className,
  children,
}: StaggerChildrenProps) {
  const ref = useRef<HTMLDivElement>(null);
  const isInView = useInView(ref, { once: true, amount: 0.2 });
  const prefersReducedMotion = useReducedMotion();

  if (prefersReducedMotion) {
    return (
      <div ref={ref} className={className}>
        {children}
      </div>
    );
  }

  const containerVariants = {
    hidden: {},
    visible: { transition: { staggerChildren: staggerDelay } },
  };

  return (
    <StaggerContext value={{ duration }}>
      <motion.div
        ref={ref}
        className={className}
        variants={containerVariants}
        initial="hidden"
        animate={isInView ? "visible" : "hidden"}
      >
        {children}
      </motion.div>
    </StaggerContext>
  );
}

// ── StaggerItem ────────────────────────────────────────────────────────

/**
 * Wraps a single child inside a `<StaggerChildren>` container.
 * Animates from transparent + 20 px down to fully visible at its natural position.
 */
export function StaggerItem({ className, children }: StaggerItemProps) {
  const { duration } = useContext(StaggerContext);
  const prefersReducedMotion = useReducedMotion();

  if (prefersReducedMotion) {
    return <div className={className}>{children}</div>;
  }

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: {
      opacity: 1,
      y: 0,
      transition: { duration },
    },
  };

  return (
    <motion.div className={className} variants={itemVariants}>
      {children}
    </motion.div>
  );
}

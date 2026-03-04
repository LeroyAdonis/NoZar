import { useRef, useMemo, type ReactNode } from "react";
import { motion, useInView, useReducedMotion } from "framer-motion";
import type { Variants } from "framer-motion";

interface ScrollRevealProps {
  /** Delay in seconds before the animation starts */
  delay?: number;
  /** Duration of the animation in seconds */
  duration?: number;
  /** Number of pixels to translate up from */
  distance?: number;
  /** Whether to animate only on the first viewport entry */
  once?: boolean;
  /** Additional CSS class names */
  className?: string;
  children: ReactNode;
}

export function ScrollReveal({
  delay = 0,
  duration = 0.6,
  distance = 30,
  once = true,
  className,
  children,
}: ScrollRevealProps) {
  const ref = useRef<HTMLDivElement>(null);
  const isInView = useInView(ref, { once, amount: 0.2 });
  const shouldReduceMotion = useReducedMotion();

  const variants: Variants = useMemo(
    () => ({
      hidden: { opacity: 0, y: distance },
      visible: { opacity: 1, y: 0 },
    }),
    [distance],
  );

  if (shouldReduceMotion) {
    return (
      <div ref={ref} className={className}>
        {children}
      </div>
    );
  }

  return (
    <motion.div
      ref={ref}
      variants={variants}
      initial="hidden"
      animate={isInView ? "visible" : "hidden"}
      transition={{ duration, delay, ease: "easeOut" }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

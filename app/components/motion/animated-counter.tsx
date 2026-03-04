import { useRef, useEffect, useState } from "react";
import {
  useInView,
  useSpring,
  useMotionValue,
  useReducedMotion,
  motion,
} from "framer-motion";

/** Format a number with spaces as thousands separators (South African convention). */
function formatZA(value: number): string {
  return new Intl.NumberFormat("en-ZA").format(Math.round(value));
}

interface AnimatedCounterProps {
  /** The number to count up to. */
  target: number;
  /** Optional suffix appended after the number (e.g. "+", "%"). */
  suffix?: string;
  /** Duration of the count animation in seconds. */
  duration?: number;
  /** CSS class name for the wrapping element. */
  className?: string;
}

/**
 * Counts up from 0 to `target` with spring physics when the element scrolls
 * into the viewport. Displays numbers in South African format (spaces as
 * thousands separators).
 *
 * @example
 * <AnimatedCounter target={1000} suffix="+" className="text-3xl font-black text-white" />
 * // Renders: counts from 0 → "1 000+"
 */
export function AnimatedCounter({
  target,
  suffix,
  duration = 2,
  className,
}: AnimatedCounterProps) {
  const ref = useRef<HTMLSpanElement>(null);
  const isInView = useInView(ref, { once: true });
  const prefersReducedMotion = useReducedMotion();

  const motionVal = useMotionValue(0);
  const springVal = useSpring(motionVal, {
    duration: duration * 1000,
    bounce: 0,
  });

  const [display, setDisplay] = useState("0");

  // When the element enters the viewport, kick off the spring toward `target`.
  useEffect(() => {
    if (isInView) {
      motionVal.set(target);
    }
  }, [isInView, motionVal, target]);

  // Subscribe to spring value changes and update the displayed number.
  useEffect(() => {
    const unsubscribe = springVal.on("change", (latest: number) => {
      setDisplay(formatZA(latest));
    });
    return unsubscribe;
  }, [springVal]);

  // Respect prefers-reduced-motion: show the final value immediately.
  if (prefersReducedMotion) {
    return (
      <span ref={ref} className={className}>
        {formatZA(target)}
        {suffix}
      </span>
    );
  }

  return (
    <motion.span ref={ref} className={className}>
      {display}
      {suffix}
    </motion.span>
  );
}

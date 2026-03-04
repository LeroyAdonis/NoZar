import { Fragment } from "react";
import { AnimatedCounter } from "~/components/motion/animated-counter";

type StatItem = {
  target: number;
  suffix?: string;
  label: string;
};

const stats: StatItem[] = [
  { target: 1000, suffix: "+", label: "Active Listings" },
  { target: 5, label: "Cities Live" },
  { target: 100, suffix: "%", label: "Free to Start" },
];

const counterClassName =
  "text-3xl md:text-4xl font-black text-white drop-shadow-[0_0_12px_rgba(16,185,129,0.15)]";

export function StatsBar() {
  return (
    <section className="relative z-10 py-12 px-6 max-w-4xl mx-auto">
      <div className="flex items-center justify-center gap-8 md:gap-16">
        {stats.map((stat, i) => (
          <Fragment key={stat.label}>
            {i > 0 && <div className="w-px h-12 bg-white/10" />}
            <div className="text-center">
              <AnimatedCounter
                target={stat.target}
                suffix={stat.suffix}
                className={counterClassName}
              />
              <div className="text-xs font-mono uppercase tracking-widest text-slate-500 mt-1">
                {stat.label}
              </div>
            </div>
          </Fragment>
        ))}
      </div>
    </section>
  );
}

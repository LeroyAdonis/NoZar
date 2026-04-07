import { Rocket } from "lucide-react";

type SoftLaunchBadgeProps = {
  className?: string;
};

export function SoftLaunchBadge({ className = "" }: SoftLaunchBadgeProps) {
  return (
    <div
      data-testid="soft-launch-badge"
      className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-amber-500/10 border border-amber-500/20 text-xs font-mono uppercase tracking-widest text-amber-400 backdrop-blur-md ${className}`}
    >
      <Rocket className="w-3.5 h-3.5" />
      Soft Launch
    </div>
  );
}

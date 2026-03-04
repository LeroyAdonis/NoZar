import { ShieldCheck } from "lucide-react";

type VerificationBadgeProps = {
  className?: string;
};

export function VerificationBadge({ className = "" }: VerificationBadgeProps) {
  return (
    <span
      className={`flex items-center gap-1 text-[9px] font-mono text-emerald-400 uppercase ${className}`}
    >
      <ShieldCheck className="w-3 h-3" /> Verified Node
    </span>
  );
}

type BadgeVariant =
  | "tier_01"
  | "tier_02"
  | "tier_03"
  | "verified"
  | "unverified"
  | "handshake_ready"
  | "awaiting_reply"
  | "proposed"
  | "negotiating"
  | "agreed"
  | "contact_shared"
  | "completed"
  | "cancelled"
  | "disputed";

type BadgeSize = "sm" | "md";

type BadgeProps = {
  variant: BadgeVariant;
  size?: BadgeSize;
  children: React.ReactNode;
  className?: string;
};

const variantStyles: Record<BadgeVariant, string> = {
  // Tier badges — mono 10px uppercase tracking-widest
  tier_01:
    "bg-purple-500/10 text-purple-400 border border-purple-500/20 font-mono text-[10px] uppercase tracking-widest",
  tier_02:
    "bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 font-mono text-[10px] uppercase tracking-widest",
  tier_03:
    "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-mono text-[10px] uppercase tracking-widest",

  // Status badges — mono 9px uppercase tracking-widest
  verified:
    "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-mono text-[9px] uppercase tracking-widest",
  unverified:
    "bg-white/5 text-slate-500 font-mono text-[9px] uppercase tracking-widest",
  handshake_ready:
    "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-mono text-[9px] uppercase tracking-widest",
  awaiting_reply:
    "bg-amber-500/10 text-amber-400 border border-amber-500/20 font-mono text-[9px] uppercase tracking-widest",

  // Deal-flow badges
  proposed: "bg-amber-900/30 text-amber-300",
  negotiating: "bg-blue-900/30 text-blue-300",
  agreed: "bg-indigo-900/30 text-indigo-300",
  contact_shared: "bg-purple-900/30 text-purple-300",
  completed: "bg-green-900/30 text-green-300",
  cancelled: "bg-red-900/30 text-red-300",
  disputed: "bg-rose-900/30 text-rose-300",
};

const sizeStyles: Record<BadgeSize, string> = {
  sm: "px-2 py-0.5 text-xs",
  md: "px-2.5 py-0.5 text-sm",
};

function Badge({
  variant,
  size = "sm",
  children,
  className = "",
}: BadgeProps) {
  return (
    <span
      className={`inline-flex items-center rounded-full ${sizeStyles[size]} ${variantStyles[variant]} ${className}`}
    >
      {children}
    </span>
  );
}

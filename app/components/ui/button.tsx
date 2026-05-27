import { useHaptics } from "~/components/ui/haptic-provider";
import type { NozarHaptics } from "~/components/ui/haptic-provider";

type ButtonVariant =
  | "nozar"
  | "nozarOutline"
  | "primary"
  | "secondary"
  | "ghost"
  | "danger";

type ButtonSize = "sm" | "md" | "lg";

type ButtonProps = {
  variant?: ButtonVariant;
  size?: ButtonSize;
  children: React.ReactNode;
  className?: string;
  disabled?: boolean;
  type?: "button" | "submit" | "reset";
  onClick?: () => void;
};

const variantToHaptic: Record<ButtonVariant, keyof NozarHaptics> = {
  nozar: "medium",
  primary: "medium",
  nozarOutline: "lightTap",
  secondary: "lightTap",
  ghost: "lightTap",
  danger: "warning",
};

const variantStyles: Record<ButtonVariant, string> = {
  nozar:
    "bg-emerald-500 text-[#030712] font-black uppercase tracking-widest hover:bg-emerald-400 hover:shadow-[0_0_20px_rgba(16,185,129,0.4)]",
  nozarOutline:
    "bg-white/5 text-white border border-white/10 hover:bg-white/10 backdrop-blur-md",
  primary: "bg-[#009739] text-white hover:brightness-110",
  secondary: "border border-gray-300 bg-transparent text-white",
  ghost: "bg-transparent hover:bg-gray-800 text-white",
  danger: "bg-[#DE3831] text-white hover:brightness-110",
};

const sizeStyles: Record<ButtonSize, string> = {
  sm: "px-3 py-1.5 text-xs",
  md: "px-4 py-2 text-sm",
  lg: "px-6 py-3 text-base",
};

export function Button({
  variant = "nozar",
  size = "md",
  children,
  className = "",
  disabled = false,
  type = "button",
  onClick,
}: ButtonProps) {
  const haptics = useHaptics();
  return (
    <button
      type={type}
      disabled={disabled}
      onClick={() => {
        if (!disabled) {
          haptics[variantToHaptic[variant]]();
        }
        onClick?.();
      }}
      className={`inline-flex items-center justify-center gap-2 rounded-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed ${sizeStyles[size]} ${variantStyles[variant]} ${className}`}
    >
      {children}
    </button>
  );
}

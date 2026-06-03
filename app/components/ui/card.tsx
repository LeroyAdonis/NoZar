type CardVariant = "nozar" | "default" | "glass" | "elevated";

type CardProps = {
  variant?: CardVariant;
  children: React.ReactNode;
  className?: string;
};

type CardSectionProps = {
  children: React.ReactNode;
  className?: string;
};

const variantStyles: Record<CardVariant, string> = {
  nozar:
    "rounded-3xl bg-[#0F172A]/80 border border-white/10 backdrop-blur-sm hover:border-white/20 transition-all duration-500",
  default: "rounded-xl border border-gray-700 bg-gray-800",
  glass:
    "rounded-xl backdrop-blur-[24px] bg-white/[0.08] border border-white/[0.12]",
  elevated: "rounded-xl shadow-md hover:shadow-lg bg-[#0F172A]",
};

export function Card({
  variant = "nozar",
  children,
  className = "",
}: CardProps) {
  return (
    <div className={`${variantStyles[variant]} ${className}`}>{children}</div>
  );
}

export function CardHeader({ children, className = "" }: CardSectionProps) {
  return <div className={`p-6 pb-0 ${className}`}>{children}</div>;
}

export function CardTitle({ children, className = "" }: CardSectionProps) {
  return (
    <h3
      className={`text-lg font-semibold leading-tight text-slate-50 ${className}`}
    >
      {children}
    </h3>
  );
}

function CardDescription({ children, className = "" }: CardSectionProps) {
  return (
    <p className={`text-sm text-slate-400 mt-1 ${className}`}>{children}</p>
  );
}

export function CardContent({ children, className = "" }: CardSectionProps) {
  return <div className={`p-6 ${className}`}>{children}</div>;
}

export function CardFooter({ children, className = "" }: CardSectionProps) {
  return (
    <div
      className={`p-6 pt-0 flex items-center gap-2 ${className}`}
    >
      {children}
    </div>
  );
}

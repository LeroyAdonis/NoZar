type InputVariant = "nozar" | "default";

type InputProps = {
  variant?: InputVariant;
  label?: string;
  error?: string;
  className?: string;
} & React.InputHTMLAttributes<HTMLInputElement>;

const variantStyles: Record<InputVariant, string> = {
  nozar:
    "rounded-xl bg-[#0F172A] border text-white placeholder:text-slate-500 focus:border-emerald-500/50 focus:ring-1 focus:ring-emerald-500/25 focus:outline-none px-4 py-2.5",
  default: "rounded-lg bg-gray-800 border border-gray-700 text-white",
};

export function Input({
  variant = "nozar",
  label,
  error,
  className = "",
  id,
  ...rest
}: InputProps) {
  const inputId = id ?? (label ? label.toLowerCase().replace(/\s+/g, "-") : undefined);
  const variantClass = variantStyles[variant];
  const borderClass = error ? "border-red-500/50" : "border-white/10";

  return (
    <div>
      {label && (
        <label
          htmlFor={inputId}
          className="text-[10px] font-mono uppercase tracking-widest text-slate-400 mb-1.5 block"
        >
          {label}
        </label>
      )}
      <input
        id={inputId}
        className={`w-full ${variantClass} ${borderClass} ${className}`}
        {...rest}
      />
      {error && <p className="text-red-400 text-xs mt-1">{error}</p>}
    </div>
  );
}

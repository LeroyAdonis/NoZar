type InputVariant = "nozar" | "default";

type InputProps = {
  variant?: InputVariant;
  label?: string;
  className?: string;
} & React.InputHTMLAttributes<HTMLInputElement>;

const variantStyles: Record<InputVariant, string> = {
  nozar:
    "rounded-xl bg-[#0F172A] border border-white/10 text-white placeholder:text-slate-500 focus:border-emerald-500/50 focus:ring-1 focus:ring-emerald-500/25 focus:outline-none px-4 py-2.5",
  default: "rounded-lg bg-gray-800 border border-gray-700 text-white",
};

export function Input({
  variant = "nozar",
  label,
  className = "",
  id,
  ...rest
}: InputProps) {
  const inputId = id ?? (label ? label.toLowerCase().replace(/\s+/g, "-") : undefined);

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
        className={`w-full ${variantStyles[variant]} ${className}`}
        {...rest}
      />
    </div>
  );
}

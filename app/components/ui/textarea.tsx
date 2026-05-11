import { forwardRef } from "react";

type TextareaProps = {
  label?: string;
  error?: string;
  className?: string;
} & React.TextareaHTMLAttributes<HTMLTextAreaElement>;

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(
  function Textarea(
    {
      label,
      error,
      className = "",
      id,
      ...rest
    },
    ref,
  ) {
    const textareaId =
      id ?? (label ? label.toLowerCase().replace(/\s+/g, "-") : undefined);

    return (
      <div>
        {label && (
          <label
            htmlFor={textareaId}
            className="text-[10px] font-mono uppercase tracking-widest text-slate-400 mb-1.5 block"
          >
            {label}
          </label>
        )}
        <textarea
          ref={ref}
          id={textareaId}
          className={`w-full rounded-xl bg-[#0F172A] border ${
            error ? "border-red-500/50" : "border-white/10"
          } text-white placeholder:text-slate-500 focus:border-emerald-500/50 focus:ring-1 focus:ring-emerald-500/25 focus:outline-none px-4 py-2.5 resize-none ${className}`}
          {...rest}
        />
        {error && <p className="text-red-400 text-xs mt-1">{error}</p>}
      </div>
    );
  },
);

import { useEffect } from "react";

type WelcomeOverlayProps = {
  onDismiss: () => void;
};

export function WelcomeOverlay({ onDismiss }: WelcomeOverlayProps) {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onDismiss();
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [onDismiss]);

  return (
    <div
      className="fixed inset-0 z-[200] bg-[#030712]/95 backdrop-blur-xl flex items-center justify-center p-6"
      role="dialog"
      aria-modal="true"
      aria-labelledby="welcome-dialog-title"
    >
      <div className="max-w-sm w-full space-y-8 text-center">
        <div>
          <h2
            id="welcome-dialog-title"
            className="text-2xl sm:text-3xl font-black uppercase tracking-tighter text-white mb-3"
          >
            Welcome to NoZar
          </h2>
          <p className="text-slate-400 text-sm leading-relaxed">
            Swap what you have for what you need. No cash needed.
          </p>
        </div>

        <div className="space-y-3 text-left">
          {(
            [
              { emoji: "📋", text: "Post what you're offering" },
              { emoji: "🔍", text: "Browse what others have" },
              { emoji: "💬", text: "Chat and agree on a swap" },
            ] as const
          ).map(({ emoji, text }) => (
            <div
              key={text}
              className="flex items-center gap-4 p-4 bg-[#0F172A] rounded-xl border border-white/5"
            >
              <span aria-hidden="true" className="text-2xl flex-shrink-0">{emoji}</span>
              <span className="text-sm text-slate-300">{text}</span>
            </div>
          ))}
        </div>

        <button
          autoFocus
          type="button"
          onClick={onDismiss}
          className="w-full py-4 rounded-xl bg-emerald-500 text-[#030712] font-black uppercase tracking-widest text-sm hover:bg-emerald-400 transition-colors"
        >
          Let's go →
        </button>
      </div>
    </div>
  );
}

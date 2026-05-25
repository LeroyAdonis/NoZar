import { useEffect, useState, useCallback } from "react";

type TutorialOverlayProps = {
  onDismiss: () => void;
  onNavigate: (to: string) => void;
};

type SlidePhase = "idle" | "exiting" | "entering";

const SLIDES = [
  {
    emoji: "🤝",
    headline: "Welcome to NoZar",
    body: "Swap what you have for what you need. No cash. No catch.",
  },
  {
    emoji: "🔍",
    headline: "See What's Nearby",
    body: "Browse what your neighbours are offering — furniture, skills, gadgets, and more.",
  },
  {
    emoji: "📋",
    headline: "List Your Stuff",
    body: "Post anything you're willing to swap — clothes, tools, a skill you have. Takes about 30 seconds.",
  },
  {
    emoji: "💬",
    headline: "Ping Someone",
    body: "Found something you want? Chat with the owner and agree on what to swap.",
  },
  {
    emoji: "🤜",
    headline: "Lock It In",
    body: 'Once you\'ve swapped, both of you tap "Done." That\'s it — the swap is confirmed.',
  },
  {
    emoji: "🚀",
    headline: "Ready for Your First Swap?",
    body: "Browse what's near you, or list your first item right now.",
  },
] as const;

const PHASE_CLASSES: Record<SlidePhase, string> = {
  idle:     "opacity-100 translate-y-0 transition-all duration-200 ease-out",
  exiting:  "opacity-0 -translate-y-2 transition-all duration-150 ease-in",
  entering: "opacity-0 translate-y-3 transition-all duration-200 ease-out",
};

export function TutorialOverlay({ onDismiss, onNavigate }: TutorialOverlayProps) {
  const [currentSlide, setCurrentSlide] = useState(0);
  const [slidePhase, setSlidePhase] = useState<SlidePhase>("idle");

  const isLastSlide = currentSlide === SLIDES.length - 1;

  const goToSlide = useCallback((index: number) => {
    if (slidePhase !== "idle") return;
    setSlidePhase("exiting");
    setTimeout(() => {
      setCurrentSlide(index);
      setSlidePhase("entering");
      requestAnimationFrame(() => {
        requestAnimationFrame(() => setSlidePhase("idle"));
      });
    }, 150);
  }, [slidePhase]);

  const advance = useCallback(() => {
    if (slidePhase !== "idle") return;
    const next = currentSlide + 1;
    if (next >= SLIDES.length) {
      onDismiss();
      return;
    }
    goToSlide(next);
  }, [slidePhase, currentSlide, onDismiss, goToSlide]);

  const back = useCallback(() => {
    if (slidePhase !== "idle" || currentSlide === 0) return;
    goToSlide(currentSlide - 1);
  }, [slidePhase, currentSlide, goToSlide]);

  const handlePrimary = () => {
    if (isLastSlide) {
      onNavigate("/dashboard/add");
      onDismiss();
    } else {
      advance();
    }
  };

  const handleBackdropClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.target === e.currentTarget) advance();
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onDismiss();
      } else if (e.key === "ArrowRight" || e.key === " ") {
        e.preventDefault();
        advance();
      } else if (e.key === "ArrowLeft") {
        e.preventDefault();
        back();
      }
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [onDismiss, advance, back]);

  return (
    <div
      className="fixed inset-0 z-[200] bg-[#030712]/95 backdrop-blur-xl flex items-center justify-center p-6 animate-in fade-in duration-300 ease-out"
      role="dialog"
      aria-modal="true"
      aria-label="NoZar tutorial"
      onClick={handleBackdropClick}
    >
      {/* Skip button — absolute top-right, visible on all slides */}
      <button
        type="button"
        onClick={onDismiss}
        className="absolute top-6 right-6 text-[10px] font-mono uppercase tracking-widest text-slate-500 hover:text-slate-300 transition-colors p-2"
      >
        Skip
      </button>

      <div className="max-w-sm w-full flex flex-col items-center text-center px-6 py-10">
        {/* Emoji illustration — re-keyed per slide so animate-in retriggers */}
        <span
          key={currentSlide}
          aria-hidden="true"
          className="text-6xl mb-6 animate-in zoom-in-95 duration-200 ease-out block"
        >
          {SLIDES[currentSlide].emoji}
        </span>

        {/* Slide content wrapper — transition target */}
        <div className={`space-y-4 ${PHASE_CLASSES[slidePhase]}`}>
          <h2 className="text-2xl sm:text-3xl font-black uppercase tracking-tighter text-white">
            {SLIDES[currentSlide].headline}
          </h2>
          <p className="text-sm text-slate-400 leading-relaxed max-w-xs mx-auto">
            {SLIDES[currentSlide].body}
          </p>
        </div>

        {/* Progress dots */}
        <div
          className="flex items-center gap-2 mt-8 mb-6"
          role="tablist"
          aria-label={`Tutorial progress: slide ${currentSlide + 1} of 6`}
        >
          {SLIDES.map((_, i) => (
            <button
              key={i}
              type="button"
              role="tab"
              aria-selected={i === currentSlide}
              aria-label={`Slide ${i + 1}`}
              onClick={(e) => { e.stopPropagation(); goToSlide(i); }}
              className={
                i === currentSlide
                  ? "w-5 h-1.5 rounded-full bg-emerald-500 transition-all duration-200"
                  : "w-1.5 h-1.5 rounded-full bg-white/20 hover:bg-white/40 transition-all duration-200"
              }
            />
          ))}
        </div>

        {/* Primary action button */}
        <button
          type="button"
          onClick={(e) => { e.stopPropagation(); handlePrimary(); }}
          className="w-full py-4 rounded-xl bg-emerald-500 text-[#030712] font-black uppercase tracking-widest text-sm hover:bg-emerald-400 hover:shadow-[0_0_20px_rgba(16,185,129,0.4)] active:scale-95 transition-all"
        >
          {isLastSlide ? "List Your First Item →" : "Next →"}
        </button>
      </div>
    </div>
  );
}

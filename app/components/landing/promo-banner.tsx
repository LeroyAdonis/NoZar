import { useState, useEffect } from "react";
import { Link } from "react-router";
import { X, Rocket } from "lucide-react";

const DISMISSED_KEY = "nozar-promo-dismissed";

type Props = { isLoggedIn?: boolean };

/**
 * Dismissible promotional banner for the MVP Beta Plus promo.
 * Before hydration (or after dismiss) renders the minimal beta tag
 * so the page layout never shifts.
 */
export function PromoBanner({ isLoggedIn = false }: Props) {
  const [dismissed, setDismissed] = useState(true); // true = minimal bar while loading
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const isDismissed = localStorage.getItem(DISMISSED_KEY) === "1";
    setDismissed(isDismissed);
    setMounted(true);
  }, []);

  const handleDismiss = () => {
    localStorage.setItem(DISMISSED_KEY, "1");
    setDismissed(true);
  };

  /* Minimal bar — shown before mount or after dismiss */
  if (!mounted || dismissed) {
    return (
      <div className="fixed top-0 w-full z-[60] bg-emerald-500/10 border-b border-emerald-500/20 py-2 text-center backdrop-blur-md">
        <p className="text-[9px] font-mono uppercase tracking-[0.2em] text-emerald-400">
          <span className="inline-block animate-pulse mr-2">●</span>
          Beta — live in Joburg &amp; Cape Town
        </p>
      </div>
    );
  }

  /* Full promo bar */
  return (
    <div
      data-testid="promo-banner"
      className="fixed top-0 w-full z-[60] backdrop-blur-md border-b border-emerald-500/25"
      style={{
        background:
          "linear-gradient(135deg, rgba(16,185,129,0.14) 0%, rgba(6,182,212,0.07) 100%)",
      }}
    >
      <div className="max-w-7xl mx-auto px-4 py-2.5 flex items-center justify-between gap-4">
        <div className="flex items-center gap-3 flex-1 justify-center flex-wrap">
          <Rocket className="w-3.5 h-3.5 text-emerald-400 shrink-0" aria-hidden />
          <p className="text-[10px] font-mono uppercase tracking-[0.14em] text-emerald-400 text-center">
            <span className="text-emerald-300 font-bold">Beta Launch</span>
            <span className="text-emerald-600 mx-2">—</span>
            3 months of Plus free · 20 listings · AI match · No card needed
          </p>
          <Link
            data-testid="promo-cta"
            to={isLoggedIn ? "/dashboard/billing" : "/register"}
            className="shrink-0 px-3 py-1 rounded-lg bg-emerald-500 text-slate-950 text-[9px] font-mono uppercase tracking-widest hover:bg-emerald-400 transition-colors font-bold"
          >
            {isLoggedIn ? "View Your Plus →" : "Claim Free Plus →"}
          </Link>
        </div>
        <button
          data-testid="promo-dismiss"
          onClick={handleDismiss}
          className="shrink-0 text-emerald-400/50 hover:text-emerald-400 transition-colors p-1 rounded"
          aria-label="Dismiss promotional banner"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
}

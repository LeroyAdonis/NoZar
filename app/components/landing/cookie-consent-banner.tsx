import { useEffect, useState } from "react";

export function CookieConsentBanner() {
  const [showBanner, setShowBanner] = useState(() => {
    // Check if consent was already given
    if (typeof window !== "undefined") {
      return localStorage.getItem("nozar_cookie_consent") !== "accepted";
    }
    return true;
  });

  useEffect(() => {
    // Handle Escape key to dismiss banner
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && showBanner) {
        setShowBanner(false);
        localStorage.setItem("nozar_cookie_consent", "accepted");
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [showBanner]);

  const acceptConsent = () => {
    setShowBanner(false);
    localStorage.setItem("nozar_cookie_consent", "accepted");
  };

  if (!showBanner) {
    return null;
  }

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 bg-[#030712]/95 backdrop-blur-xl border-t border-white/10 p-4 md:p-6 flex flex-col items-center gap-4 text-center">
      <div className="flex items-center gap-3 mb-2">
        <span className="w-2 h-2 bg-emerald-500 rounded-full" />
        <span className="text-xs font-mono">[ COOKIE NOTICE ]</span>
      </div>
      <p className="text-sm font-mono text-slate-400 max-w-xl">
        We use essential cookies to keep you signed in. No tracking cookies.
      </p>
      <div className="flex flex-col sm:flex-row gap-3">
        <button
          onClick={acceptConsent}
          className="px-4 py-2 bg-white/10 text-white font-bold rounded-lg hover:bg-white/20 transition-all"
        >
          Accept
        </button>
        <button
          onClick={() => {
            setShowBanner(false);
            localStorage.setItem("nozar_cookie_consent", "accepted");
          }}
          className="px-4 py-2 bg-transparent text-slate-400 font-bold rounded-lg border border-white/10 hover:bg-white/10 hover:text-white transition-all"
        >
          Learn More
        </button>
      </div>
    </div>
  );
}
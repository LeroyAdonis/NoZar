import { useState, useEffect } from "react";
import { Link } from "react-router";

// Single global localStorage key — replaces both nozar-consent and nozar_cookie_consent
const CONSENT_KEY = "nozar-consent";
const CONSENT_VALUE = "accepted";

export function CookieBanner() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (
      typeof window !== "undefined" &&
      localStorage.getItem(CONSENT_KEY) !== CONSENT_VALUE
    ) {
      const timer = setTimeout(() => setVisible(true), 300);
      return () => clearTimeout(timer);
    }
  }, []);

  function handleAccept() {
    localStorage.setItem(CONSENT_KEY, CONSENT_VALUE);
    setVisible(false);
  }

  return (
    <div
      className={`fixed bottom-0 left-0 right-0 z-50 bg-[#0F172A]/95 backdrop-blur-xl border-t border-white/10 p-4 md:p-6 transition-transform duration-500 ease-out ${
        visible ? "translate-y-0" : "translate-y-full"
      }`}
      role="banner"
      aria-label="Cookie consent"
    >
      <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
        <p className="text-sm text-slate-400 text-center md:text-left">
          We use essential cookies to keep you signed in and improve your
          experience. No tracking or third-party analytics cookies are used.
          Read our{" "}
          <Link
            to="/legal/privacy"
            className="text-emerald-400 hover:text-emerald-300 underline"
          >
            Privacy Policy
          </Link>{" "}
          for details.
        </p>

        <div className="flex items-center gap-3 shrink-0">
          <Link
            to="/legal/privacy"
            className="px-6 py-2.5 rounded-lg bg-white/5 text-slate-300 font-medium text-sm hover:bg-white/10 border border-white/10 transition-all"
          >
            Learn More
          </Link>
          <button
            type="button"
            onClick={handleAccept}
            className="px-6 py-2.5 rounded-lg bg-emerald-500 text-slate-950 font-bold text-sm hover:bg-emerald-400 transition-all cursor-pointer"
          >
            Accept
          </button>
        </div>
      </div>
    </div>
  );
}

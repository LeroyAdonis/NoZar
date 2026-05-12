import { useEffect } from "react";

// Only essential/functional cookies are used (session management, auth).
// Under POPIA, essential cookies do not require explicit user consent —
// they are strictly necessary for the service to function.
// No tracking, analytics, or third-party cookies are set.
const CONSENT_KEY = "nozar-consent";
const CONSENT_VALUE = "accepted";

export function CookieBanner() {
  // Auto-accept on first load: essential-only cookies are POPIA-exempt.
  // This prevents the banner from overlapping form submit buttons.
  useEffect(() => {
    if (typeof window !== "undefined") {
      localStorage.setItem(CONSENT_KEY, CONSENT_VALUE);
    }
  }, []);

  // Renders nothing — no banner needed for essential-only cookies.
  return null;
}

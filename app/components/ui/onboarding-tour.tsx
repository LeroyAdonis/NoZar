// app/components/ui/onboarding-tour.tsx
// Driver.js-powered onboarding tour for NoZar — 9 steps covering key features,
// with SPA navigation for the chat page detour (which works reliably).
// Profile info is shown on the dashboard itself to avoid cross-page navigation
// issues with Driver.js element targets.

import { useEffect, useRef, useCallback } from "react";
import { useLocation, useNavigate } from "react-router";
import { driver, type Driver, type DriveStep, type Config } from "driver.js";
import "driver.js/dist/driver.css";

interface OnboardingTourProps {
  onDismiss: () => void;
}

// Steps that navigate to a different route — keyed by CURRENT step index
const NAV_STEPS: Record<number, string> = {
  3: "/dashboard/pings",  // Step 3 → click → go to pings for step 4
  4: "/dashboard",         // Step 4 → click → go home for step 5
};

export function OnboardingTour({ onDismiss }: OnboardingTourProps) {
  const driverRef = useRef<Driver | null>(null);
  const activeStepRef = useRef(0);
  const dismissedRef = useRef(false);
  const location = useLocation();
  const navigate = useNavigate();

  // ── Central advance handler ────────────────────────────────────────────
  const advance = useCallback(() => {
    const drv = driverRef.current;
    if (!drv) return;

    const currentIdx = activeStepRef.current;
    const nextIdx = currentIdx + 1;

    // Last step — tour complete (now 9 steps, index 8 is the last)
    if (nextIdx >= 9) {
      dismissedRef.current = true;
      onDismiss();
      return;
    }

    const navTarget = NAV_STEPS[currentIdx];
    if (navTarget) {
      // SPA navigation — works reliably for /pings and /dashboard
      navigate(navTarget);
      setTimeout(() => {
        drv.moveNext();
        activeStepRef.current = nextIdx;
      }, 500);
    } else {
      // Same-page step — advance after a short buffer
      setTimeout(() => {
        drv.moveNext();
        activeStepRef.current = nextIdx;
      }, 350);
    }
  }, [navigate, onDismiss]);

  const advanceRef = useRef(advance);
  advanceRef.current = advance;

  // Close handler — called when close button (×) is clicked on any step
  const handleClose = useCallback(() => {
    if (!dismissedRef.current) {
      dismissedRef.current = true;
      onDismiss();
    }
  }, [onDismiss]);

  // ── Step definitions ───────────────────────────────────────────────────
  const getSteps = useCallback((): DriveStep[] => {
    const a = () => advanceRef.current();
    return [
      // Step 0: Welcome (Dashboard, center)
      {
        element: "#tour-welcome",
        popover: {
          title: "🤝 Welcome to NoZar",
          description:
            "South Africa's first barter platform. Trade what you have for what you need — no money, just value.",
          side: "over",
          align: "center",
          showButtons: ["next", "close"],
          nextBtnText: "Let's go →",
          onNextClick: a,
          onCloseClick: handleClose,
        },
      },
      // Step 1: List an Item (Dashboard, highlight add)
      {
        element: '[data-tour="add"], [data-tour-d="add"]',
        popover: {
          title: "📸 List an Item",
          description:
            "Snap a photo and AI writes the listing for you. Quick, smart, and effortless.",
          side: "right",
          showButtons: ["next", "close"],
          onNextClick: a,
          onCloseClick: handleClose,
        },
      },
      // Step 2: Explore (Dashboard, highlight map)
      {
        element: '[data-tour="map"], [data-tour-d="map"]',
        popover: {
          title: "🔍 Explore with AI",
          description:
            "AI Match finds the perfect swap partners. Browse listings near you or open the map to discover items in your area.",
          side: "right",
          showButtons: ["next", "close"],
          onNextClick: a,
          onCloseClick: handleClose,
        },
      },
      // Step 3: Chat (Dashboard, highlight messages — SPA nav to /pings)
      {
        element: '[data-tour="messages"], [data-tour-d="messages"]',
        popover: {
          title: "💬 Chat Safely",
          description:
            "Fraud Shield watches every message. Trade with confidence knowing we've got your back.",
          side: "right",
          showButtons: ["next", "close"],
          nextBtnText: "Take me there →",
          onNextClick: a,
          onCloseClick: handleClose,
        },
      },
      // Step 4: Chat Page (/pings — SPA nav back to dashboard)
      {
        element: "#tour-chat-page",
        popover: {
          title: "💬 Your Chats",
          description:
            "This is where your messages live. Negotiate trades, arrange meetups, and build your barter network.",
          side: "over",
          showButtons: ["next", "close"],
          nextBtnText: "Back to tour ←",
          onNextClick: a,
          onCloseClick: handleClose,
        },
      },
      // Step 5: AI Features (Dashboard, body/no spotlight)
      {
        popover: {
          title: "🧠 AI-Powered Trading",
          description:
            "Auto-translate, Fair Trade valuation, and smart recommendations — NoZar's AI makes bartering effortless.",
          side: "over",
          showButtons: ["next", "close"],
          onNextClick: a,
          onCloseClick: handleClose,
        },
      },
      // Step 6: Safety & Trust (Dashboard, body/no spotlight)
      {
        popover: {
          title: "🛡️ Safety First",
          description:
            "Fraud Shield, verified profiles, and community ratings keep NoZar a safe space to trade.",
          side: "over",
          showButtons: ["next", "close"],
          onNextClick: a,
          onCloseClick: handleClose,
        },
      },
      // Step 7: Your Profile (Dashboard, highlight profile — stays on dashboard)
      {
        element: '[data-tour="profile"], [data-tour-d="profile"]',
        popover: {
          title: "👤 Your Profile",
          description:
            "Trade history, ratings, and billing — all in one place. Update your avatar, manage your Plus subscription, and adjust settings. Keep your profile updated to build trust.",
          side: "right",
          showButtons: ["next", "close"],
          onNextClick: a,
          onCloseClick: handleClose,
        },
      },
      // Step 8: Done (Dashboard, body/no spotlight — last step)
      {
        popover: {
          title: "🌟 You're All Set!",
          description:
            "Start exploring, list your first item, and find your first swap. Happy trading on NoZar!",
          side: "over",
          showButtons: ["next", "close"],
          doneBtnText: "Done 🚀",
          onNextClick: a,
          onCloseClick: handleClose,
        },
      },
    ];
  }, []);

  // ── Initialize Driver.js and start the tour ────────────────────────────
  useEffect(() => {
    const config: Config = {
      steps: getSteps(),
      animate: true,
      overlayColor: "#030712",
      overlayOpacity: 0.75,
      smoothScroll: true,
      allowClose: true,
      overlayClickBehavior: "close",
      stagePadding: 8,
      stageRadius: 12,
      popoverClass: "nozar-tour-popover",
      showProgress: true,
      progressText: "Step {current} of {total}",
      doneBtnText: "Done 🚀",
      nextBtnText: "Next",
      prevBtnText: "Back",
      showButtons: ["next", "close"],
      onDestroyed: () => {
        if (!dismissedRef.current) {
          dismissedRef.current = true;
          onDismiss();
        }
      },
    };

    const instance = driver(config);
    driverRef.current = instance;
    instance.drive();

    return () => {
      instance.destroy();
      driverRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return null; // Driver.js manages its own DOM
}

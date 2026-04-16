"use client";

import { useState } from "react";
import { Link } from "react-router";
import { motion, AnimatePresence } from "framer-motion";
import { X, UserPlus, LogIn, ShieldCheck, ArrowRight } from "lucide-react";

/**
 * Props for the AuthPromptModal component.
 * Used to prompt guest users to authenticate when attempting protected actions.
 */
export interface AuthPromptModalProps {
  /** Whether the modal is currently open */
  isOpen: boolean;
  /** Callback when modal is closed without authenticating */
  onClose: () => void;
  /** The action the user was trying to perform (e.g., "Add Asset", "Initiate Trade") */
  actionLabel?: string;
  /** Optional callback after user successfully authenticates */
  onAuthSuccess?: () => void;
}

/**
 * AuthPromptModal - A reusable modal that prompts guest users to authenticate
 * when they attempt protected actions like adding listings, initiating trades,
 * or sending messages.
 *
 * Design follows NoZar's dark theme with emerald accents.
 * Mobile-first with touch-friendly targets.
 */
export function AuthPromptModal({
  isOpen,
  onClose,
  actionLabel = "this action",
  onAuthSuccess,
}: AuthPromptModalProps) {
  const [authType, setAuthType] = useState<"login" | "register">("register");

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-[#030712]/90 backdrop-blur-sm"
            aria-hidden="true"
          />

          {/* Modal content */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            transition={{ type: "spring", damping: 25, stiffness: 300 }}
            className="relative w-full max-w-md overflow-hidden rounded-3xl border border-white/10 bg-[#0F172A] shadow-2xl"
            role="dialog"
            aria-modal="true"
            aria-labelledby="auth-prompt-title"
            aria-describedby="auth-prompt-description"
          >
            {/* Close button */}
            <button
              onClick={onClose}
              className="absolute top-4 right-4 z-10 p-2 rounded-full bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white transition-colors"
              aria-label="Close"
            >
              <X className="w-5 h-5" />
            </button>

            {/* Header with icon */}
            <div className="flex flex-col items-center text-center pt-8 pb-6 px-6">
              {/* Icon container */}
              <div className="mb-6 flex h-16 w-16 sm:h-20 sm:w-20 items-center justify-center rounded-2xl bg-emerald-500/10 border border-emerald-500/30">
                <ShieldCheck className="h-8 w-8 sm:h-10 sm:w-10 text-emerald-400" />
              </div>

              {/* Title */}
              <h2
                id="auth-prompt-title"
                className="text-xl sm:text-2xl font-black uppercase tracking-tight text-white"
              >
                Authentication Required
              </h2>

              {/* Description */}
              <p
                id="auth-prompt-description"
                className="mt-3 text-sm sm:text-base text-slate-400 leading-relaxed max-w-sm"
              >
                To <span className="text-emerald-400 font-medium">{actionLabel}</span>,
                you'll need to create a free account or sign in.
              </p>
            </div>

            {/* Benefits list */}
            <div className="px-6 pb-6">
              <div className="space-y-3">
                {[
                  { text: "List unlimited items for barter", icon: "📦" },
                  { text: "Connect with traders nearby", icon: "📍" },
                  { text: "Secure messaging & safe meetups", icon: "🔒" },
                  { text: "Zero transaction fees", icon: "💰" },
                ].map((benefit, i) => (
                  <motion.div
                    key={i}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.05 + 0.1 }}
                    className="flex items-center gap-3 text-sm text-slate-300"
                  >
                    <span className="text-lg">{benefit.icon}</span>
                    <span>{benefit.text}</span>
                  </motion.div>
                ))}
              </div>
            </div>

            {/* Auth type toggle */}
            <div className="px-6 pb-4">
              <div className="flex gap-1 p-1 rounded-xl bg-[#030712] border border-white/5">
                <button
                  onClick={() => setAuthType("register")}
                  className={`flex-1 py-2.5 px-4 rounded-lg text-xs font-bold uppercase tracking-wider transition-all ${
                    authType === "register"
                      ? "bg-emerald-500 text-[#030712]"
                      : "text-slate-400 hover:text-white"
                  }`}
                >
                  <UserPlus className="w-3.5 h-3.5 inline-block mr-1.5 -mt-0.5" />
                  Create Account
                </button>
                <button
                  onClick={() => setAuthType("login")}
                  className={`flex-1 py-2.5 px-4 rounded-lg text-xs font-bold uppercase tracking-wider transition-all ${
                    authType === "login"
                      ? "bg-emerald-500 text-[#030712]"
                      : "text-slate-400 hover:text-white"
                  }`}
                >
                  <LogIn className="w-3.5 h-3.5 inline-block mr-1.5 -mt-0.5" />
                  Sign In
                </button>
              </div>
            </div>

            {/* CTA buttons */}
            <div className="px-6 pb-8 space-y-3">
              <Link
                to={authType === "register" ? "/register" : "/login"}
                onClick={onAuthSuccess}
                className="group flex w-full items-center justify-center gap-2 overflow-hidden rounded-2xl bg-emerald-500 px-6 py-4 text-sm font-bold text-[#030712] transition-all active:scale-[0.98] hover:bg-emerald-400"
              >
                <span className="uppercase tracking-tight">
                  {authType === "register" ? "Get Started Free" : "Sign In to Continue"}
                </span>
                <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
              </Link>

              <button
                onClick={onClose}
                className="w-full rounded-2xl border border-white/10 bg-white/5 px-6 py-3 text-sm font-semibold text-slate-400 transition-colors hover:bg-white/10 hover:text-slate-200"
              >
                Maybe Later
              </button>
            </div>

            {/* Ndebele pattern strip at bottom */}
            <div className="absolute bottom-0 left-0 h-1 w-full bg-gradient-to-r from-sa-green via-sa-gold to-sa-red opacity-60" />
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}

/**
 * Higher-order hook to manage auth prompt state.
 * Use this in components that need to show the auth prompt.
 *
 * @example
 * ```tsx
 * const { showPrompt, promptAuth, closePrompt } = useAuthPrompt();
 *
 * // When user tries a protected action:
 * const handleAddClick = () => {
 *   if (!user) {
 *     promptAuth("Add Asset");
 *   } else {
 *     navigate("/dashboard/add");
 *   }
 * };
 * ```
 */
export function useAuthPrompt() {
  const [showPrompt, setShowPrompt] = useState(false);
  const [actionLabel, setActionLabel] = useState<string>("");

  const promptAuth = (action: string = "this action") => {
    setActionLabel(action);
    setShowPrompt(true);
  };

  const closePrompt = () => {
    setShowPrompt(false);
    setActionLabel("");
  };

  return {
    showPrompt,
    actionLabel,
    promptAuth,
    closePrompt,
    AuthPromptModal: ({ onAuthSuccess }: { onAuthSuccess?: () => void }) => (
      <AuthPromptModal
        isOpen={showPrompt}
        onClose={closePrompt}
        actionLabel={actionLabel}
        onAuthSuccess={onAuthSuccess}
      />
    ),
  };
}

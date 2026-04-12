"use client";

import { Radar, ShieldCheck, X } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

interface LocationPromptModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAccept: () => void;
}

export function LocationPromptModal({
  isOpen,
  onClose,
  onAccept,
}: LocationPromptModalProps) {
  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-[#030712]/80 backdrop-blur-sm"
          />

          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            className="relative w-full max-w-md overflow-hidden rounded-3xl border border-white/10 bg-[#0F172A] p-6 shadow-2xl sm:p-8"
          >
            {/* Header / Icon */}
            <div className="flex flex-col items-center text-center">
              <div className="mb-6 flex h-20 w-20 items-center justify-center rounded-2xl bg-emerald-500/10 border border-emerald-500/30">
                <Radar className="h-10 w-10 text-emerald-400 animate-pulse" />
              </div>

              <h2 className="text-2xl font-black uppercase tracking-tighter text-white">
                Initialize Radar
              </h2>
              <p className="mt-4 text-sm leading-relaxed text-slate-400">
                To use Nozar's radar feature and discover swaps nearby, you must
                enable location services. This allows us to track items in your 
                immediate vicinity and provide safe, local trading.
              </p>
            </div>

            {/* Features list */}
            <div className="mt-8 space-y-4">
              <div className="flex items-start gap-4 rounded-2xl border border-white/5 bg-white/5 p-4">
                <div className="mt-1 shrink-0 rounded-full bg-emerald-500/20 p-1">
                  <ShieldCheck className="h-4 w-4 text-emerald-400" />
                </div>
                <div>
                  <h3 className="text-xs font-bold uppercase tracking-widest text-slate-200">
                    Precision Search
                  </h3>
                  <p className="mt-1 text-xs text-slate-500">
                    Find items within 10km, 25km, or 50km of your current position.
                  </p>
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="mt-10 flex flex-col gap-3">
              <button
                type="button"
                onClick={() => {
                  onAccept();
                  onClose();
                }}
                className="w-full rounded-2xl bg-emerald-500 px-6 py-4 text-sm font-bold text-[#030712] transition-transform active:scale-95"
              >
                ENABLE LOCATION & START RADAR
              </button>
              <button
                type="button"
                onClick={onClose}
                className="w-full rounded-2xl border border-white/10 bg-white/5 px-6 py-4 text-sm font-semibold text-slate-400 transition-colors hover:bg-white/10 hover:text-slate-200"
              >
                Maybe Later
              </button>
            </div>

            <button
              onClick={onClose}
              className="absolute top-4 right-4 p-2 text-slate-500 hover:text-white"
            >
              <X className="h-5 w-5" />
            </button>

            {/* Ndebele pattern strip at bottom */}
            <div className="absolute bottom-0 left-0 h-1 w-full bg-gradient-to-r from-sa-green via-sa-gold to-sa-red opacity-50" />
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}

"use client";

import { useState } from "react";
import { Radar, ShieldCheck, X, Loader2, AlertCircle } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useFetcher } from "react-router";

interface LocationPromptModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

export function LocationPromptModal({
  isOpen,
  onClose,
  onSuccess,
}: LocationPromptModalProps) {
  const fetcher = useFetcher();
  const [error, setError] = useState<string | null>(null);
  const isLoading = fetcher.state !== "idle";

  const handleEnableLocation = () => {
    setError(null);

    if (!navigator.geolocation) {
      setError("Geolocation is not supported by your browser");
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude } = position.coords;
        fetcher.submit(
          { 
            intent: "updateLocation",
            lat: latitude.toString(),
            lng: longitude.toString(),
          },
          { method: "post", action: "/dashboard" }
        );
        onSuccess?.();
      },
      (err) => {
        console.error("Geolocation error:", err);
        switch (err.code) {
          case err.PERMISSION_DENIED:
            setError("Location permission denied. Please enable it in your browser settings.");
            break;
          case err.POSITION_UNAVAILABLE:
            setError("Location information is unavailable.");
            break;
          case err.TIMEOUT:
            setError("The request to get user location timed out.");
            break;
          default:
            setError("An unknown error occurred.");
            break;
        }
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 0,
      }
    );
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={!isLoading ? onClose : undefined}
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
                {isLoading ? (
                  <Loader2 className="h-10 w-10 text-emerald-400 animate-spin" />
                ) : (
                  <Radar className="h-10 w-10 text-emerald-400 animate-pulse" />
                )}
              </div>

              <h2 className="text-2xl font-black uppercase tracking-tighter text-white">
                Initialize Radar
              </h2>
              <p className="mt-4 text-sm leading-relaxed text-slate-400">
                To use Nozar's radar feature and discover swaps nearby, we recommend
                enabling location services. You can still browse by region without it, 
                but exact distances and the radar map will be limited.
              </p>
            </div>

            {/* Error Message */}
            {error && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                className="mt-6 flex items-start gap-3 rounded-2xl border border-red-500/20 bg-red-500/10 p-4"
              >
                <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-red-400" />
                <p className="text-xs text-red-400/90 leading-relaxed font-medium">
                  {error}
                </p>
              </motion.div>
            )}

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
                onClick={handleEnableLocation}
                disabled={isLoading}
                className="group relative flex w-full items-center justify-center gap-2 overflow-hidden rounded-2xl bg-emerald-500 px-6 py-4 text-sm font-bold text-[#030712] transition-all active:scale-95 disabled:opacity-50 disabled:active:scale-100"
              >
                <span className="relative z-10 uppercase tracking-tight">
                  {isLoading ? "Fetching Location..." : "ENABLE LOCATION & START RADAR"}
                </span>
                <div className="absolute inset-0 bg-white/20 opacity-0 transition-opacity group-hover:opacity-100" />
              </button>
              {!isLoading && (
                <button
                  type="button"
                  onClick={onClose}
                  className="w-full rounded-2xl border border-white/10 bg-white/5 px-6 py-4 text-sm font-semibold text-slate-400 transition-colors hover:bg-white/10 hover:text-slate-200"
                >
                  Maybe Later
                </button>
              )}
            </div>

            {!isLoading && (
              <button
                onClick={onClose}
                className="absolute top-4 right-4 p-2 text-slate-500 hover:text-white"
              >
                <X className="h-5 w-5" />
              </button>
            )}

            {/* Ndebele pattern strip at bottom */}
            <div className="absolute bottom-0 left-0 h-1 w-full bg-gradient-to-r from-sa-green via-sa-gold to-sa-red opacity-50" />
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}

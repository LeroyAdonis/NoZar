"use client";

import { useEffect, useState } from "react";
import { Smartphone, ShieldAlert, X, Loader2 } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";

interface DeviceVerificationPromptProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

type Step = "collecting" | "duplicate" | "phone" | "otp" | "done";

export function DeviceVerificationPrompt({
  isOpen,
  onClose,
  onSuccess,
}: DeviceVerificationPromptProps) {
  const [step, setStep] = useState<Step>("collecting");
  const [error, setError] = useState<string | null>(null);
  const [phone, setPhone] = useState("");
  const [otp, setOtp] = useState("");
  const [loading, setLoading] = useState(false);

  // Step 1: Collect fingerprint and POST as soon as the modal opens (D-06)
  useEffect(() => {
    if (!isOpen) {
      setStep("collecting");
      setError(null);
      setPhone("");
      setOtp("");
      return;
    }

    let cancelled = false;
    setStep("collecting");
    setError(null);

    import("@fingerprintjs/fingerprintjs")
      .then((FingerprintJSModule) => FingerprintJSModule.default.load())
      .then((fp) => fp.get())
      .then(async (result) => {
        if (cancelled) return;
        const res = await fetch("/api/device-fingerprint", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ fingerprintHash: result.visitorId }),
        });
        const data = await res.json() as { ok?: boolean; duplicate?: boolean; reason?: string; error?: string };
        if (cancelled) return;
        if (data.ok) {
          setStep("done");
          onSuccess?.();
        } else if (data.duplicate) {
          setStep("duplicate");
        } else {
          setError(data.error ?? "Verification failed. Try again later.");
          setStep("duplicate");
        }
      })
      .catch((err) => {
        if (cancelled) return;
        console.warn("[DeviceVerificationPrompt] fingerprint failed:", err);
        // Non-fatal: close the prompt if fingerprint collection fails
        onClose();
      });

    return () => { cancelled = true; };
  }, [isOpen, onClose, onSuccess]);

  const handleSendOtp = async () => {
    setError(null);
    if (!phone.trim()) { setError("Enter your SA phone number"); return; }
    setLoading(true);
    try {
      const res = await fetch("/api/device-verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "sendOtp", phone: phone.trim() }),
      });
      const data = await res.json() as { sent?: boolean; error?: string };
      if (data.sent) { setStep("otp"); } else { setError(data.error ?? "Could not send OTP"); }
    } catch { setError("Network error. Try again."); }
    setLoading(false);
  };

  const handleVerifyOtp = async () => {
    setError(null);
    if (!otp.trim()) { setError("Enter the 6-digit code"); return; }
    setLoading(true);
    try {
      const res = await fetch("/api/device-verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "verifyOtp", phone: phone.trim(), code: otp.trim() }),
      });
      const data = await res.json() as { bypassToken?: string; error?: string };
      if (data.bypassToken) {
        // OTP verified — device identity confirmed. Close prompt.
        setStep("done");
        onSuccess?.();
      } else {
        setError(data.error ?? "Invalid code. Try again.");
      }
    } catch { setError("Network error. Try again."); }
    setLoading(false);
  };

  const isLoading = step === "collecting" || loading;

  return (
    <AnimatePresence>
      {isOpen && step !== "done" && (
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
            {/* Icon + heading */}
            <div className="flex flex-col items-center text-center mb-6">
              <div className="mb-4 flex h-20 w-20 items-center justify-center rounded-2xl bg-amber-500/10 border border-amber-500/30">
                {isLoading ? (
                  <Loader2 className="h-10 w-10 text-amber-400 animate-spin" />
                ) : step === "duplicate" || step === "phone" || step === "otp" ? (
                  <ShieldAlert className="h-10 w-10 text-amber-400" />
                ) : (
                  <Smartphone className="h-10 w-10 text-emerald-400" />
                )}
              </div>
              <h2 className="text-2xl font-black uppercase tracking-tighter text-white">
                {step === "collecting" ? "Registering Device" : "Verify Your Identity"}
              </h2>
              <p className="mt-3 text-sm leading-relaxed text-slate-400">
                {step === "collecting"
                  ? "Linking your device to your NoZar account for security…"
                  : "This device is linked to another NoZar account. Verify your phone to confirm your identity."}
              </p>
            </div>

            {/* Error */}
            {error && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                className="mb-4 rounded-2xl border border-red-500/20 bg-red-500/10 p-3"
              >
                <p className="text-xs text-red-400 font-medium">{error}</p>
              </motion.div>
            )}

            {/* Phone step */}
            {(step === "duplicate" || step === "phone") && !loading && (
              <div className="space-y-4">
                <div>
                  <label className="block text-[10px] font-mono uppercase tracking-widest text-slate-400 mb-1.5">
                    SA Phone Number
                  </label>
                  <input
                    type="tel"
                    autoComplete="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="082 123 4567"
                    className="w-full rounded-xl bg-white/5 border border-white/10 px-4 py-3 text-sm text-white placeholder-slate-600 focus:outline-none focus:border-amber-500/50"
                  />
                </div>
                <button
                  type="button"
                  onClick={handleSendOtp}
                  disabled={loading}
                  className="w-full rounded-2xl bg-amber-500 px-6 py-4 text-sm font-bold uppercase tracking-tight text-[#030712] transition-all active:scale-95 disabled:opacity-50"
                >
                  Send Verification Code
                </button>
                <button
                  type="button"
                  onClick={onClose}
                  className="w-full rounded-2xl border border-white/10 bg-white/5 px-6 py-4 text-sm font-semibold text-slate-400 hover:bg-white/10"
                >
                  Verify Later
                </button>
              </div>
            )}

            {/* OTP step */}
            {step === "otp" && !loading && (
              <div className="space-y-4">
                <p className="text-center text-xs text-slate-400">Code sent to {phone}</p>
                <div>
                  <label className="block text-[10px] font-mono uppercase tracking-widest text-slate-400 mb-1.5">
                    Verification Code
                  </label>
                  <input
                    type="text"
                    inputMode="numeric"
                    autoComplete="one-time-code"
                    maxLength={6}
                    value={otp}
                    onChange={(e) => setOtp(e.target.value)}
                    placeholder="123456"
                    className="w-full rounded-xl bg-white/5 border border-white/10 px-4 py-3 text-sm text-white placeholder-slate-600 focus:outline-none focus:border-emerald-500/50 text-center tracking-widest"
                  />
                </div>
                <button
                  type="button"
                  onClick={handleVerifyOtp}
                  className="w-full rounded-2xl bg-emerald-500 px-6 py-4 text-sm font-bold uppercase tracking-tight text-[#030712] transition-all active:scale-95"
                >
                  Verify & Continue
                </button>
                <button
                  type="button"
                  onClick={() => { setStep("phone"); setOtp(""); setError(null); }}
                  className="w-full text-xs text-slate-500 hover:text-emerald-400 underline"
                >
                  Use a different number
                </button>
              </div>
            )}

            {!isLoading && (
              <button
                onClick={onClose}
                className="absolute top-4 right-4 p-2 text-slate-500 hover:text-white"
                aria-label="Close"
              >
                <X className="h-5 w-5" />
              </button>
            )}

            {/* Ndebele pattern strip — matching LocationPromptModal */}
            <div className="absolute bottom-0 left-0 h-1 w-full bg-gradient-to-r from-sa-green via-sa-gold to-sa-red opacity-50" />
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}

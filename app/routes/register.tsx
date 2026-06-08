import { useState, useEffect } from "react";
import { Link, redirect, useNavigate } from "react-router";
import type { Route } from "./+types/register";
import { authClient } from "~/lib/auth.client";
import { getOptionalSession } from "~/lib/auth.server";
import { parse } from "cookie";
import { Input } from "~/components/ui/input";
import { Button } from "~/components/ui/button";
import { LoadingBar, Spinner } from "~/components/ui/loading-indicator";
import { useHaptics } from "~/components/ui/haptic-provider";

export async function loader({ request }: Route.LoaderArgs) {
  const session = await getOptionalSession(request);
  if (session) {
    throw redirect("/dashboard");
  }
  return {};
}

export function meta({}: Route.MetaArgs) {
  return [
    { title: "Join NoZar — Trade Without Cash" },
    { name: "description", content: "South Africa's first AI-powered barter platform. Trade what you have for what you need." },
  ];
}

export default function RegisterPage() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [verificationSent, setVerificationSent] = useState(false);
  const [fingerprintHash, setFingerprintHash] = useState<string | null>(null);
  // Duplicate-device flow state
  const [deviceError, setDeviceError] = useState<"DEVICE_ALREADY_REGISTERED" | "DEVICE_HARD_BLOCKED" | null>(null);
  const [devicePhone, setDevicePhone] = useState("");
  const [deviceOtpSent, setDeviceOtpSent] = useState(false);
  const [deviceOtp, setDeviceOtp] = useState("");
  const [deviceBypassToken, setDeviceBypassToken] = useState<string | null>(null);
  const [deviceVerifyLoading, setDeviceVerifyLoading] = useState(false);
  const [deviceVerifyError, setDeviceVerifyError] = useState("");
  const navigate = useNavigate();
  const haptics = useHaptics();

  useEffect(() => {
    // FingerprintJS must never be imported server-side (uses browser APIs).
    // Dynamic import inside useEffect ensures SSR-safe lazy loading (D-01).
    import("@fingerprintjs/fingerprintjs").then((FingerprintJSModule) => {
      const FingerprintJS = FingerprintJSModule.default;
      FingerprintJS.load()
        .then((fp) => fp.get())
        .then((result) => setFingerprintHash(result.visitorId))
        .catch((err) => {
          // Fingerprint failure is non-fatal — registration still proceeds.
          // The server will skip the fingerprint check when hash is absent.
          console.warn("[register] FingerprintJS failed:", err);
        });
    });
  }, []);

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    await authClient.signUp.email({
      email,
      password,
      name,
      // D-02: pass fingerprint hash as extra field — Better Auth ZodRecord accepts it
      ...(fingerprintHash ? { fingerprintHash } : {}),
      // D-05 bypass: included only when phone OTP was verified for duplicate-device unlock
      ...(deviceBypassToken ? { deviceBypassToken } : {}),
      fetchOptions: {
        onSuccess: async (ctx) => {
          const cookies = parse(document.cookie);
          const referrerId = cookies.referrerId;
          if (referrerId && ctx.data?.user?.id) {
            try {
              await fetch("/api/refer/complete", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ referrerId, refereeId: ctx.data.user.id }),
              });
            } catch (e) {
              console.error("Failed to record referral:", e);
            }
          }
          setLoading(false);
          haptics.success();
          // If Better Auth auto-signed the user in (e.g. test mode or future config),
          // navigate directly to dashboard. Otherwise, require email verification.
          if (ctx.data?.session || ctx.data?.token) {
            navigate("/dashboard");
          } else {
            setVerificationSent(true);
          }
        },
        onError: (ctx) => {
          haptics.error();
          const msg = ctx.error.message ?? "";
          if (msg.includes("DEVICE_ALREADY_REGISTERED")) {
            // D-03/D-05: Soft block — show inline phone verification UI
            setDeviceError("DEVICE_ALREADY_REGISTERED");
            setError("");
          } else if (msg.includes("DEVICE_HARD_BLOCKED")) {
            // D-07: Hard block — no unlock path
            setDeviceError("DEVICE_HARD_BLOCKED");
            setError("");
          } else {
            setError(msg || "Registration failed");
          }
          setLoading(false);
        },
      },
    });
  };

  const handleDeviceSendOtp = async () => {
    setDeviceVerifyError("");
    if (!devicePhone.trim()) {
      setDeviceVerifyError("Enter your SA phone number (e.g. 082 123 4567)");
      return;
    }
    setDeviceVerifyLoading(true);
    try {
      const res = await fetch("/api/device-verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "sendOtp", phone: devicePhone.trim() }),
      });
      const data = await res.json() as { sent?: boolean; error?: string };
      if (!res.ok || !data.sent) {
        setDeviceVerifyError(data.error ?? "Could not send OTP. Check your number and try again.");
      } else {
        setDeviceOtpSent(true);
      }
    } catch {
      setDeviceVerifyError("Network error. Please try again.");
    } finally {
      setDeviceVerifyLoading(false);
    }
  };

  const handleDeviceVerifyOtp = async () => {
    setDeviceVerifyError("");
    if (!deviceOtp.trim()) {
      setDeviceVerifyError("Enter the 6-digit code from your SMS");
      return;
    }
    setDeviceVerifyLoading(true);
    try {
      const res = await fetch("/api/device-verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "verifyOtp", phone: devicePhone.trim(), code: deviceOtp.trim() }),
      });
      const data = await res.json() as { bypassToken?: string; error?: string };
      if (!res.ok || !data.bypassToken) {
        setDeviceVerifyError(data.error ?? "Invalid or expired code. Try again.");
      } else {
        // Token valid — store it and retry the sign-up automatically
        setDeviceBypassToken(data.bypassToken);
        setDeviceError(null);
        setDeviceVerifyError("");
        // Trigger re-submit with the bypass token now in state
        setLoading(true);
        // React state is async — use the token directly in the inline call
        await authClient.signUp.email({
          email,
          password,
          name,
          ...(fingerprintHash ? { fingerprintHash } : {}),
          ...(data.bypassToken ? { deviceBypassToken: data.bypassToken } : {}),
          fetchOptions: {
            onSuccess: async (ctx) => {
              const cookies = parse(document.cookie);
              const referrerId = cookies.referrerId;
              if (referrerId && ctx.data?.user?.id) {
                try {
                  await fetch("/api/refer/complete", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ referrerId, refereeId: ctx.data.user.id }),
                  });
                } catch (e) {
                  console.error("Failed to record referral:", e);
                }
              }
              setLoading(false);
              haptics.success();
              if (ctx.data?.session || ctx.data?.token) {
                navigate("/dashboard");
              } else {
                setVerificationSent(true);
              }
            },
            onError: (ctx) => {
              haptics.error();
              setError(ctx.error.message ?? "Registration failed after verification");
              setDeviceError(null);
              setLoading(false);
            },
          },
        });
      }
    } catch {
      setDeviceVerifyError("Network error. Please try again.");
    } finally {
      setDeviceVerifyLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setLoading(true);
    setError("");
    try {
      await authClient.signIn.social({
        provider: "google",
        callbackURL: "/dashboard",
        fetchOptions: {
          onError: (ctx) => {
            setError(ctx.error.message ?? "Registration failed");
            setLoading(false);
          },
        },
      });
    } catch {
      setError("Unable to sign in right now. Please try again.");
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#030712] flex items-center justify-center px-4 nz-grid-pattern relative overflow-hidden">
      {/* Subtle noise texture */}
      <div className="noise-overlay absolute inset-0" />
      {/* Ambient emerald glow (top-right) */}
      <div className="absolute -top-40 -right-40 w-80 h-80 rounded-full bg-emerald-500/5 blur-[120px] pointer-events-none" />

      <div className="w-full max-w-sm space-y-8 relative z-10">
        {/* Logo & Brand */}
        <div className="text-center">
          <Link to="/" className="inline-flex items-center gap-3 group justify-center mb-4">
            <div className="relative">
              <img
                src="/logo.svg"
                alt="NoZar"
                className="w-14 h-14 rounded-xl transition-transform duration-300 group-hover:scale-105"
              />
              <div className="absolute -inset-1 rounded-xl bg-emerald-500/10 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
            </div>
          </Link>
          <h1 className="text-3xl font-black uppercase tracking-tighter text-white">
            Join <span className="nz-gradient-text">NoZar</span>
          </h1>
          <p className="mt-2 text-sm text-slate-400 leading-relaxed max-w-xs mx-auto">
            Trade what you have for what you need — no money, just value.
          </p>
        </div>

        {/* Form card */}
        <div className="bg-[rgba(15,23,42,0.6)] border border-white/10 rounded-2xl p-6 backdrop-blur-md space-y-4">

        {/* Error message */}
        {error && (
          <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-xs font-mono text-center">
            {error}
          </div>
        )}

        {/* D-05: Inline duplicate-device state — not a toast, per CONTEXT.md */}
        {deviceError === "DEVICE_ALREADY_REGISTERED" && (
          <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/20 space-y-4">
            <div className="space-y-1">
              <p className="text-amber-400 text-xs font-mono uppercase tracking-widest font-bold">
                Device Already Linked
              </p>
              <p className="text-slate-300 text-sm leading-relaxed">
                This device is linked to an existing NoZar account. Verify your
                phone number to continue creating a new account.
              </p>
            </div>

            {deviceVerifyError && (
              <p className="text-red-400 text-xs font-mono">{deviceVerifyError}</p>
            )}

            {!deviceOtpSent ? (
              <div className="space-y-3">
                <Input
                  label="SA Phone Number"
                  type="tel"
                  autoComplete="tel"
                  value={devicePhone}
                  onChange={(e) => setDevicePhone(e.target.value)}
                  placeholder="082 123 4567"
                />
                <Button
                  type="button"
                  variant="nozarOutline"
                  size="lg"
                  className="w-full"
                  disabled={deviceVerifyLoading}
                  onClick={handleDeviceSendOtp}
                >
                  {deviceVerifyLoading ? "Sending…" : "Send Verification Code"}
                </Button>
              </div>
            ) : (
              <div className="space-y-3">
                <p className="text-slate-400 text-xs">
                  Code sent to {devicePhone}. Enter it below.
                </p>
                <Input
                  label="Verification Code"
                  type="text"
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  maxLength={6}
                  value={deviceOtp}
                  onChange={(e) => setDeviceOtp(e.target.value)}
                  placeholder="123456"
                />
                <Button
                  type="button"
                  variant="nozar"
                  size="lg"
                  className="w-full"
                  disabled={deviceVerifyLoading}
                  onClick={handleDeviceVerifyOtp}
                >
                  {deviceVerifyLoading ? "Verifying…" : "Verify & Create Account"}
                </Button>
                <button
                  type="button"
                  className="text-xs text-slate-500 hover:text-emerald-400 underline w-full text-center"
                  onClick={() => { setDeviceOtpSent(false); setDeviceOtp(""); setDeviceVerifyError(""); }}
                >
                  Use a different number
                </button>
              </div>
            )}
          </div>
        )}

        {deviceError === "DEVICE_HARD_BLOCKED" && (
          <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/20 space-y-2">
            <p className="text-red-400 text-xs font-mono uppercase tracking-widest font-bold">
              Registration Blocked
            </p>
            <p className="text-slate-300 text-sm leading-relaxed">
              Too many accounts have been created from this device. Please contact
              support if you believe this is an error.
            </p>
          </div>
        )}

        {/* Email verification notice */}
        {verificationSent && (
          <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-sm text-center space-y-1">
            <p className="font-semibold">Account created!</p>
            <p className="text-xs text-slate-400">
              Check your email for a verification link before signing in.
            </p>
            <p className="mt-2">
              <a
                href="/login"
                className="text-emerald-400 underline hover:text-emerald-300 text-xs font-medium"
              >
                Go to Sign In →
              </a>
            </p>
          </div>
        )}

        {/* Sign-Up Form */}
        {!deviceError && (
        <form onSubmit={handleSignUp} className="space-y-4">
          {loading && <LoadingBar />}
          <Input
            label="Display Name"
            type="text"
            autoComplete="name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Zanele A."
            required
          />
          <Input
            label="Email"
            type="email"
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@example.com"
            required
          />
          <Input
            label="Password"
            type="password"
            autoComplete="new-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Min 8 characters"
            minLength={8}
            required
            suppressHydrationWarning
          />
          <Button
            type="submit"
            variant="nozar"
            size="lg"
            disabled={loading}
            className="w-full"
          >
            {loading ? (
              <>
                <Spinner />
                Creating account...
              </>
            ) : (
              "Create Account"
            )}
          </Button>
        </form>
        )}

        </div>

        {/* Divider */}
        <div className="flex items-center gap-3">
          <div className="flex-1 h-px bg-white/10" />
          <span className="text-[10px] font-mono uppercase tracking-widest text-slate-500">
            Or
          </span>
          <div className="flex-1 h-px bg-white/10" />
        </div>

        {/* Google OAuth */}
        <Button
          variant="nozarOutline"
          size="lg"
          className="w-full"
          onClick={handleGoogleSignIn}
          disabled={loading}
        >
          <svg className="w-4 h-4" viewBox="0 0 24 24">
            <path
              fill="currentColor"
              d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"
            />
            <path
              fill="currentColor"
              d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
            />
            <path
              fill="currentColor"
              d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
            />
            <path
              fill="currentColor"
              d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
            />
          </svg>
          Continue with Google
        </Button>

        {/* Login link */}
        <p className="text-center text-sm text-slate-400">
          Already have an account?{" "}
          <Link
            to="/login"
            className="text-emerald-400 hover:text-emerald-300 font-medium"
          >
            Sign in
          </Link>
        </p>
      </div>
    </div>
  );
}

import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router";
import type { Route } from "./+types/login";
import { getOptionalSession } from "~/lib/auth.server";
import { authClient } from "~/lib/auth.client";
import { redirect } from "react-router";
import { Input } from "~/components/ui/input";
import { Button } from "~/components/ui/button";
import { LoginFormSkeleton } from "~/components/ui/skeleton";

export async function loader({ request }: Route.LoaderArgs) {
  const session = await getOptionalSession(request);
  if (session) {
    throw redirect("/dashboard");
  }
  return {};
}

export function meta({}: Route.MetaArgs) {
  return [
    { title: "Login — NoZar" },
    { name: "description", content: "Sign in to your NoZar account" },
  ];
}

const SAFE_LOGIN_ERROR = "Unable to sign in right now. Please try again.";
const EMAIL_NOT_VERIFIED_SENTINEL = "EMAIL_NOT_VERIFIED";

function isEmailNotVerifiedError(error: { message?: string; status?: number }): boolean {
  const msg = (error.message ?? "").toLowerCase();
  return (
    msg.includes("not verified") ||
    msg.includes("email_not_verified") ||
    msg.includes("verify your email")
  );
}

function getLoginErrorMessage(error: { message?: string; status?: number }): string {
  if (isEmailNotVerifiedError(error)) return EMAIL_NOT_VERIFIED_SENTINEL;
  if (typeof error.status === "number" && error.status >= 500) {
    return SAFE_LOGIN_ERROR;
  }
  if (error.message && !/internal server error/i.test(error.message)) {
    return error.message;
  }
  return SAFE_LOGIN_ERROR;
}

export default function LoginPage() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [showResend, setShowResend] = useState(false);
  const [resendSent, setResendSent] = useState(false);
  const [fingerprintHash, setFingerprintHash] = useState<string | null>(null);

  useEffect(() => {
    // SSR-safe: dynamic import runs only in the browser (D-01).
    import("@fingerprintjs/fingerprintjs").then((FingerprintJSModule) => {
      const FingerprintJS = FingerprintJSModule.default;
      FingerprintJS.load()
        .then((fp) => fp.get())
        .then((result) => setFingerprintHash(result.visitorId))
        .catch((err) => console.warn("[login] FingerprintJS failed:", err));
    });
  }, []);

  const handleResendVerification = async () => {
    if (!email) {
      setError("Enter your email address above, then click resend.");
      return;
    }
    setLoading(true);
    try {
      await authClient.sendVerificationEmail({
        email,
        callbackURL: "/login",
      });
      setResendSent(true);
      setError("");
    } catch {
      setError("Failed to resend verification email. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleEmailSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setShowResend(false);
    setResendSent(false);
    setLoading(true);
    try {
      await authClient.signIn.email({
        email,
        password,
        fetchOptions: {
          onSuccess: () => {
            setLoading(false);
            // D-04: Fire-and-forget POST — does not block navigation.
            // The server upserts device_fingerprints and returns duplicate status.
            // Duplicate handling for OAuth users happens in the dashboard loader (D-06).
            if (fingerprintHash) {
              fetch("/api/device-fingerprint", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ fingerprintHash }),
              }).catch((err) => console.warn("[login] fingerprint POST failed:", err));
            }
            navigate("/dashboard");
          },
          onError: (ctx) => {
            const msg = getLoginErrorMessage(ctx.error);
            if (msg === EMAIL_NOT_VERIFIED_SENTINEL) {
              setError(
                "Please verify your email before signing in. Check your inbox for the verification link.",
              );
              setShowResend(true);
            } else {
              setError(msg);
              setShowResend(false);
            }
            setLoading(false);
          },
        },
      });
    } catch {
      setError(SAFE_LOGIN_ERROR);
      setLoading(false);
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
            setError(getLoginErrorMessage(ctx.error));
            setLoading(false);
          },
        },
      });
    } catch {
      setError(SAFE_LOGIN_ERROR);
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#030712] flex items-center justify-center px-4">
      {/* Show loading skeleton while initial submission is in progress */}
      {loading ? (
        <LoginFormSkeleton />
      ) : (
        <div className="w-full max-w-sm space-y-8">
          {/* Logo */}
          <div className="text-center">
            <Link to="/" className="inline-flex items-center gap-2 group">
              <img src="/logo.svg" alt="NoZar" className="w-12 h-12 rounded-xl" />
            </Link>
            <h1 className="mt-4 text-2xl font-black uppercase tracking-tight text-white">
              Sign In
            </h1>
            <p className="mt-1 text-sm text-slate-400">Access your barter network</p>
          </div>

          {/* Error message */}
          {error && (
            <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-xs font-mono text-center space-y-2">
              <p>{error}</p>
              {showResend && !resendSent && (
                <button
                  type="button"
                  onClick={handleResendVerification}
                  className="underline text-emerald-400 hover:text-emerald-300 font-medium text-xs"
                >
                  Resend verification email
                </button>
              )}
              {resendSent && (
                <p className="text-emerald-400 font-medium">Verification email sent — check your inbox.</p>
              )}
            </div>
          )}

          {/* Email/Password Form */}
          <form onSubmit={handleEmailSignIn} className="space-y-4">
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
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
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
              {"Sign In"}
            </Button>
          </form>

          {/* Forgot password */}
          <p className="text-center">
            <Link
              to="/forgot-password"
              className="text-xs text-slate-500 hover:text-emerald-400 transition-colors"
            >
              Forgot your password?
            </Link>
          </p>

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
            <svg className="w-4 h-4 mr-2" viewBox="0 0 24 24">
              <path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" />
              <path fill="currentColor" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
              <path fill="currentColor" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
              <path fill="currentColor" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
            </svg>
            Continue with Google
          </Button>

          {/* Register link */}
          <p className="text-center text-sm text-slate-400">
            Don&apos;t have an account?{" "}
            <Link to="/register" className="text-emerald-400 hover:text-emerald-300 font-medium">
              Create one
            </Link>
          </p>
        </div>
      )}
    </div>
  );
}
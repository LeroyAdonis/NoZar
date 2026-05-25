import { useState } from "react";
import { Link, redirect } from "react-router";
import type { Route } from "./+types/register";
import { authClient } from "~/lib/auth.client";
import { getOptionalSession } from "~/lib/auth.server";
import { parse } from "cookie";
import { Input } from "~/components/ui/input";
import { Button } from "~/components/ui/button";
import { LoadingBar, Spinner } from "~/components/ui/loading-indicator";

export async function loader({ request }: Route.LoaderArgs) {
  const session = await getOptionalSession(request);
  if (session) {
    throw redirect("/dashboard");
  }
  return {};
}

export function meta({}: Route.MetaArgs) {
  return [
    { title: "Register — NoZar" },
    { name: "description", content: "Create your NoZar account" },
  ];
}

export default function RegisterPage() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [verificationSent, setVerificationSent] = useState(false);

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    await authClient.signUp.email({
      email,
      password,
      name,
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
            // Email verification is required — do not navigate to dashboard.
            // Instruct the user to check their inbox instead.
            setVerificationSent(true);
          },
        onError: (ctx) => {
          setError(ctx.error.message ?? "Registration failed");
          setLoading(false);
        },
      },
    });
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
    <div className="min-h-screen bg-[#030712] flex items-center justify-center px-4">
      <div className="w-full max-w-sm space-y-8">
        {/* Logo */}
        <div className="text-center">
          <Link to="/" className="inline-flex items-center gap-2 group">
            <img
              src="/logo.svg"
              alt="NoZar"
              className="w-12 h-12 rounded-xl"
            />
          </Link>
          <h1 className="mt-4 text-2xl font-black uppercase tracking-tight text-white">
            Create Account
          </h1>
          <p className="mt-1 text-sm text-slate-400">
            Join the barter network
          </p>
        </div>

        {/* Error message */}
        {error && (
          <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-xs font-mono text-center">
            {error}
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

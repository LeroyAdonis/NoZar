import { useState } from "react";
import { Link } from "react-router";
import type { Route } from "./+types/forgot-password";
import { getOptionalSession } from "~/lib/auth.server";
import { authClient } from "~/lib/auth.client";
import { redirect } from "react-router";
import { Input } from "~/components/ui/input";
import { Button } from "~/components/ui/button";
import { LoadingBar, Spinner } from "~/components/ui/loading-indicator";
import { CheckCircle } from "lucide-react";

export async function loader({ request }: Route.LoaderArgs) {
  const session = await getOptionalSession(request);
  if (session) {
    throw redirect("/dashboard");
  }
  return {};
}

export function meta({}: Route.MetaArgs) {
  return [
    { title: "Forgot Password — NoZar" },
    { name: "description", content: "Reset your NoZar account password" },
  ];
}

const SAFE_RESET_ERROR = "Unable to process your request right now. Please try again.";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const { error: resetError } = await authClient.requestPasswordReset({
        email,
        redirectTo: `${window.location.origin}/reset-password`,
      });

      if (resetError) {
        setError(
          resetError.status >= 500
            ? SAFE_RESET_ERROR
            : resetError.message ?? SAFE_RESET_ERROR,
        );
        setLoading(false);
        return;
      }

      // Regardless of whether the email exists, show success to prevent enumeration.
      setSent(true);
      setLoading(false);
    } catch {
      setError(SAFE_RESET_ERROR);
      setLoading(false);
    }
  };

  if (sent) {
    return (
      <div className="min-h-screen bg-[#030712] flex items-center justify-center px-4">
        <div className="w-full max-w-sm space-y-8 text-center">
          {/* Logo */}
          <div className="flex justify-center">
            <Link to="/" className="inline-flex items-center gap-2 group">
              <img src="/logo.svg" alt="NoZar" className="w-12 h-12 rounded-xl" />
            </Link>
          </div>

          {/* Success */}
          <div className="flex justify-center">
            <CheckCircle className="w-16 h-16 text-emerald-400" />
          </div>

          <h1 className="text-2xl font-black uppercase tracking-tight text-white">
            Check Your Email
          </h1>
          <p className="text-sm text-slate-400">
            If an account exists for <strong className="text-white">{email}</strong>,
            we've sent a password reset link. Check your inbox (and spam folder).
          </p>

          <Link to="/login">
            <Button variant="nozar" size="lg" className="w-full">
              Back to Sign In
            </Button>
          </Link>

          <button
            type="button"
            className="text-sm text-slate-500 hover:text-slate-300 transition-colors underline underline-offset-4"
            onClick={() => {
              setSent(false);
              setEmail("");
              setError("");
            }}
          >
            Try a different email
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#030712] flex items-center justify-center px-4">
      <div className="w-full max-w-sm space-y-8">
        {/* Logo */}
        <div className="text-center">
          <Link to="/" className="inline-flex items-center gap-2 group">
            <img src="/logo.svg" alt="NoZar" className="w-12 h-12 rounded-xl" />
          </Link>
          <h1 className="mt-4 text-2xl font-black uppercase tracking-tight text-white">
            Forgot Password
          </h1>
          <p className="mt-1 text-sm text-slate-400">
            Enter your email to receive a reset link
          </p>
        </div>

        {/* Error message */}
        {error && (
          <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-xs font-mono text-center">
            {error}
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          {loading && <LoadingBar />}
          <Input
            label="Email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@example.com"
            required
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
                Sending reset link...
              </>
            ) : (
              "Send Reset Link"
            )}
          </Button>
        </form>

        {/* Back to login */}
        <p className="text-center text-sm text-slate-400">
          Remember your password?{" "}
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

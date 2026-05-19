import { useState } from "react";
import { Link, useNavigate } from "react-router";
import type { Route } from "./+types/reset-password";
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
    { title: "Reset Password — NoZar" },
    { name: "description", content: "Set a new password for your NoZar account" },
  ];
}

const SAFE_RESET_ERROR = "Unable to reset your password right now. Please try again.";

export default function ResetPasswordPage(_props: Route.ComponentProps) {
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [token] = useState(
    typeof window !== "undefined"
      ? new URLSearchParams(window.location.search).get("token") ?? ""
      : "",
  );
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    // Client-side validation
    if (password.length < 8) {
      setError("Password must be at least 8 characters.");
      return;
    }
    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }
    if (!token) {
      setError("Invalid reset link. Please request a new one.");
      return;
    }

    setLoading(true);

    try {
      const { error: resetError } = await authClient.resetPassword({
        newPassword: password,
        token,
      });

      if (resetError) {
        setError(
          resetError.status && resetError.status >= 500
            ? SAFE_RESET_ERROR
            : resetError.message ?? SAFE_RESET_ERROR,
        );
        setLoading(false);
        return;
      }

      setSuccess(true);
      setLoading(false);
    } catch {
      setError(SAFE_RESET_ERROR);
      setLoading(false);
    }
  };

  if (success) {
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
            Password Reset
          </h1>
          <p className="text-sm text-slate-400">
            Your password has been updated. Sign in with your new password.
          </p>

          <button
            type="button"
            onClick={() => navigate("/login")}
            className="w-full"
          >
            <Button variant="nozar" size="lg" className="w-full">
              Sign In
            </Button>
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
            New Password
          </h1>
          <p className="mt-1 text-sm text-slate-400">
            Set a new password for your account
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
            label="New Password"
            type="password"
            autoComplete="new-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Min 8 characters"
            minLength={8}
            required
          />
          <Input
            label="Confirm Password"
            type="password"
            autoComplete="new-password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            placeholder="Re-enter your password"
            minLength={8}
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
                Resetting password...
              </>
            ) : (
              "Reset Password"
            )}
          </Button>
        </form>

        {/* No-valid-link state */}
        {!token && !error && (
          <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/20 text-center">
            <p className="text-sm text-amber-400">
              No reset token found. Make sure you clicked the link from your email.
            </p>
            <Link
              to="/forgot-password"
              className="text-sm text-emerald-400 hover:text-emerald-300 font-medium mt-2 inline-block"
            >
              Request a new reset link
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}

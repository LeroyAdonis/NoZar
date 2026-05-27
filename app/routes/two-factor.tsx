import { useState } from "react";
import { Link, useNavigate, redirect } from "react-router";
import type { Route } from "./+types/two-factor";
import { authClient } from "~/lib/auth.client";
import { getOptionalSession } from "~/lib/auth.server";
import { Input } from "~/components/ui/input";
import { Button } from "~/components/ui/button";

export async function loader({ request }: Route.LoaderArgs) {
  const session = await getOptionalSession(request);
  if (session) throw redirect("/dashboard");
  return {};
}

export function meta({}: Route.MetaArgs) {
  return [
    { title: "Two-Factor Authentication — NoZar" },
    { name: "description", content: "Verify your identity with your authenticator app" },
  ];
}

export default function TwoFactorPage() {
  const navigate = useNavigate();
  const [code, setCode] = useState("");
  const [trustDevice, setTrustDevice] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (!code.trim() || !/^\d{6}$/.test(code.trim())) {
      setError("Enter the 6-digit code from your authenticator app");
      return;
    }
    setLoading(true);
    try {
      await authClient.twoFactor.verifyTotp(
        { code: code.trim(), trustDevice },
        {
          onSuccess: () => {
            setLoading(false);
            navigate("/dashboard");
          },
          onError: (ctx: { error: { message?: string } }) => {
            setError(ctx.error.message ?? "Invalid code. Please try again.");
            setLoading(false);
          },
        },
      );
    } catch {
      setError("Unable to verify right now. Please try again.");
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#030712] flex items-center justify-center px-4">
      <div className="w-full max-w-sm space-y-8">
        {/* Logo */}
        <div className="text-center">
          <Link to="/" className="inline-flex items-center gap-2 group">
            <img src="/logo.svg" alt="NoZar" className="w-12 h-12 rounded-xl" />
          </Link>
          <h1 className="mt-4 text-2xl font-black uppercase tracking-tight text-white">
            Two-Factor Auth
          </h1>
          <p className="mt-1 text-sm text-slate-400">
            Open your authenticator app and enter the 6-digit code
          </p>
        </div>

        {/* Error */}
        {error && (
          <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-xs font-mono text-center">
            {error}
          </div>
        )}

        {/* Code form */}
        <form onSubmit={handleVerify} className="space-y-4">
          <Input
            label="Authenticator Code"
            type="text"
            inputMode="numeric"
            autoComplete="one-time-code"
            maxLength={6}
            value={code}
            onChange={(e) => setCode(e.target.value)}
            placeholder="123456"
          />

          {/* D-13: trustDevice nice-to-have — included per CONTEXT.md specifics */}
          <label className="flex items-center gap-3 cursor-pointer group">
            <input
              type="checkbox"
              checked={trustDevice}
              onChange={(e) => setTrustDevice(e.target.checked)}
              className="w-4 h-4 rounded border-white/20 bg-white/5 text-emerald-500 focus:ring-emerald-500 focus:ring-offset-0"
            />
            <span className="text-xs text-slate-400 group-hover:text-slate-300 transition-colors">
              Trust this device for 30 days
            </span>
          </label>

          <Button
            type="submit"
            variant="nozar"
            size="lg"
            disabled={loading}
            className="w-full"
          >
            {loading ? "Verifying…" : "Verify Code"}
          </Button>
        </form>

        {/* Backup code link */}
        <p className="text-center text-xs text-slate-500">
          Can&apos;t access your authenticator?{" "}
          <button
            type="button"
            onClick={async () => {
              const backupCode = prompt("Enter a backup code:");
              if (!backupCode?.trim()) return;
              setLoading(true);
              try {
                await authClient.twoFactor.verifyBackupCode(
                  { code: backupCode.trim() },
                  {
                    onSuccess: () => navigate("/dashboard"),
                    onError: (ctx: { error: { message?: string } }) =>
                      setError(ctx.error.message ?? "Invalid backup code"),
                  },
                );
              } finally {
                setLoading(false);
              }
            }}
            className="text-emerald-400 hover:text-emerald-300 underline"
          >
            Use a backup code
          </button>
        </p>
      </div>
    </div>
  );
}

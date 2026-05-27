import { useState, useEffect } from "react";
import { redirect } from "react-router";
import type { Route } from "./+types/settings-security";
import { requireAuth } from "~/lib/auth.server";
import { authClient } from "~/lib/auth.client";
import { Input } from "~/components/ui/input";
import { Button } from "~/components/ui/button";
import { ShieldCheck, Copy, Download, QrCode, KeyRound } from "lucide-react";

export async function loader({ request }: Route.LoaderArgs) {
  const { user } = await requireAuth(request);
  // twoFactorEnabled is managed by the Better Auth twoFactor plugin.
  // The plugin adds it to the session user object after Wave 3.
  const twoFactorEnabled = !!(user as Record<string, unknown>).twoFactorEnabled;
  return { twoFactorEnabled };
}

export function meta({}: Route.MetaArgs) {
  return [{ title: "Security Settings — NoZar" }];
}

type PageState = "idle" | "enabling" | "qr-setup" | "disabling" | "regenerating";

export default function SecuritySettingsPage({ loaderData }: Route.ComponentProps) {
  const { twoFactorEnabled: initialEnabled } = loaderData;

  const [twoFactorEnabled, setTwoFactorEnabled] = useState(initialEnabled);
  const [pageState, setPageState] = useState<PageState>("idle");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  // QR setup state
  const [totpURI, setTotpURI] = useState<string | null>(null);
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);
  const [backupCodes, setBackupCodes] = useState<string[]>([]);
  const [copiedCodes, setCopiedCodes] = useState(false);

  // D-11: Render QR code client-side from totpURI using qrcode package.
  // qrcode uses canvas/browser APIs — must not run during SSR.
  useEffect(() => {
    if (!totpURI) return;
    import("qrcode").then(({ default: QRCode }) => {
      QRCode.toDataURL(totpURI, { width: 200, margin: 2 })
        .then((dataUrl) => setQrDataUrl(dataUrl))
        .catch((err) => console.error("[security] QR render failed:", err));
    });
  }, [totpURI]);

  const handleEnable = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (!password) { setError("Enter your current password"); return; }
    setLoading(true);
    try {
      const result = await authClient.twoFactor.enable({ password });
      if (result.error) {
        setError(result.error.message ?? "Could not enable 2FA. Check your password.");
      } else if (result.data) {
        setTotpURI(result.data.totpURI);
        setBackupCodes(result.data.backupCodes ?? []);
        setTwoFactorEnabled(true);
        setPageState("qr-setup");
        setPassword("");
      }
    } catch {
      setError("Unexpected error. Please try again.");
    }
    setLoading(false);
  };

  const handleDisable = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (!password) { setError("Enter your current password"); return; }
    setLoading(true);
    try {
      const result = await authClient.twoFactor.disable({ password });
      if (result.error) {
        setError(result.error.message ?? "Could not disable 2FA. Check your password.");
      } else {
        setTwoFactorEnabled(false);
        setPageState("idle");
        setPassword("");
        setTotpURI(null);
        setQrDataUrl(null);
        setBackupCodes([]);
      }
    } catch {
      setError("Unexpected error. Please try again.");
    }
    setLoading(false);
  };

  const handleRegenerateBackupCodes = async () => {
    setError("");
    if (!password) { setError("Enter your current password"); return; }
    setLoading(true);
    try {
      const result = await authClient.twoFactor.generateBackupCodes({ password });
      if (result.error) {
        setError(result.error.message ?? "Could not regenerate backup codes.");
      } else {
        setBackupCodes(result.data?.backupCodes ?? []);
        setPageState("qr-setup");
        setPassword("");
      }
    } catch {
      setError("Unexpected error. Please try again.");
    }
    setLoading(false);
  };

  const handleCopyCodes = () => {
    navigator.clipboard.writeText(backupCodes.join("\n")).then(() => {
      setCopiedCodes(true);
      setTimeout(() => setCopiedCodes(false), 2000);
    });
  };

  const handleDownloadCodes = () => {
    const blob = new Blob([backupCodes.join("\n")], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "nozar-backup-codes.txt";
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="max-w-lg mx-auto px-4 py-8 space-y-6">
      {/* Page header */}
      <div className="space-y-1">
        <div className="flex items-center gap-2">
          <ShieldCheck className="w-5 h-5 text-emerald-400" />
          <h1 className="text-xl font-black uppercase tracking-tighter text-white">
            Security
          </h1>
        </div>
        <p className="text-sm text-slate-400">
          Manage two-factor authentication for your NoZar account.
        </p>
      </div>

      {/* Error */}
      {error && (
        <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-xs font-mono">
          {error}
        </div>
      )}

      {/* ── QR Setup State (after enabling or regenerating backup codes) ── */}
      {pageState === "qr-setup" && (
        <div className="rounded-2xl border border-white/10 bg-[#0F172A] p-6 space-y-6">
          <div className="text-center space-y-2">
            <QrCode className="w-8 h-8 text-emerald-400 mx-auto" />
            <h2 className="text-lg font-black uppercase tracking-tighter text-white">
              Scan this QR Code
            </h2>
            <p className="text-xs text-slate-400">
              Open Google Authenticator, Authy, or any TOTP app and scan the
              QR code below. Then sign in to confirm setup.
            </p>
          </div>

          {/* QR code image — rendered client-side from totpURI */}
          {qrDataUrl ? (
            <div className="flex justify-center">
              <img
                src={qrDataUrl}
                alt="TOTP QR Code"
                className="rounded-xl bg-white p-3"
                width={200}
                height={200}
              />
            </div>
          ) : (
            <div className="flex justify-center">
              <div className="w-[200px] h-[200px] rounded-xl bg-white/5 border border-white/10 flex items-center justify-center">
                <span className="text-xs text-slate-500">Loading QR…</span>
              </div>
            </div>
          )}

          {/* Manual entry key */}
          {totpURI && (
            <div className="space-y-1">
              <p className="text-[10px] font-mono uppercase tracking-widest text-slate-500">
                Manual Entry Key
              </p>
              <p className="font-mono text-xs text-slate-300 bg-white/5 rounded-lg px-3 py-2 break-all select-all">
                {/* Extract the secret from otpauth://totp/...?secret=XXX&... */}
                {new URL(totpURI).searchParams.get("secret") ?? "—"}
              </p>
            </div>
          )}

          {/* Backup codes — shown once */}
          {backupCodes.length > 0 && (
            <div className="space-y-3">
              <div className="space-y-1">
                <p className="text-[10px] font-mono uppercase tracking-widest text-slate-500">
                  Backup Codes
                </p>
                <p className="text-xs text-amber-400">
                  Save these now — they won&apos;t be shown again.
                </p>
              </div>
              <div className="grid grid-cols-2 gap-2">
                {backupCodes.map((c) => (
                  <span
                    key={c}
                    className="font-mono text-xs text-slate-300 bg-white/5 rounded-lg px-3 py-1.5 text-center"
                  >
                    {c}
                  </span>
                ))}
              </div>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={handleCopyCodes}
                  className="flex-1 flex items-center justify-center gap-2 rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-xs font-semibold text-slate-300 hover:bg-white/10 transition-colors"
                >
                  <Copy className="w-3.5 h-3.5" />
                  {copiedCodes ? "Copied!" : "Copy All"}
                </button>
                <button
                  type="button"
                  onClick={handleDownloadCodes}
                  className="flex-1 flex items-center justify-center gap-2 rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-xs font-semibold text-slate-300 hover:bg-white/10 transition-colors"
                >
                  <Download className="w-3.5 h-3.5" />
                  Download
                </button>
              </div>
            </div>
          )}

          <Button
            type="button"
            variant="nozar"
            size="lg"
            className="w-full"
            onClick={() => { setPageState("idle"); setTotpURI(null); setQrDataUrl(null); }}
          >
            Done — 2FA is Active
          </Button>
        </div>
      )}

      {/* ── Idle State ── */}
      {pageState === "idle" && (
        <div className="rounded-2xl border border-white/10 bg-[#0F172A] p-6 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-bold text-white">
                Authenticator App (TOTP)
              </p>
              <p className="text-xs text-slate-400 mt-0.5">
                {twoFactorEnabled
                  ? "Two-factor authentication is enabled."
                  : "Add an extra layer of security to your account."}
              </p>
            </div>
            <span
              className={`text-[10px] font-mono uppercase tracking-widest px-2 py-1 rounded-full ${
                twoFactorEnabled
                  ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                  : "bg-white/5 text-slate-500 border border-white/10"
              }`}
            >
              {twoFactorEnabled ? "Enabled" : "Disabled"}
            </span>
          </div>

          {!twoFactorEnabled ? (
            /* Enable 2FA — password confirm */
            <form onSubmit={handleEnable} className="space-y-3 pt-2 border-t border-white/5">
              <Input
                label="Current Password"
                type="password"
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Confirm your password to enable 2FA"
                required
                suppressHydrationWarning
              />
              <Button
                type="submit"
                variant="nozar"
                size="lg"
                className="w-full"
                disabled={loading}
              >
                {loading ? "Enabling…" : "Enable Two-Factor Auth"}
              </Button>
            </form>
          ) : (
            /* Enabled state — disable or regenerate */
            <div className="space-y-3 pt-2 border-t border-white/5">
              <form onSubmit={handleDisable} className="space-y-3">
                <Input
                  label="Current Password"
                  type="password"
                  autoComplete="current-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Confirm your password"
                  required
                  suppressHydrationWarning
                />
                <div className="flex gap-2">
                  <Button
                    type="submit"
                    variant="nozarOutline"
                    size="lg"
                    className="flex-1"
                    disabled={loading}
                  >
                    {loading ? "Disabling…" : "Disable 2FA"}
                  </Button>
                  <Button
                    type="button"
                    variant="nozarOutline"
                    size="lg"
                    className="flex-1"
                    disabled={loading || !password}
                    onClick={() => handleRegenerateBackupCodes()}
                  >
                    <KeyRound className="w-4 h-4 mr-1.5" />
                    Regen Codes
                  </Button>
                </div>
              </form>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

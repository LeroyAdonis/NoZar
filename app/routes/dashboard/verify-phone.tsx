import { Form, useNavigation, redirect, Link } from "react-router";
import { Phone, ShieldCheck, ArrowLeft, RefreshCw } from "lucide-react";
import { eq } from "drizzle-orm";

import type { Route } from "./+types/verify-phone";
import { requireAuth } from "~/lib/auth.server";
import { db } from "~/lib/db.server";
import { profiles } from "~/lib/schema";
import {
  isOtpConfigured,
  normalizeZaPhone,
  sendOtp,
  verifyOtp,
} from "~/lib/otp.server";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { LoadingBar, Spinner } from "~/components/ui/loading-indicator";

// ─── Meta ──────────────────────────────────────────────────────

export function meta({}: Route.MetaArgs) {
  return [
    { title: "Verify Phone — Nozar" },
    { name: "description", content: "Add and verify your phone number" },
  ];
}

// ─── Loader ────────────────────────────────────────────────────

export async function loader({ request }: Route.LoaderArgs) {
  const { user } = await requireAuth(request);

  const [profile] = await db
    .select({ phone: profiles.phone, phoneVerified: profiles.phoneVerified })
    .from(profiles)
    .where(eq(profiles.userId, user.id))
    .limit(1);

  return {
    otpConfigured: isOtpConfigured(),
    currentPhone: profile?.phone ?? null,
    currentPhoneVerified: profile?.phoneVerified ?? false,
  };
}

// ─── Action ────────────────────────────────────────────────────

// Discriminated union so the component knows which step to render.
type ActionResult =
  | { step: "send"; error: string }
  | { step: "verify"; phone: string; error?: string };

export async function action({ request }: Route.ActionArgs): Promise<ActionResult> {
  const { user } = await requireAuth(request);
  const formData = await request.formData();
  const intent = formData.get("intent") as string;

  // ── Step 1: send OTP ─────────────────────────────────────────
  if (intent === "send-otp") {
    const rawPhone = ((formData.get("phone") as string) ?? "").trim();
    const phone = normalizeZaPhone(rawPhone);

    if (!phone) {
      return {
        step: "send",
        error:
          "Invalid phone number. Use SA format: +27XXXXXXXXX or 0XXXXXXXXX",
      };
    }

    try {
      const { code } = await sendOtp(phone);

      // Log code to server console in non-production so devs can test
      // without real AT credentials.  Never sent to the client.
      if (
        process.env.NODE_ENV !== "production" ||
        process.env.AFRICASTALKING_SANDBOX === "true"
      ) {
        console.log(`[OTP DEV] Phone: ${phone}  Code: ${code}`);
      }

      return { step: "verify", phone };
    } catch (err) {
      console.error("[OTP] sendOtp failed:", err);
      return {
        step: "send",
        error:
          "Could not send verification code. Please check the number and try again.",
      };
    }
  }

  // ── Step 2: verify OTP ───────────────────────────────────────
  if (intent === "verify-otp") {
    const phone = ((formData.get("phone") as string) ?? "").trim();
    const code = ((formData.get("code") as string) ?? "").trim();

    if (!phone || !code) {
      return { step: "verify", phone, error: "Phone and code are required." };
    }

    const valid = await verifyOtp(phone, code);

    if (!valid) {
      return {
        step: "verify",
        phone,
        error: "Incorrect or expired code. Request a new one if needed.",
      };
    }

    // Persist verified phone to profile.
    await db
      .update(profiles)
      .set({ phone, phoneVerified: true, updatedAt: new Date() })
      .where(eq(profiles.userId, user.id));

    // Redirect — throws, so TypeScript doesn't count it in return type.
    throw redirect("/dashboard/profile");
  }

  return { step: "send", error: "Unknown action." };
}

// ─── Component ─────────────────────────────────────────────────

export default function VerifyPhone({
  loaderData,
  actionData,
}: Route.ComponentProps) {
  const { otpConfigured, currentPhone, currentPhoneVerified } = loaderData;
  const navigation = useNavigation();
  const isSubmitting = navigation.state === "submitting";
  const submittingIntent = isSubmitting
    ? (navigation.formData?.get("intent") as string | null)
    : null;

  // Derive current step from last action result.
  const step = actionData?.step ?? "send";
  const verifyPhone =
    actionData && "phone" in actionData ? actionData.phone : "";

  return (
    <div className="space-y-6">
      {isSubmitting && <LoadingBar />}

      {/* Section label */}
      <div className="pt-2">
        <span className="text-emerald-500 font-mono text-[10px] uppercase tracking-widest block mb-1">
          // Phone Verification
        </span>
        <h2 className="text-xl font-bold uppercase tracking-tight">
          Verify Phone
        </h2>
      </div>

      {/* Back link */}
      <Link
        to="/dashboard/profile"
        className="inline-flex items-center gap-1.5 text-[10px] font-mono uppercase tracking-widest text-slate-500 hover:text-slate-300 transition-colors"
      >
        <ArrowLeft className="w-3 h-3" />
        Back to profile
      </Link>

      {/* Already verified banner */}
      {currentPhoneVerified && currentPhone && (
        <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-2xl px-5 py-4 flex items-center gap-3">
          <ShieldCheck className="w-5 h-5 text-emerald-400 flex-shrink-0" />
          <div>
            <p className="text-sm text-emerald-300 font-medium">
              {currentPhone} is verified
            </p>
            <p className="text-[10px] font-mono uppercase tracking-widest text-emerald-500 mt-0.5">
              You can update it by entering a new number below
            </p>
          </div>
        </div>
      )}

      {/* AT credentials not configured */}
      {!otpConfigured && (
        <div className="bg-amber-500/10 border border-amber-500/20 rounded-2xl px-5 py-4">
          <p className="text-sm text-amber-300 font-medium mb-1">
            Phone verification unavailable
          </p>
          <p className="text-[10px] font-mono text-amber-500/80 uppercase tracking-widest leading-relaxed">
            Africa&apos;s Talking API credentials are not configured.
            Set{" "}
            <code className="text-amber-400 normal-case">
              AFRICASTALKING_API_KEY
            </code>{" "}
            and{" "}
            <code className="text-amber-400 normal-case">
              AFRICASTALKING_USERNAME
            </code>{" "}
            in your environment variables.
          </p>
        </div>
      )}

      {/* ── Step 1: Enter phone number ───────────────────────── */}
      {(step === "send" || !actionData) && (
        <div className="bg-[#0F172A] border border-white/10 rounded-3xl p-6 space-y-5">
          <div>
            <span className="text-[10px] font-mono uppercase tracking-widest text-slate-400 block mb-1">
              Step 1 of 2
            </span>
            <h3 className="font-bold text-white">Enter your phone number</h3>
            <p className="text-xs text-slate-500 mt-1">
              A 6-digit code will be sent via SMS. SA numbers only.
            </p>
          </div>

          {/* Error from send-otp */}
          {actionData?.step === "send" && actionData.error && (
            <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-xs font-mono">
              {actionData.error}
            </div>
          )}

          <Form method="post" className="space-y-4">
            <input type="hidden" name="intent" value="send-otp" />

            <div>
              <label
                htmlFor="phone"
                className="text-[10px] font-mono uppercase tracking-widest text-slate-400 mb-1.5 block"
              >
                SA Phone Number
              </label>
              <div className="relative">
                <Phone className="absolute left-3.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-500 pointer-events-none" />
                <input
                  id="phone"
                  name="phone"
                  type="tel"
                  defaultValue={currentPhone ?? ""}
                  placeholder="+27 82 123 4567 or 082 123 4567"
                  required
                  autoComplete="tel"
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-[#030712] border border-white/10 text-white placeholder:text-slate-500 focus:border-emerald-500/50 focus:ring-1 focus:ring-emerald-500/25 focus:outline-none font-mono text-sm"
                />
              </div>
            </div>

            <Button
              type="submit"
              variant="nozar"
              size="md"
              disabled={isSubmitting || !otpConfigured}
              className="w-full"
            >
              {submittingIntent === "send-otp" ? (
                <>
                  <Spinner />
                  Sending code...
                </>
              ) : (
                "Send Verification Code"
              )}
            </Button>

            {!otpConfigured && (
              <p className="text-[10px] font-mono uppercase tracking-widest text-slate-600 text-center">
                Sending disabled — configure AT credentials first
              </p>
            )}
          </Form>
        </div>
      )}

      {/* ── Step 2: Enter OTP ────────────────────────────────── */}
      {step === "verify" && (
        <div className="bg-[#0F172A] border border-white/10 rounded-3xl p-6 space-y-5">
          <div>
            <span className="text-[10px] font-mono uppercase tracking-widest text-slate-400 block mb-1">
              Step 2 of 2
            </span>
            <h3 className="font-bold text-white">Enter your code</h3>
            <p className="text-xs text-slate-500 mt-1">
              We sent a 6-digit code to{" "}
              <span className="text-slate-300 font-mono">{verifyPhone}</span>.
              Valid for 10 minutes.
            </p>
          </div>

          {/* Error from verify-otp */}
          {actionData?.step === "verify" && actionData.error && (
            <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-xs font-mono">
              {actionData.error}
            </div>
          )}

          <Form method="post" className="space-y-4">
            <input type="hidden" name="intent" value="verify-otp" />
            {/* Pass phone through so the action knows which record to check */}
            <input type="hidden" name="phone" value={verifyPhone} />

            <div>
              <label
                htmlFor="code"
                className="text-[10px] font-mono uppercase tracking-widest text-slate-400 mb-1.5 block"
              >
                6-Digit Code
              </label>
              <input
                id="code"
                name="code"
                type="text"
                inputMode="numeric"
                pattern="[0-9]{6}"
                maxLength={6}
                placeholder="123456"
                required
                autoComplete="one-time-code"
                autoFocus
                className="w-full px-4 py-2.5 rounded-xl bg-[#030712] border border-white/10 text-white placeholder:text-slate-500 focus:border-emerald-500/50 focus:ring-1 focus:ring-emerald-500/25 focus:outline-none font-mono text-2xl tracking-[0.4em] text-center"
              />
            </div>

            <Button
              type="submit"
              variant="nozar"
              size="md"
              disabled={isSubmitting}
              className="w-full"
            >
              {submittingIntent === "verify-otp" ? (
                <>
                  <Spinner />
                  Verifying...
                </>
              ) : (
                "Verify Code"
              )}
            </Button>
          </Form>

          {/* Resend — re-submit step 1 with the same phone */}
          <div className="flex items-center justify-between pt-2 border-t border-white/5">
            <p className="text-[10px] font-mono uppercase tracking-widest text-slate-600">
              Didn&apos;t receive it?
            </p>
            <Form method="post">
              <input type="hidden" name="intent" value="send-otp" />
              <input type="hidden" name="phone" value={verifyPhone} />
              <button
                type="submit"
                disabled={isSubmitting}
                className="flex items-center gap-1 text-[10px] font-mono uppercase tracking-widest text-slate-500 hover:text-emerald-400 transition-colors disabled:opacity-40"
              >
                <RefreshCw className="w-3 h-3" />
                Resend code
              </button>
            </Form>
          </div>
        </div>
      )}
    </div>
  );
}

import { Form, Link, redirect } from "react-router";
import { Mail, RefreshCw, LogOut } from "lucide-react";
import type { Route } from "./+types/verify-email";
import { auth, requireAuth } from "~/lib/auth.server";

export async function loader({ request }: Route.LoaderArgs) {
  const { user } = await requireAuth(request);

  // Already verified — send them straight to the dashboard.
  if (user.emailVerified) {
    throw redirect("/dashboard");
  }

  return { email: user.email };
}

export async function action({ request }: Route.ActionArgs) {
  const { user } = await requireAuth(request);
  const formData = await request.formData();
  const intent = formData.get("intent");

  if (intent === "resend") {
    try {
      await auth.api.sendVerificationEmail({
        body: { email: user.email, callbackURL: "/dashboard" },
        headers: request.headers,
      });
      return { resent: true, error: null };
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Unknown error";
      console.error("[verify-email] resend failed:", message);
      return { resent: false, error: "Failed to send verification email. Please try again shortly." };
    }
  }

  if (intent === "signout") {
    await auth.api.signOut({ headers: request.headers });
    throw redirect("/login");
  }

  return { resent: false, error: null };
}

export function meta({}: Route.MetaArgs) {
  return [
    { title: "Verify Your Email — NoZar" },
    { name: "description", content: "Check your inbox to verify your NoZar email address." },
  ];
}

export default function VerifyEmailPage({ loaderData, actionData }: Route.ComponentProps) {
  const { email } = loaderData;
  const resent = actionData?.resent ?? false;
  const error = actionData?.error ?? null;

  return (
    <div className="min-h-screen bg-[#030712] flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8">
          <Link to="/" className="inline-block">
            <span className="font-black uppercase tracking-tighter text-2xl text-emerald-500">
              NoZar
            </span>
          </Link>
        </div>

        {/* Card */}
        <div className="bg-[#0F172A] border border-white/10 rounded-2xl p-8">
          {/* Icon */}
          <div className="flex justify-center mb-6">
            <div className="w-14 h-14 rounded-full bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center">
              <Mail className="w-7 h-7 text-emerald-400" />
            </div>
          </div>

          {/* Heading */}
          <h1 className="font-black uppercase tracking-tighter text-2xl text-white text-center mb-2">
            Check Your Inbox
          </h1>

          {/* Subtext */}
          <p className="text-slate-400 text-sm text-center leading-relaxed mb-1">
            We sent a verification link to:
          </p>
          <p className="text-emerald-400 text-sm font-mono text-center mb-6 break-all">
            {email}
          </p>

          <p className="text-slate-500 text-xs text-center leading-relaxed mb-8">
            Click the link in that email to activate your account.
            If you don&apos;t see it, check your spam folder.
          </p>

          {/* Resend feedback */}
          {resent && (
            <div className="mb-4 px-4 py-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-mono uppercase tracking-widest text-center">
              ✓ Verification email resent — check your inbox
            </div>
          )}
          {error && (
            <div className="mb-4 px-4 py-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-xs font-mono uppercase tracking-widest text-center">
              {error}
            </div>
          )}

          {/* Resend button */}
          <Form method="post">
            <input type="hidden" name="intent" value="resend" />
            <button
              type="submit"
              className="w-full flex items-center justify-center gap-2 bg-emerald-500 hover:bg-emerald-400 text-[#030712] font-black uppercase tracking-widest text-[11px] py-3.5 rounded-xl transition-colors cursor-pointer"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              Resend Verification Email
            </button>
          </Form>

          {/* Divider */}
          <div className="my-6 border-t border-white/5" />

          {/* Sign out link */}
          <Form method="post" onSubmit={() => localStorage.clear()}>
            <input type="hidden" name="intent" value="signout" />
            <button
              type="submit"
              className="w-full flex items-center justify-center gap-2 text-slate-500 hover:text-slate-300 text-xs font-mono uppercase tracking-widest transition-colors cursor-pointer"
            >
              <LogOut className="w-3 h-3" />
              Wrong email? Sign out
            </button>
          </Form>
        </div>

        {/* Help text */}
        <p className="text-slate-600 text-xs text-center mt-6">
          Need help?{" "}
          <a
            href="mailto:support@nozar.co.za"
            className="text-slate-400 hover:text-slate-200 underline transition-colors"
          >
            Contact support
          </a>
        </p>
      </div>
    </div>
  );
}

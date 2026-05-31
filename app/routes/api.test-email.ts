import { Resend } from "resend";
import type { Route } from "./+types/api.test-email";

export async function action({ request }: Route.ActionArgs) {
  if (request.method !== "POST") {
    return new Response(null, { status: 405 });
  }

  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    return Response.json({ error: "RESEND_API_KEY not set" }, { status: 500 });
  }

  // Check key format (Resend keys start with re_)
  const keyPrefix = apiKey.startsWith("re_") ? "✅ starts with re_" : "❌ does NOT start with re_";

  const resend = new Resend(apiKey);

  try {
    const result = await resend.emails.send({
      from: "NoZar <noreply@nozar.co.za>",
      to: "delivered@resend.dev", // Resend's test inbox
      subject: "NoZar test email",
      html: "<p>Test from Ricky</p>",
    });

    return Response.json({
      keyPrefix,
      success: true,
      result,
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    const stack = err instanceof Error ? err.stack : null;
    return Response.json({
      keyPrefix,
      success: false,
      error: msg,
      stack: stack?.split("\n").slice(0, 3).join("\n"),
    });
  }
}

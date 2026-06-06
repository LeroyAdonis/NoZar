import { brevo } from "~/lib/brevo.server";
import type { Route } from "./+types/api.test-email";

export async function action({ request }: Route.ActionArgs) {
  if (request.method !== "POST") {
    return new Response(null, { status: 405 });
  }

  const apiKey = process.env.BREVO_API_KEY;
  if (!apiKey) {
    return Response.json({ error: "BREVO_API_KEY not set" }, { status: 500 });
  }

  const keyPrefix = apiKey.startsWith("xkeysib-")
    ? "✅ starts with xkeysib-"
    : `⚠️ unexpected prefix: ${apiKey.slice(0, 10)}...`;

  try {
    await brevo.sendEmail({
      to: "delivered@resend.dev", // Resend's test inbox (Brevo doesn't have one, but real inboxes work)
      subject: "NoZar test email from Brevo",
      html: "<p>Test from Ricky</p>",
    });

    // Also try SMS (send to a test number if configured)
    let smsResult = "Skipped (no test number provided)";

    return Response.json({
      keyPrefix,
      emailSent: true,
      smsResult,
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    return Response.json({
      keyPrefix,
      success: false,
      error: msg,
    });
  }
}

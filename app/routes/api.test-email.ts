import type { Route } from "./+types/api.test-email";

export async function action({ request }: Route.ActionArgs) {
  if (request.method !== "POST") {
    return new Response(null, { status: 405 });
  }

  const brevoKey = process.env.BREVO_API_KEY;
  const resendKey = process.env.RESEND_API_KEY;

  // Try to send via whichever provider is available
  if (brevoKey) {
    const { brevo } = await import("~/lib/brevo.server");
    await brevo.sendEmail({
      to: "info@alientomd.com",
      subject: "Test from Ricky — forwarding check",
      html: "<p>Hey Lee! Test from Ricky via Brevo.</p>",
    });
    return Response.json({ sentVia: "brevo" });
  }

  if (resendKey) {
    const { Resend } = await import("resend");
    const resend = new Resend(resendKey);
    const result = await resend.emails.send({
      from: "NoZar <noreply@nozar.co.za>",
      to: "info@alientomd.com",
      subject: "Test from Ricky — forwarding check",
      html: "<p>Hey Lee! This is Ricky testing the alientomd.com email forwarding.</p><p>If you got this, info@alientomd.com → leegale@me.com is working! 🙌</p>",
    });
    return Response.json({ sentVia: "resend", id: result.data?.id });
  }

  return Response.json({ error: "No BREVO_API_KEY or RESEND_API_KEY set" }, { status: 500 });
}

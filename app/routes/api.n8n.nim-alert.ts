import type { ActionFunctionArgs } from "react-router";

/**
 * POST /api/n8n/nim-alert
 *
 * Receives alerts from the NVIDIA NIM Model Monitor workflow
 * when a model used by NoZar is no longer available on the API.
 *
 * Auth: Bearer token matching N8N_API_KEY.
 */
export async function action({ request }: ActionFunctionArgs) {
  if (request.method !== "POST") {
    return Response.json({ error: "Method not allowed" }, { status: 405 });
  }

  // ── Auth ────────────────────────────────────────────────────────
  const apiKey = process.env.N8N_API_KEY;
  if (!apiKey) {
    return Response.json({ error: "N8N_API_KEY not configured" }, { status: 500 });
  }
  const auth = request.headers.get("Authorization");
  if (!auth?.startsWith("Bearer ") || auth.slice(7) !== apiKey) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  // ── Parse body ──────────────────────────────────────────────────
  const body: Array<{
    model: string;
    role: string;
    suggested?: string;
    files?: string[];
  }> = await request.json();

  if (!Array.isArray(body) || body.length === 0) {
    return Response.json({ error: "Expected non-empty array of changes" }, { status: 400 });
  }

  // Log the alert
  console.log("[nim-alert] NVIDIA NIM model change detected:", JSON.stringify(body, null, 2));

  // For now, just acknowledge. Auto-fix can be added later.
  return Response.json({
    received: true,
    changes: body.length,
    message: `${body.length} model(s) need attention. Check email for details. Auto-fix coming soon.`,
    timestamp: new Date().toISOString(),
  });
}

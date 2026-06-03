import type { ActionFunctionArgs } from "react-router";
import { put } from "@vercel/blob";
import { requireAuth } from "~/lib/auth.server";
import { isBlobConfigured } from "~/lib/blob.server";

/**
 * POST /api/upload-mobile
 *
 * Server-side file upload for mobile devices. Accepts multipart/form-data with
 * a single "file" field, uploads to Vercel Blob, and returns the public URL.
 *
 * This bypasses the client-side SDK flow that browsers use, because RN's fetch
 * doesn't natively support @vercel/blob/client's two-phase upload protocol.
 */
export async function action({ request }: ActionFunctionArgs) {
  if (request.method !== "POST") {
    return Response.json({ error: "Method not allowed" }, { status: 405 });
  }

  await requireAuth(request);

  if (!isBlobConfigured()) {
    return Response.json(
      { error: "File upload not configured on server" },
      { status: 503 },
    );
  }

  try {
    const formData = await request.formData();
    const file = formData.get("file") as File | null;

    if (!file) {
      return Response.json({ error: "No file provided" }, { status: 400 });
    }

    // Validate file type
    const allowedTypes = ["image/jpeg", "image/png", "image/webp", "image/gif"];
    if (!allowedTypes.includes(file.type)) {
      return Response.json(
        { error: `Unsupported file type: ${file.type}. Allowed: ${allowedTypes.join(", ")}` },
        { status: 400 },
      );
    }

    // Validate size (5 MB max)
    if (file.size > 5 * 1024 * 1024) {
      return Response.json(
        { error: "File too large. Maximum size is 5 MB." },
        { status: 400 },
      );
    }

    const ext = file.name.split(".").pop()?.toLowerCase() ?? "jpg";
    const pathname = `listings/mobile/${Date.now()}.${ext}`;

    const blob = await put(pathname, file, {
      access: "public",
      addRandomSuffix: true,
      contentType: file.type,
    });

    return Response.json({ url: blob.url });
  } catch (error) {
    console.error("[upload-mobile] error:", error);
    return Response.json(
      { error: error instanceof Error ? error.message : "Upload failed" },
      { status: 500 },
    );
  }
}

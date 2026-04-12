// ─── Vercel Blob server-side helpers ────────────────────────────
// Requires BLOB_READ_WRITE_TOKEN env var. When not set, isBlobConfigured()
// returns false and callers must fall back to URL-only inputs.

import { put } from "@vercel/blob";

/** Returns true when a Vercel Blob store token is present in the environment. */
export function isBlobConfigured(): boolean {
  return !!process.env.BLOB_READ_WRITE_TOKEN;
}

/**
 * Upload a File object to Vercel Blob storage.
 *
 * @param file   A browser File (or any Blob) received from multipart/form-data.
 * @param folder Sub-path used as a namespace inside the store.
 * @returns      The public HTTPS URL of the uploaded blob.
 */
export async function uploadToBlob(
  file: File,
  folder: "listings" | "avatars",
): Promise<string> {
  // Derive extension from the original filename; fall back to "bin" for safety.
  const ext = file.name.split(".").pop()?.toLowerCase() ?? "bin";
  // Include timestamp + random chars to avoid collisions; addRandomSuffix doubles up.
  const pathname = `${folder}/${Date.now()}.${ext}`;

  const blob = await put(pathname, file, {
    access: "public",
    addRandomSuffix: true,
    contentType: file.type || "application/octet-stream",
  });

  return blob.url;
}

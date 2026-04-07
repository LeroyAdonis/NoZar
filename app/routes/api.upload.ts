import { type ActionFunctionArgs } from "react-router";
import { handleUpload, type HandleUploadBody } from "@vercel/blob";

/**
 * Client-upload endpoint for Vercel Blob.
 *
 * The `@vercel/blob/client` SDK on the browser calls this route twice:
 *   1. To obtain a short-lived upload token (tiny JSON body).
 *   2. A callback after the file has been written to Blob storage.
 *
 * The actual file bytes travel straight from the browser to Vercel Blob,
 * so the serverless-function 4.5 MB body limit is never hit.
 */
export async function action({ request }: ActionFunctionArgs) {
  const token = process.env.BLOB_READ_WRITE_TOKEN;
  if (!token) {
    return Response.json(
      { error: "File upload not configured" },
      { status: 503 },
    );
  }

  try {
    const body = (await request.json()) as HandleUploadBody;

    const jsonResponse = await handleUpload({
      body,
      request,
      onBeforeGenerateToken: async () => ({
        allowedContentTypes: [
          "image/jpeg",
          "image/png",
          "image/webp",
          "image/gif",
        ],
        maximumSizeInBytes: 5 * 1024 * 1024, // 5 MB
      }),
      onUploadCompleted: async ({ blob }) => {
        console.log("[upload] blob ready:", blob.url);
      },
    });

    return Response.json(jsonResponse);
  } catch (error) {
    console.error("[upload] error:", error);
    return Response.json(
      { error: error instanceof Error ? error.message : "Upload failed" },
      { status: 400 },
    );
  }
}

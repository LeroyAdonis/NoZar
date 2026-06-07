import type { ActionFunctionArgs } from "react-router";
import { getConfiguredNvidiaApiKey } from "~/lib/nvidia-config.server";

/**
 * Debug endpoint for testing NVIDIA API connectivity.
 * Only accessible via direct POST with a debug token.
 */
export async function action({ request }: ActionFunctionArgs) {
  const results: Record<string, unknown> = {};
  
  // Test 1: Check if NVIDIA_API_KEY is configured
  const key = getConfiguredNvidiaApiKey();
  results["nvidia_key_configured"] = !!key;
  results["nvidia_key_prefix"] = key ? key.substring(0, 10) + "..." : "null";
  
  // Test 2: Try basic model call
  if (key) {
    try {
      const res = await fetch("https://integrate.api.nvidia.com/v1/chat/completions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${key}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "meta/llama-3.1-8b-instruct",
          messages: [{ role: "user", content: "Say OK in 2 words." }],
          max_tokens: 10,
          temperature: 0.1,
        }),
      });
      
      results["nvidia_status"] = res.status;
      results["nvidia_body"] = res.ok ? (await res.json()).choices?.[0]?.message?.content : await res.text();
    } catch (err: unknown) {
      results["nvidia_error"] = err instanceof Error ? err.message : String(err);
    }
  }
  
  // Test 3: Check if docs file exists
  const { readFile } = await import("node:fs/promises");
  const { resolve, dirname } = await import("node:path");
  const { fileURLToPath } = await import("node:url");
  
  const __dirname = dirname(fileURLToPath(import.meta.url));
  const knowledgePath = resolve(__dirname, "..", "..", "docs", "support-knowledge.md");
  results["knowledge_path"] = knowledgePath;
  
  try {
    const content = await readFile(knowledgePath, "utf-8");
    results["knowledge_exists"] = true;
    results["knowledge_size"] = content.length;
  } catch {
    results["knowledge_exists"] = false;
  }
  
  // Test 4: Check alternative paths
  const altPath1 = resolve(__dirname, "..", "docs", "support-knowledge.md");
  try {
    await readFile(altPath1, "utf-8");
    results["alt_path_1_exists"] = true;
  } catch {
    results["alt_path_1_exists"] = false;
  }
  results["alt_path_1"] = altPath1;
  
  return Response.json(results);
}

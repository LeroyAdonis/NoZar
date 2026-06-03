import type { LoaderFunctionArgs } from "react-router";
import { requireAuth } from "~/lib/auth.server";
import { db } from "~/lib/db.server";
import { eq } from "drizzle-orm";
import { profiles } from "~/lib/schema";
import { translateListing, translateMessage, detectLanguage } from "~/lib/translator.server";
import { resolveLanguage } from "~/lib/sa-languages";

export async function loader({ request }: LoaderFunctionArgs) {
  const { user } = await requireAuth(request);

  // Get user's preferred language from their profile
  const [profile] = await db
    .select()
    .from(profiles)
    .where(eq(profiles.userId, user.id))
    .limit(1);

  const userLang = resolveLanguage(profile?.preferredLanguage ?? "en");

  const url = new URL(request.url);
  const type = url.searchParams.get("type"); // "listing" or "message"
  const targetLang = url.searchParams.get("lang") ?? userLang;

  if (type === "listing") {
    const title = url.searchParams.get("title") ?? "";
    const description = url.searchParams.get("description") ?? "";
    const seeking = url.searchParams.get("seeking");

    const result = await translateListing(title, description, seeking, resolveLanguage(targetLang));
    return { translated: true, ...result };
  }

  if (type === "message") {
    const text = url.searchParams.get("text") ?? "";
    const detected = await detectLanguage(text);
    const result = await translateMessage(text, resolveLanguage(targetLang));
    return { translated: true, detected, text: result, targetLang };
  }

  return { translated: false, error: "Invalid type. Use ?type=listing or ?type=message" };
}

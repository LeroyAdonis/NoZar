import { analyzePhotoQuality, qualityRatingColor } from "~/lib/photo-quality.server";
import type { Route } from "./+types/api.photo-quality";

export async function action({ request }: Route.ActionArgs) {
  const formData = await request.formData();
  const imageUrl = formData.get("imageUrl") as string | null;

  if (!imageUrl || !imageUrl.startsWith("https://")) {
    return { error: "Valid image URL required" };
  }

  try {
    const result = await analyzePhotoQuality(imageUrl);
    return { ...result, color: qualityRatingColor(result.overallRating) };
  } catch (err) {
    console.error("[photo-quality] Analysis failed:", err);
    return { error: "Could not analyze photo. Try a clearer image." };
  }
}

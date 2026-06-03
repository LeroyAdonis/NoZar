import { useEffect, useRef, useState } from "react";
import { Form, Link, redirect, useFetcher, useNavigate, useNavigation } from "react-router";
import { CameraCapture } from "~/components/ui/camera-capture";
import {
  Monitor,
  Home,
  Shirt,
  Wrench,
  Car,
  Dumbbell,
  Book,
  Briefcase,
  Camera,
  Check,
  CreditCard,
  ImagePlus,
  Layers,
  Loader2,
  Lock,
  MapPin,
  PackagePlus,
  Plus,
  Sparkles,
  Trash2,
  Upload,
  X,
} from "lucide-react";
import { AiServiceError, generateContent } from "~/lib/ai.server";
import type { Route } from "./+types/add";
import { requireAuth } from "~/lib/auth.server";
import { db } from "~/lib/db.server";
import { listings, listingImages, profiles } from "~/lib/schema";
import { eq } from "drizzle-orm";
import { getListingUsage, getUserTier } from "~/lib/tier-limits.server";
import type { ListingUsage } from "~/lib/tier-limits";
import { canUseAiFeature } from "~/lib/tier-limits";
import {
  validateImageUrl,
  sanitizeImageUrl,
} from "~/lib/media-validation.server";
import { Input } from "~/components/ui/input";
import { Textarea } from "~/components/ui/textarea";
import { Button } from "~/components/ui/button";
import { LoadingBar, Spinner } from "~/components/ui/loading-indicator";
import { useHaptics } from "~/components/ui/haptic-provider";

// ─── Constants ─────────────────────────────────────────────────

const CATEGORIES = [
  { name: "Electronics", icon: Monitor },
  { name: "Home & Garden", icon: Home },
  { name: "Fashion", icon: Shirt },
  { name: "Skills", icon: Briefcase },
  { name: "Vehicles", icon: Car },
  { name: "Sports", icon: Dumbbell },
  { name: "Books", icon: Book },
  { name: "Services", icon: Wrench },
] as const;

const CONDITIONS = ["New", "Like New", "Good", "Fair", "Poor"] as const;

const DELIVERY_METHODS = ["Pickup", "Delivery", "Either"] as const;

const selectStyles =
  "w-full rounded-xl bg-[#0F172A] border border-white/10 text-white focus:border-emerald-500/50 focus:ring-1 focus:ring-emerald-500/25 focus:outline-none px-4 py-2.5 appearance-none cursor-pointer";

const textareaStyles =
  "w-full rounded-xl bg-[#0F172A] border border-white/10 text-white placeholder:text-slate-500 focus:border-emerald-500/50 focus:ring-1 focus:ring-emerald-500/25 focus:outline-none px-4 py-2.5 resize-none";

// ─── Helpers ───────────────────────────────────────────────────

/** Apply ±0.005° (~±500 m) random offset so co-located pins remain visible. */
function jitterCoord(value: number): number {
  return value + (Math.random() - 0.5) * 0.01;
}

// ─── Meta ──────────────────────────────────────────────────────

export function meta({}: Route.MetaArgs) {
  return [
    { title: "Add Asset — NoZar" },
    { name: "description", content: "List a new item or service for barter" },
  ];
}

// ─── Loader ────────────────────────────────────────────────────

export async function loader({ request }: Route.LoaderArgs) {
  const { user } = await requireAuth(request);
  const usage = await getListingUsage(user.id);
  return { usage };
}

// ─── Action ────────────────────────────────────────────────────

export async function action({ request }: Route.ActionArgs) {
  // ─── Geocoding (server-only) ─────────────────────────────────
  async function geocodeSuburb(
    suburb: string,
  ): Promise<{ lat: number; lng: number } | null> {
    const apiKey = process.env.GOOGLE_MAPS_API_KEY;
    if (
      !apiKey ||
      apiKey === "YOUR_GOOGLE_MAPS_API_KEY" ||
      apiKey === "YOUR_GEMINI_API_KEY"
    ) {
      console.error("[geocodeSuburb] Google Maps API key not configured");
      return null;
    }

    const address = encodeURIComponent(`${suburb}, South Africa`);
    const url = `https://maps.googleapis.com/maps/api/geocode/json?address=${address}&key=${apiKey}`;

    try {
      const res = await fetch(url);
      const data = await res.json();

      if (data.status !== "OK" || !data.results || data.results.length === 0) {
        console.error(
          "[geocodeSuburb] Geocoding failed for",
          suburb,
          "— status:",
          data.status,
        );
        return null;
      }

      const { lat, lng } = data.results[0].geometry.location;
      return { lat, lng };
    } catch (err) {
      console.error("[geocodeSuburb] Fetch error for", suburb, err);
      return null;
    }
  }

  // ─── AI helpers (server-only) ──────────────────────────────────
  async function generateDescription(
    title: string,
    category: string,
  ): Promise<string> {
    const prompt = `Write a compelling 2-3 sentence listing description for NoZar, a South African barter platform.
Item title: "${title}"
Category: ${category}

Requirements:
- Use natural South African English.
- Make the copy sound useful and specific, not generic.
- Mention practical details a barter partner would care about, like likely condition, standout features, scope, or common use cases.
- If the title is short or vague, expand it into a fuller, more helpful description without inventing exact specs you do not know.
- Keep it concise and persuasive.
- Return plain text only.`;
    return await generateContent(prompt);
  }

  const formData = await request.formData();
  const intent = formData.get("intent") as string | null;

  // Auth gate for all intents (requireAuth throws redirect to /login if not authenticated)
  const { user } = await requireAuth(request);

  // ── AI Description ────────────────────────────────────────
  if (intent === "aiDescription") {
    const title = (formData.get("title") as string) || "";
    const category = (formData.get("category") as string) || "";

    if (!title.trim()) {
      return { aiError: "Enter a title first so the AI can help." };
    }

    const tier = await getUserTier(user.id);
    if (!canUseAiFeature(tier, "ai_description")) {
      return { aiError: "ai_tier_restricted" };
    }

    try {
      const aiSuggestion = await generateDescription(
        title.trim(),
        category || "General",
      );
      return { aiSuggestion };
    } catch (error) {
      return {
        aiError:
          error instanceof AiServiceError &&
          error.code === "nvidia_not_configured"
            ? "AI Assist is unavailable right now — NVIDIA AI is not configured on the server."
            : "AI Assist could not generate a description right now — please try again.",
      };
    }
  }

  // ── Create Listing (default) ──────────────────────────────

  // Defense-in-depth: re-check the active-listing limit on submit.
  // Primary UX path is the loader-driven upgrade panel in the component;
  // this catches stale-tab submits or anyone bypassing the UI.
  const usage = await getListingUsage(user.id);
  if (usage.atLimit) {
    throw redirect("/dashboard/billing?error=limit_exceeded");
  }

  const title = formData.get("title") as string | null;
  const description = formData.get("description") as string | null;
  const type = formData.get("type") as string | null;
  const category = formData.get("category") as string | null;
  const estimatedValue = formData.get("estimatedValue") as string | null;
  const condition = formData.get("condition") as string | null;
  const deliveryMethod = formData.get("deliveryMethod") as string | null;
  const seekingDescription = formData.get(
    "seekingDescription",
  ) as string | null;

  // Validate required fields
  const errors: Record<string, string> = {};
  if (!title?.trim()) errors.title = "Title is required";
  if (!description?.trim()) errors.description = "Description is required";
  if (!category?.trim()) errors.category = "Category is required";
  if (!type || !["item", "service"].includes(type))
    errors.type = "Type is required";

  // ── Collect & validate image URLs ─────────────────────────
  const imageUrls: string[] = [];
  for (let i = 0; i < 5; i++) {
    const raw = formData.get(`imageUrl_${i}`) as string | null;
    if (!raw || raw.trim() === "") continue;
    const sanitized = sanitizeImageUrl(raw);
    const result = validateImageUrl(sanitized);
    if (!result.valid) {
      errors[`imageUrl_${i}`] = result.error ?? "Invalid image URL";
    } else {
      imageUrls.push(sanitized);
    }
  }

  if (Object.keys(errors).length > 0) {
    return { errors };
  }

  // Geocode suburb → lat/lng for map pins
  const suburb = formData.get("suburb") as string | null;
  let geo: { lat: number; lng: number } | null = null;
  if (suburb?.trim()) {
    geo = await geocodeSuburb(suburb.trim());
  }

  // Fallback: use profile coords when geocoding yielded nothing
  if (!geo) {
    const [profile] = await db
      .select({ lat: profiles.lat, lng: profiles.lng })
      .from(profiles)
      .where(eq(profiles.userId, user.id))
      .limit(1);
    if (profile?.lat != null && profile?.lng != null) {
      geo = { lat: profile.lat, lng: profile.lng };
    }
  }

  // Apply jitter so co-located pins don't stack at identical pixels
  const finalLat = geo ? jitterCoord(geo.lat) : null;
  const finalLng = geo ? jitterCoord(geo.lng) : null;

  const [inserted] = await db
    .insert(listings)
    .values({
      userId: user.id,
      title: title!.trim(),
      description: description!.trim(),
      type: type!,
      category: category!,
      estimatedValueZar: estimatedValue ? parseInt(estimatedValue, 10) : null,
      condition: type === "service" ? null : (condition || null),
      deliveryMethod: deliveryMethod || null,
      seekingDescription: seekingDescription?.trim() || null,
      status: "active",
      lat: finalLat,
      lng: finalLng,
    })
    .returning({ id: listings.id });

  // ── Insert image records ──────────────────────────────────
  if (imageUrls.length > 0) {
    await db.insert(listingImages).values(
      imageUrls.map((url, order) => ({
        listingId: inserted.id,
        url,
        order,
      })),
    );
  }

  return { success: true };
}

// ─── Component ─────────────────────────────────────────────────

export default function AddAsset({ loaderData, actionData }: Route.ComponentProps) {
  const { usage } = loaderData;

  if (usage.atLimit) {
    return <LimitReachedPanel usage={usage} />;
  }

  const canUseAiDescription = canUseAiFeature(usage.planCode, "ai_description");
  return <AddAssetForm actionData={actionData} canUseAiDescription={canUseAiDescription} />;
}

function LimitReachedPanel({ usage }: { usage: ListingUsage }) {
  const planLabel = usage.planCode.charAt(0).toUpperCase() + usage.planCode.slice(1);

  return (
    <div className="max-w-2xl mx-auto pt-8 pb-24 px-4 space-y-6">
      <div>
        <span className="text-rose-400 font-mono text-[10px] uppercase tracking-widest block mb-1">
          // Limit reached
        </span>
        <h1 className="text-xl font-black uppercase tracking-tight flex items-center gap-2">
          <Lock className="w-5 h-5 text-rose-400" />
          You&apos;ve hit your listing limit
        </h1>
      </div>

      <section className="bg-[#0F172A] border border-rose-500/20 rounded-2xl p-6 space-y-5">
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <span className="font-mono text-[10px] uppercase tracking-widest text-slate-500">
              Active Listings
            </span>
            <span className="px-3 py-1 rounded-full border text-[10px] font-mono uppercase tracking-widest bg-rose-500/10 text-rose-400 border-rose-500/30">
              {planLabel} plan
            </span>
          </div>
          <div className="flex justify-between items-baseline">
            <p className="text-2xl font-black tracking-tight text-rose-400">
              {usage.activeCount} / {usage.listingLimit}
            </p>
            <span className="text-[10px] font-mono text-slate-500">
              all slots used
            </span>
          </div>
          <div className="w-full bg-white/5 rounded-full h-1.5 overflow-hidden">
            <div className="h-full rounded-full bg-rose-500 w-full" />
          </div>
          <p className="text-[11px] text-slate-400 leading-relaxed">
            You&apos;re using every active-listing slot on the {planLabel.toLowerCase()} plan.
            To add another item, upgrade to a higher tier or hide one of your
            existing listings to free up a slot.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
          <Link
            to="/dashboard/billing"
            className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-500 text-[#030712] text-[11px] font-mono font-bold uppercase tracking-widest hover:bg-emerald-400 transition-colors"
          >
            <CreditCard className="w-3.5 h-3.5" />
            View plans
          </Link>
          <Link
            to="/dashboard/profile"
            className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-white/[0.03] border border-white/10 text-slate-300 text-[11px] font-mono font-bold uppercase tracking-widest hover:bg-white/[0.06] hover:border-white/20 transition-colors"
          >
            <Layers className="w-3.5 h-3.5" />
            Manage listings
          </Link>
        </div>
      </section>

      <p className="text-[10px] font-mono text-slate-600 text-center">
        Need more headroom? Plus &amp; Business tiers raise the limit to 20 and 100.
      </p>
    </div>
  );
}

function AddAssetForm({
  actionData,
  canUseAiDescription,
}: {
  actionData: Route.ComponentProps["actionData"];
  canUseAiDescription: boolean;
}) {
  const [type, setType] = useState<"item" | "service">("item");
  const [selectedCategory, setSelectedCategory] = useState<string>("");
  const [aiDismissed, setAiDismissed] = useState(false);
  const [imageUrls, setImageUrls] = useState<string[]>([""]);
  const [uploadingFiles, setUploadingFiles] = useState<
    { name: string; status: "uploading" | "done" | "error"; url?: string }[]
  >([]);
  const [dragActive, setDragActive] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const errors = actionData?.errors as Record<string, string> | undefined;
  const [step, setStep] = useState<1 | 2>(1);
  const [moreDetailsOpen, setMoreDetailsOpen] = useState(false);
  const [visionLoadingForUrl, setVisionLoadingForUrl] = useState<string | null>(null);
  const [visionFilled, setVisionFilled] = useState(false);
  const [visionError, setVisionError] = useState<string | null>(null);

  const formRef = useRef<HTMLFormElement>(null);
  const descriptionRef = useRef<HTMLTextAreaElement>(null);

  const navigate = useNavigate();
  const haptics = useHaptics();

  // Navigate with haptic after successful listing creation
  useEffect(() => {
    if (actionData && "success" in actionData && (actionData as { success?: boolean }).success === true) {
      haptics.success();
      navigate("/dashboard");
    }
  }, [actionData]);

  // Fire error haptic when validation errors are present
  useEffect(() => {
    if (errors && Object.keys(errors).length > 0) {
      haptics.error();
    }
  }, [actionData]);

  // Separate fetchers for AI actions — don't reset the main form
  const aiFetcher = useFetcher();
  const navigation = useNavigation();

  const aiData = aiFetcher.data as
    | { aiSuggestion: string }
    | { aiError: string }
    | undefined;

  const isAiLoading = aiFetcher.state !== "idle";
  const isListingSubmitting =
    navigation.state === "submitting" &&
    navigation.formData?.get("intent") == null;

  // ── File upload handlers ──────────────────────────────────
  async function handleFiles(files: FileList | File[]) {
    const fileArray = Array.from(files);
    const remaining = 5 - imageUrls.length;
    const toUpload = [...fileArray].slice(0, remaining);
    if (toUpload.length === 0) return;

    const starts = toUpload.map((f) => ({ name: f.name, status: "uploading" as const }));
    setUploadingFiles((prev) => [...prev, ...starts]);

    const { upload } = await import("@vercel/blob/client");

    for (let i = 0; i < toUpload.length; i++) {
      const file = toUpload[i];
      try {
        const blob = await upload(`listings/${file.name}`, file, {
          access: "public",
          handleUploadUrl: "/api/upload",
        });

        setImageUrls((prev) => [...prev, blob.url]);
        setUploadingFiles((prev) => {
          const next = [...prev];
          const idx = next.findIndex(
            (f) => f.name === file.name && f.status === "uploading",
          );
          if (idx >= 0) next[idx] = { name: file.name, status: "done", url: blob.url };
          return next;
        });
      } catch (err) {
        console.error("[add-asset] upload failed:", err);
        setUploadingFiles((prev) => {
          const next = [...prev];
          const idx = next.findIndex(
            (f) => f.name === file.name && f.status === "uploading",
          );
          if (idx >= 0) next[idx] = { name: file.name, status: "error" };
          return next;
        });
      }
    }
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    setDragActive(false);
    handleFiles(e.dataTransfer.files);
  }

  function handleDragOver(e: React.DragEvent) {
    e.preventDefault();
    setDragActive(true);
  }

  function handleDragLeave(e: React.DragEvent) {
    e.preventDefault();
    setDragActive(false);
  }

  function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    if (e.target.files) handleFiles(e.target.files);
  }

  // Reset dismissed state when a new AI request starts
  useEffect(() => {
    if (isAiLoading) setAiDismissed(false);
  }, [isAiLoading]);

  const aiSuggestion =
    aiData && "aiSuggestion" in aiData ? aiData.aiSuggestion : null;
  const aiError = aiData && "aiError" in aiData ? aiData.aiError : null;

  function handleAiAssist() {
    if (!formRef.current) return;
    const titleEl = formRef.current.elements.namedItem(
      "title",
    ) as HTMLInputElement | null;
    const categoryEl = formRef.current.elements.namedItem(
      "category",
    ) as HTMLSelectElement | null;

    aiFetcher.submit(
      {
        intent: "aiDescription",
        title: titleEl?.value ?? "",
        category: categoryEl?.value ?? "",
      },
      { method: "post" },
    );
  }

  function handleAcceptSuggestion() {
    if (descriptionRef.current && aiSuggestion) {
      descriptionRef.current.value = aiSuggestion;
    }
    setAiDismissed(true);
  }

  async function handleVisionAutoFill(imageUrl: string) {
    setVisionLoadingForUrl(imageUrl);
    setVisionError(null);
    setVisionFilled(false);

    try {
      const res = await fetch("/api/ai-listing-from-photo", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ imageUrl }),
      });

      const data = await res.json();

      if (!res.ok) {
        if (data.error === "ai_tier_restricted") {
          setVisionError("AI Auto-Fill is available on Plus and above.");
        } else if (typeof data.error === "string") {
          setVisionError(data.error);
        } else {
          setVisionError("Auto-fill failed. Please try again.");
        }
        setVisionLoadingForUrl(null);
        return;
      }

      // Pre-fill form fields
      const titleEl = formRef.current?.elements.namedItem(
        "title",
      ) as HTMLInputElement | null;
      const valueEl = formRef.current?.elements.namedItem(
        "estimatedValue",
      ) as HTMLInputElement | null;

      if (titleEl) titleEl.value = data.title;
      if (descriptionRef.current)
        descriptionRef.current.value = data.description;
      if (data.category) setSelectedCategory(data.category);
      if (valueEl && data.estimatedValue != null)
        valueEl.value = String(data.estimatedValue);

      setVisionFilled(true);
      setVisionLoadingForUrl(null);
      haptics.success();

      // Clear success message after 4 seconds
      setTimeout(() => setVisionFilled(false), 4000);
    } catch (err) {
      console.error("[vision-auto-fill] error:", err);
      setVisionError("Network error — please try again.");
      setVisionLoadingForUrl(null);
    }
  }

  async function handleCameraCapture(dataUrl: string) {
    // Step 1: Show loading state
    setVisionLoadingForUrl(dataUrl);
    setVisionError(null);
    setVisionFilled(false);

    try {
      // Convert data URL to Blob then File
      const blobRes = await fetch(dataUrl);
      const blob = await blobRes.blob();
      const file = new File([blob], `capture-${Date.now()}.jpg`, { type: "image/jpeg" });

      // Upload to Vercel Blob
      const { upload } = await import("@vercel/blob/client");
      const uploaded = await upload(`listings/${file.name}`, file, {
        access: "public",
        handleUploadUrl: "/api/upload",
      });

      const publicUrl = uploaded.url;

      // Add public URL to image list
      setImageUrls((prev) => {
        const next = [...prev];
        const emptyIdx = next.indexOf("");
        if (emptyIdx >= 0) {
          next[emptyIdx] = publicUrl;
        } else {
          next.push(publicUrl);
        }
        return next;
      });

      // Step 2: AI auto-fill from the public URL
      const aiRes = await fetch("/api/ai-listing-from-photo", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ imageUrl: publicUrl }),
      });

      const aiData = await aiRes.json();

      if (!aiRes.ok) {
        if (aiData.error === "ai_tier_restricted") {
          setVisionError("AI Auto-Fill is available on Plus and above.");
        } else if (typeof aiData.error === "string") {
          setVisionError(aiData.error);
        } else {
          setVisionError("Auto-fill failed. Please try again.");
        }
        setVisionLoadingForUrl(null);
        return;
      }

      // Pre-fill form fields
      const titleEl = formRef.current?.elements.namedItem("title") as HTMLInputElement | null;
      const valueEl = formRef.current?.elements.namedItem("estimatedValue") as HTMLInputElement | null;

      if (titleEl) titleEl.value = aiData.title;
      if (descriptionRef.current) descriptionRef.current.value = aiData.description;
      if (aiData.category) setSelectedCategory(aiData.category);
      if (valueEl && aiData.estimatedValue != null) valueEl.value = String(aiData.estimatedValue);

      setVisionFilled(true);
      setVisionLoadingForUrl(null);
      haptics.success();

      setTimeout(() => setVisionFilled(false), 4000);
    } catch (err) {
      console.error("[camera-capture] error:", err);
      setVisionError("Failed to upload photo. Please try again.");
      setVisionLoadingForUrl(null);
    }
  }

  return (
    <div className="space-y-8">
      {/* Page header with step indicator */}
      <div className="flex items-center gap-3 pt-2">
        <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center">
          <PackagePlus className="w-5 h-5 text-emerald-400" />
        </div>
        <div>
          <h1 className="text-xl font-black tracking-tight text-white">
            {step === 1 ? "What are you offering?" : "What do you want in return?"}
          </h1>
          <p className="text-xs text-slate-500">
            Step {step} of 2
          </p>
        </div>
      </div>

      {/* Step progress dots */}
      <div className="flex gap-2">
        <div className={`h-1 flex-1 rounded-full transition-colors ${step >= 1 ? "bg-emerald-500" : "bg-white/10"}`} />
        <div className={`h-1 flex-1 rounded-full transition-colors ${step >= 2 ? "bg-emerald-500" : "bg-white/10"}`} />
      </div>

      {/* Form */}
      <Form
        ref={formRef}
        method="post"
        className="space-y-6"
        onKeyDown={(e) => {
          if (e.key === "Enter" && step === 1) e.preventDefault();
        }}
      >
        {isListingSubmitting && <LoadingBar />}
        {/* Hidden type field for form submission */}
        <input type="hidden" name="type" value={type} />
        <input type="hidden" name="category" value={selectedCategory} />

        {/* ── Step 1 fields ── */}
        <div className={step === 1 ? "space-y-6" : "hidden"}>
          {/* ── Camera-first hero ─────────────────────────── */}
          <div className="rounded-2xl bg-gradient-to-b from-emerald-500/10 to-emerald-500/5 border border-emerald-500/20 p-5 text-center">
            <div className="mb-3">
              <div className="w-16 h-16 mx-auto rounded-2xl bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center mb-2">
                <Camera className="w-7 h-7 text-emerald-400" />
              </div>
              <h2 className="text-sm font-black text-white uppercase tracking-wider">
                Snap &amp; List
              </h2>
              <p className="text-xs text-slate-400 mt-1">
                Take a photo and AI auto-fills everything — title, description, category &amp; value
              </p>
            </div>
            <CameraCapture
              onCapture={(url) => {
                handleCameraCapture(url);
              }}
            />

            {/* Loading indicator */}
            {visionLoadingForUrl && (
              <div className="mt-3 flex items-center justify-center gap-2 text-[11px] text-emerald-400">
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Uploading &amp; analyzing photo...</span>
              </div>
            )}

            {/* Success feedback */}
            {visionFilled && (
              <div className="mt-3 rounded-xl border border-emerald-500/20 bg-emerald-500/10 px-4 py-2.5 flex items-center gap-2">
                <Check className="w-4 h-4 text-emerald-400 shrink-0" />
                <span className="text-xs text-emerald-300">
                  ✨ Form auto-filled from photo! Check &amp; tweak below.
                </span>
              </div>
            )}

            {/* Error feedback */}
            {visionError && (
              <div className="mt-3 rounded-xl border border-rose-500/20 bg-rose-500/10 px-4 py-2.5 flex items-center gap-2">
                <X className="w-4 h-4 text-rose-400 shrink-0" />
                <span className="text-xs text-rose-300">
                  {visionError}
                </span>
              </div>
            )}

            <p className="text-[10px] text-slate-600 mt-3">
              or fill in the details below
            </p>
          </div>

          {/* Type toggle */}
          <div>
            <span className="text-[10px] font-mono uppercase tracking-widest text-slate-400 mb-1.5 block">
              Type
            </span>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setType("item")}
                className={`flex-1 py-2.5 rounded-xl text-sm font-bold uppercase tracking-wider transition-all active:scale-95 ${
                  type === "item"
                    ? "bg-emerald-500 text-[#030712]"
                    : "bg-[#0F172A] text-slate-400 border border-white/10 hover:border-white/20"
                }`}
              >
                Item
              </button>
              <button
                type="button"
                onClick={() => setType("service")}
                className={`flex-1 py-2.5 rounded-xl text-sm font-bold uppercase tracking-wider transition-all active:scale-95 ${
                  type === "service"
                    ? "bg-emerald-500 text-[#030712]"
                    : "bg-[#0F172A] text-slate-400 border border-white/10 hover:border-white/20"
                }`}
              >
                Service
              </button>
            </div>
            {errors?.type && (
              <p className="mt-1 text-xs text-red-400">{errors.type}</p>
            )}
          </div>

          {/* Title */}
          <div>
            <Input
              label="Title"
              name="title"
              placeholder={
                type === "item"
                  ? "e.g. Samsung Galaxy S24 Ultra"
                  : "e.g. Web Design Services"
              }
              required
            />
            {errors?.title && (
              <p className="mt-1 text-xs text-red-400">{errors.title}</p>
            )}
          </div>

          {/* Description + AI Assist */}
          <div>
            <div className="flex items-end justify-between mb-1.5">
              <label
                htmlFor="description"
                className="text-[10px] font-mono uppercase tracking-widest text-slate-400"
              >
              </label>
              {canUseAiDescription ? (
                <button
                  type="button"
                  onClick={handleAiAssist}
                  disabled={isAiLoading}
                  className="flex items-center gap-1.5 text-[11px] font-semibold text-purple-400 hover:text-purple-300 disabled:text-slate-600 disabled:cursor-not-allowed transition-colors"
                >
                  {isAiLoading ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <Sparkles className="w-3.5 h-3.5" />
                  )}
                  {isAiLoading ? "Generating…" : "AI Assist"}
                </button>
              ) : (
                <Link
                  to="/dashboard/billing"
                  className="flex items-center gap-1.5 text-[11px] font-mono font-bold uppercase tracking-widest text-slate-500 hover:text-emerald-400 transition-colors"
                  title="Upgrade to Plus to use AI Assist"
                >
                  <Lock className="w-3 h-3" />
                  Plus only
                </Link>
              )}
            </div>
            <Textarea
              ref={descriptionRef}
              id="description"
              name="description"
              label="Description"
              rows={4}
              required
              placeholder={
                type === "service"
                  ? "Describe the service you offer — scope, duration, experience…"
                  : selectedCategory === "Electronics"
                  ? "Brand, model, condition, battery health, any faults..."
                  : selectedCategory === "Home & Garden"
                  ? "Age, dimensions, material, reason for parting with it..."
                  : selectedCategory === "Fashion"
                  ? "Size, brand, condition, material, original price..."
                  : selectedCategory === "Skills"
                  ? "Years of experience, what specific problems you solve..."
                  : selectedCategory === "Vehicles"
                  ? "Mileage, model, year, service history, condition..."
                  : selectedCategory === "Sports"
                  ? "Brand, age, wear and tear, size/spec..."
                  : selectedCategory === "Books"
                  ? "Edition, condition, highlights/notes, language..."
                  : selectedCategory === "Services"
                  ? "Service scope, availability, what to expect..."
                  : "Describe the item — brand, model, age, included accessories…"
              }
              error={errors?.description}
            />

            {/* AI suggestion panel */}
            {aiSuggestion && !aiDismissed && (
              <div className="mt-3 rounded-xl border border-purple-500/20 bg-purple-500/5 p-4">
                <div className="flex items-start gap-2">
                  <Sparkles className="w-4 h-4 text-purple-400 mt-0.5 shrink-0" />
                  <p className="text-sm text-slate-300 leading-relaxed flex-1">
                    {aiSuggestion}
                  </p>
                </div>
                <div className="flex gap-2 mt-3">
                  <button
                    type="button"
                    onClick={handleAcceptSuggestion}
                    className="flex items-center gap-1.5 rounded-lg bg-purple-500/20 px-3 py-1.5 text-xs font-semibold text-purple-300 hover:bg-purple-500/30 transition-colors"
                  >
                    <Check className="w-3.5 h-3.5" />
                    Use this
                  </button>
                  <button
                    type="button"
                    onClick={() => setAiDismissed(true)}
                    className="flex items-center gap-1.5 rounded-lg bg-white/5 px-3 py-1.5 text-xs font-semibold text-slate-400 hover:bg-white/10 transition-colors"
                  >
                    <X className="w-3.5 h-3.5" />
                    Dismiss
                  </button>
                </div>
              </div>
            )}

            {/* AI error */}
            {aiData && "aiError" in aiData && (
              <p className="mt-2 text-xs text-red-400">
                {aiData.aiError === "ai_tier_restricted"
                  ? "AI Assist is available on Plus and above. "
                  : aiData.aiError}
                {aiData.aiError === "ai_tier_restricted" && (
                  <Link to="/dashboard/billing" className="underline text-emerald-400 hover:text-emerald-300">
                    Upgrade plan →
                  </Link>
                )}
              </p>
            )}
          </div>

          {/* Category */}
          <div>
            <label className="text-[10px] font-mono uppercase tracking-widest text-slate-400 mb-2 block">
              Category
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {CATEGORIES.map((cat) => (
                <button
                  key={cat.name}
                  type="button"
                  onClick={() => setSelectedCategory(cat.name)}
                  className={`flex flex-col items-center justify-center p-3 rounded-xl border transition-all ${
                    selectedCategory === cat.name
                      ? "bg-emerald-500/10 border-emerald-500/50 text-emerald-400"
                      : "bg-[#0F172A] border-white/10 text-slate-400 hover:border-white/20 hover:text-white"
                  }`}
                >
                  <cat.icon className="w-5 h-5 mb-1.5" />
                  <span className="text-[10px] font-medium">{cat.name}</span>
                </button>
              ))}
            </div>
            {errors?.category && (
              <p className="mt-1 text-xs text-red-400">{errors.category}</p>
            )}
          </div>

          {/* Images */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-[10px] font-mono uppercase tracking-widest text-slate-400 flex items-center gap-1.5">
                <ImagePlus className="w-3.5 h-3.5" />
                Image URLs
                <span className="text-slate-600">
                  ({imageUrls.length}/5)
                </span>
              </span>
            </div>

            {/* ── File upload zone ──────────────────────────────── */}
            {imageUrls.length < 5 && (
              <div
                className={`rounded-xl border-2 border-dashed transition-all px-4 py-4 text-center ${
                  dragActive
                    ? "border-emerald-400 bg-emerald-500/10"
                    : "border-white/10 bg-[#0F172A]/50 hover:border-white/20"
                }`}
                onDrop={handleDrop}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
              >
                <div className="flex flex-col items-center gap-2">
                  <Upload className="w-6 h-6 text-slate-500" />
                  <p className="text-[11px] text-slate-400">
                    Drop images here or{" "}
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="text-emerald-400 hover:text-emerald-300 font-semibold underline underline-offset-2"
                    >
                      browse
                    </button>
                    {" "}or{" "}
                    <CameraCapture onCapture={(url) => setImageUrls([...imageUrls, url])} />
                  </p>
                  <p className="text-[10px] text-slate-600">
                    JPG, PNG, WebP — max 5 MB each
                  </p>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    multiple
                    onChange={handleFileSelect}
                    className="hidden"
                  />
                </div>

                {/* Upload progress badges */}
                {uploadingFiles.some((f) => f.status === "uploading") && (
                  <div className="mt-3 flex flex-wrap justify-center gap-1.5">
                    {uploadingFiles.map((f, i) => (
                      <span
                        key={`${f.name}-${i}`}
                        className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[10px] font-mono ${
                          f.status === "uploading"
                            ? "bg-amber-500/15 text-amber-300 border border-amber-500/20"
                            : f.status === "done"
                            ? "bg-emerald-500/15 text-emerald-300 border border-emerald-500/20"
                            : "bg-red-500/15 text-red-300 border border-red-500/20"
                        }`}
                      >
                        {f.status === "uploading" && (
                          <Loader2 className="w-3 h-3 animate-spin" />
                        )}
                        {f.status === "done" && <Check className="w-3 h-3" />}
                        {f.status === "error" && <X className="w-3 h-3" />}
                        {f.name.length > 18 ? f.name.slice(0, 16) + "…" : f.name}
                        {f.status === "error" && (
                          <button
                            type="button"
                            onClick={() =>
                              setUploadingFiles((prev) => prev.filter((_, j) => j !== i))
                            }
                            className="ml-0.5 text-red-300 hover:text-red-100"
                          >
                            <X className="w-3 h-3" />
                          </button>
                        )}
                      </span>
                    ))}
                  </div>
                )}

                {/* Preview thumbnails */}
                {uploadingFiles.filter((f) => f.status === "done").length > 0 && (
                  <div className="mt-3 flex flex-wrap justify-center gap-2">
                    {uploadingFiles
                      .filter((f) => f.status === "done")
                      .map((f, i) => (
                        <img
                          key={`thumb-${i}`}
                          src={f.url}
                          alt={f.name}
                          className="w-12 h-12 rounded-lg object-cover border border-white/10"
                        />
                      ))}
                  </div>
                )}
              </div>
            )}

            {/* ── URL text inputs ───────────────────────────── */}
            <div className="space-y-3">
              {imageUrls.map((url, index) => (
                <div key={index}>
                  <div className="flex gap-2">
                    <input
                      name={`imageUrl_${index}`}
                      type="url"
                      value={url}
                      onChange={(e) => {
                        const next = [...imageUrls];
                        next[index] = e.target.value;
                        setImageUrls(next);
                      }}
                      placeholder={
                        index === 0
                          ? "https://i.imgur.com/example.jpg"
                          : `Image URL ${index + 1}`
                      }
                      className="flex-1 rounded-xl bg-[#0F172A] border border-white/10 text-white placeholder:text-slate-500 focus:border-emerald-500/50 focus:ring-1 focus:ring-emerald-500/25 focus:outline-none px-4 py-2.5 text-sm"
                    />
                    {url.trim().startsWith("https://") && url.trim().length > 12 && (
                      <button
                        type="button"
                        onClick={() => handleVisionAutoFill(url)}
                        disabled={visionLoadingForUrl !== null}
                        className="shrink-0 w-10 h-10 rounded-xl border border-purple-500/30 bg-purple-500/10 flex items-center justify-center text-purple-400 hover:text-purple-300 hover:border-purple-500/50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                        aria-label={`Auto-fill from image ${index + 1}`}
                        title="✨ AI Auto-Fill from this photo"
                      >
                        {visionLoadingForUrl === url ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          <Sparkles className="w-4 h-4" />
                        )}
                      </button>
                    )}
                    {imageUrls.length > 1 && (
                      <button
                        type="button"
                        onClick={() =>
                          setImageUrls(imageUrls.filter((_, i) => i !== index))
                        }
                        className="shrink-0 w-10 h-10 rounded-xl border border-white/10 bg-[#0F172A] flex items-center justify-center text-slate-500 hover:text-red-400 hover:border-red-500/30 transition-colors"
                        aria-label={`Remove image ${index + 1}`}
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                  {errors?.[`imageUrl_${index}`] && (
                    <p className="mt-1 text-xs text-red-400">
                      {errors[`imageUrl_${index}`]}
                    </p>
                  )}
                  {/* Inline preview hint for non-empty valid-looking URLs */}
                  {url.trim().startsWith("https://") && url.trim().length > 12 && (
                    <p className="mt-1 text-[11px] text-slate-600 truncate">
                      {url.trim()}
                    </p>
                  )}
                </div>
              ))}
            </div>

            {/* AI auto-fill success notification */}
            {visionFilled && (
              <div className="mt-3 rounded-xl border border-emerald-500/20 bg-emerald-500/10 px-4 py-2.5 flex items-center gap-2">
                <Check className="w-4 h-4 text-emerald-400 shrink-0" />
                <span className="text-xs text-emerald-300">
                  ✨ Form auto-filled from photo!
                </span>
              </div>
            )}

            {/* AI auto-fill error */}
            {visionError && (
              <div className="mt-3 rounded-xl border border-rose-500/20 bg-rose-500/10 px-4 py-2.5 flex items-center gap-2">
                <X className="w-4 h-4 text-rose-400 shrink-0" />
                <span className="text-xs text-rose-300">
                  {visionError}
                </span>
              </div>
            )}

            {imageUrls.length < 5 && (
              <button
                type="button"
                onClick={() => setImageUrls([...imageUrls, ""])}
                className="mt-3 flex items-center gap-1.5 text-xs font-semibold text-emerald-400 hover:text-emerald-300 transition-colors"
              >
                <Plus className="w-3.5 h-3.5" />
                Add another image
              </button>
            )}

            <p className="mt-2 text-[11px] text-slate-600">
              Or paste HTTPS image URLs from Imgur, Unsplash, Cloudinary, or any
              direct image link.
            </p>
            <p className="mt-1 text-[11px] text-purple-400/60 flex items-center gap-1">
              <Sparkles className="w-3 h-3 shrink-0" />
              More photos = better AI matching. Listings with 3+ photos get 2x more trade offers.
            </p>
          </div>

          {/* More details collapsible */}
          <div>
            <button
              type="button"
              onClick={() => setMoreDetailsOpen(!moreDetailsOpen)}
              className="flex items-center gap-2 text-[11px] font-mono text-slate-400 hover:text-emerald-400 uppercase tracking-widest transition-colors"
            >
              <span>{moreDetailsOpen ? "▲ Hide details" : "▼ More details"}</span>
            </button>

            {moreDetailsOpen && (
              <div className="mt-4 space-y-4 p-4 bg-[#0F172A]/50 border border-white/5 rounded-xl">
                {/* Estimated Value */}
                <div>
                  <Input
                    label="Estimated value (Rands)"
                    name="estimatedValue"
                    type="number"
                    min={0}
                    placeholder="e.g. 5000"
                  />
                  <p className="mt-1 text-[11px] text-purple-400/60 flex items-center gap-1">
                    <Sparkles className="w-3 h-3 shrink-0" />
                    Helps AI find fair trades — listings with values get 3x more match suggestions
                  </p>
                </div>

                {/* Condition — hidden for services */}
                {type === "item" && (
                  <div>
                    <label
                      htmlFor="condition"
                      className="text-[10px] font-mono uppercase tracking-widest text-slate-400 mb-1.5 block"
                    >
                      Condition
                    </label>
                    <select id="condition" name="condition" defaultValue="" className={selectStyles}>
                      <option value="" disabled>Select condition</option>
                      {CONDITIONS.map((c) => (
                        <option key={c} value={c}>{c}</option>
                      ))}
                    </select>
                  </div>
                )}

                {/* Delivery Method */}
                <div>
                  <label
                    htmlFor="deliveryMethod"
                    className="text-[10px] font-mono uppercase tracking-widest text-slate-400 mb-1.5 block"
                  >
                    Delivery method
                  </label>
                  <select id="deliveryMethod" name="deliveryMethod" defaultValue="" className={selectStyles}>
                    <option value="" disabled>Select delivery method</option>
                    {DELIVERY_METHODS.map((m) => (
                      <option key={m} value={m}>{m}</option>
                    ))}
                  </select>
                </div>

                {/* Suburb */}
                <div>
                  <label
                    htmlFor="suburb"
                    className="text-[10px] font-mono uppercase tracking-widest text-slate-400 mb-1.5 block"
                  >
                    Suburb / area
                  </label>
                  <input
                    id="suburb"
                    name="suburb"
                    type="text"
                    placeholder="e.g. Sandton, Camps Bay, Menlyn"
                    className="w-full rounded-xl bg-[#0F172A] border border-white/10 text-white placeholder:text-slate-500 focus:border-emerald-500/50 focus:ring-1 focus:ring-emerald-500/25 focus:outline-none px-4 py-2.5"
                  />
                </div>
              </div>
            )}
          </div>

          {/* Step 1 CTA */}
          <button
            type="button"
            onClick={() => {
              if (!selectedCategory) return;
              haptics.selection();
              setStep(2);
              if (typeof window !== "undefined") {
                window.scrollTo({ top: 0, behavior: "smooth" });
              }
            }}
            className="w-full py-4 rounded-xl bg-emerald-500 text-[#030712] font-black uppercase tracking-widest text-sm hover:bg-emerald-400 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            disabled={!selectedCategory}
          >
            Next: What do you want? →
          </button>
        </div>

        {/* ── Step 2 fields ── */}
        <div className={step === 2 ? "space-y-6" : "hidden"}>
          <div>
            <label
              htmlFor="seekingDescription"
              className="text-[10px] font-mono uppercase tracking-widest text-slate-400 mb-1.5 block"
            >
              What do you want in return?
            </label>
            <textarea
              id="seekingDescription"
              name="seekingDescription"
              rows={4}
              placeholder="e.g. A laptop, guitar lessons, plumbing work…"
              className={textareaStyles}
            />
            <p className="mt-1.5 text-[10px] text-slate-600">
              Be specific — it helps the AI match you with the right trades.
              <span className="block mt-1 text-purple-400/60">
                <Sparkles className="w-3 h-3 inline mr-1" />
                Try: \"Looking for a laptop under R5,000\" instead of just \"electronics\"
              </span>
            </p>
          </div>

          {/* Step 2 actions */}
          <div className="flex gap-3">
            <button
              type="button"
              onClick={() => { haptics.selection(); setStep(1); }}
              className="flex-1 py-3 rounded-xl bg-white/5 border border-white/10 text-white font-bold uppercase tracking-widest text-xs hover:bg-white/10 transition-colors"
            >
              ← Back
            </button>
            <Button
              type="submit"
              size="lg"
              className="flex-[2]"
              disabled={isListingSubmitting}
            >
              {isListingSubmitting ? (
                <>
                  <Spinner />
                  Posting...
                </>
              ) : (
                "Post listing"
              )}
            </Button>
          </div>
        </div>
      </Form>
    </div>
  );
}

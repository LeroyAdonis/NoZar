import { useEffect, useRef, useState } from "react";
import { Form, redirect, useFetcher, useNavigation, useNavigate } from "react-router";
import {
  Camera,
  Check,
  ImagePlus,
  Loader2,
  MapPin,
  PackagePlus,
  Plus,
  Sparkles,
  Trash2,
  Upload,
  X,
  ShieldCheck,
} from "lucide-react";
import { generateContent } from "~/lib/ai.server";
import type { Route } from "./+types/add";
import { requireAuth, getOptionalSession } from "~/lib/auth.server";
import { db } from "~/lib/db.server";
import { listings, listingImages, subscriptions } from "~/lib/schema";
import { count, eq } from "drizzle-orm";
import {
  validateImageUrl,
  sanitizeImageUrl,
} from "~/lib/media-validation.server";
import { Input } from "~/components/ui/input";
import { Button } from "~/components/ui/button";
import { LoadingBar, Spinner } from "~/components/ui/loading-indicator";
import { AuthPromptModal } from "~/components/ui/auth-prompt-modal";
import { VisualCategorySelector } from "~/components/ui/visual-category-selector";
import { type Category } from "~/lib/category-config";
import {
  CATEGORY_DESCRIPTION_PLACEHOLDERS,
  CATEGORY_SEEKING_PLACEHOLDERS,
  DEFAULT_DESCRIPTION_PLACEHOLDER,
} from "~/lib/category-placeholders";
import {
  QuickSnapWithFallback,
  type CapturedPhoto,
} from "~/components/ui/quick-snap-camera";
import { compressImage, formatFileSize } from "~/lib/image-compression";

// ─── Constants ─────────────────────────────────────────────────

const CONDITIONS = ["New", "Like New", "Good", "Fair", "Poor"] as const;

const DELIVERY_METHODS = ["Pickup", "Delivery", "Either"] as const;

const selectStyles =
  "w-full rounded-xl bg-[#0F172A] border border-white/10 text-white focus:border-emerald-500/50 focus:ring-1 focus:ring-emerald-500/25 focus:outline-none px-4 py-2.5 appearance-none cursor-pointer";

const textareaStyles =
  "w-full rounded-xl bg-[#0F172A] border border-white/10 text-white placeholder:text-slate-500 focus:border-emerald-500/50 focus:ring-1 focus:ring-emerald-500/25 focus:outline-none px-4 py-2.5 resize-none";

// ─── Meta ──────────────────────────────────────────────────────

export function meta({}: Route.MetaArgs) {
  return [
    { title: "Add Asset — Nozar" },
    { name: "description", content: "List a new item or service for barter" },
  ];
}

// ─── Loader (Guest Detection) ───────────────────────────────────────

export async function loader({ request }: Route.LoaderArgs) {
  // Use optional session to allow guest detection
  const session = await getOptionalSession(request);

  // If not authenticated, redirect to browse with auth prompt hint
  // The browse page will show the auth modal based on URL params
  if (!session) {
    const url = new URL(request.url);
    throw redirect(`/dashboard/browse?promptAuth=Add Asset`);
  }

  return { isLoggedIn: true };
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

  // ─── Gemini helpers (server-only) ──────────────────────────────
  async function generateDescription(
    title: string,
    category: string,
  ): Promise<string> {
    const prompt = `Write a compelling 2-3 sentence listing description for a South African barter platform.
     Item: "${title}" (Category: ${category}).
     Use natural SA English. Be specific about condition and value. Keep it concise.`;
    return await generateContent(prompt);
  }

  await requireAuth(request);
  const formData = await request.formData();
  const intent = formData.get("intent") as string | null;

  // ── AI Description ────────────────────────────────────────
  if (intent === "aiDescription") {
    const title = (formData.get("title") as string) || "";
    const category = (formData.get("category") as string) || "";

    if (!title.trim()) {
      return { aiError: "Enter a title first so the AI can help." };
    }

    try {
      const aiSuggestion = await generateDescription(
        title.trim(),
        category || "General",
      );
      return { aiSuggestion };
    } catch {
      return {
        aiError:
          "AI is unavailable right now — write your own lekker description!",
      };
    }
  }

  // ── Create Listing (default) ──────────────────────────────
  const { user } = await requireAuth(request);

  // --- START LIMIT ENFORCEMENT ---
  const [sub] = await db.select().from(subscriptions).where(eq(subscriptions.userId, user.id));
  const listingCountResult = await db.select({ count: count() }).from(listings).where(eq(listings.userId, user.id));
  const listingCount = listingCountResult[0].count;

  const limits: Record<string, number> = { free: 5, plus: 20, business: 100, enterprise: Infinity };
  const currentPlan = sub?.planCode || "free";

  if (listingCount >= limits[currentPlan]) {
    return redirect("/dashboard/billing?error=limit_exceeded");
  }
  // --- END LIMIT ENFORCEMENT ---

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
      lat: geo?.lat ?? null,
      lng: geo?.lng ?? null,
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

  throw redirect("/dashboard");
}

// ─── Component ─────────────────────────────────────────────────

export default function AddAsset({ actionData }: Route.ComponentProps) {
  const [type, setType] = useState<"item" | "service">("item");
  const [selectedCategory, setSelectedCategory] = useState<Category | "">("");
  const [aiDismissed, setAiDismissed] = useState(false);
  const [imageUrls, setImageUrls] = useState<string[]>([""]);
  const [uploadingFiles, setUploadingFiles] = useState<
    { name: string; status: "uploading" | "done" | "error"; url?: string }[]
  >([]);
  const [dragActive, setDragActive] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const errors = actionData?.errors as Record<string, string> | undefined;

  const formRef = useRef<HTMLFormElement>(null);
  const descriptionRef = useRef<HTMLTextAreaElement>(null);

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

  // ── QuickSnap camera handler ────────────────────────────────
  async function handleQuickSnapPhotos(photos: CapturedPhoto[]) {
    const remaining = 5 - imageUrls.filter(u => u).length;
    const toUpload = photos.slice(0, remaining);
    if (toUpload.length === 0) return;

    // Mark all as uploading
    const starts = toUpload.map((p) => ({
      name: p.compressedFile.name,
      status: "uploading" as const,
    }));
    setUploadingFiles((prev) => [...prev, ...starts]);

    const { upload } = await import("@vercel/blob/client");

    for (const photo of toUpload) {
      try {
        const blob = await upload(`listings/${photo.compressedFile.name}`, photo.compressedFile, {
          access: "public",
          handleUploadUrl: "/api/upload",
        });

        setImageUrls((prev) => [...prev, blob.url]);
        setUploadingFiles((prev) => {
          const next = [...prev];
          const idx = next.findIndex(
            (f) => f.name === photo.compressedFile.name && f.status === "uploading",
          );
          if (idx >= 0) next[idx] = { name: photo.compressedFile.name, status: "done", url: blob.url };
          return next;
        });
      } catch (err) {
        console.error("[add-asset] QuickSnap upload failed:", err);
        setUploadingFiles((prev) => {
          const next = [...prev];
          const idx = next.findIndex(
            (f) => f.name === photo.compressedFile.name && f.status === "uploading",
          );
          if (idx >= 0) next[idx] = { name: photo.compressedFile.name, status: "error" };
          return next;
        });
      }
    }
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

    aiFetcher.submit(
      {
        intent: "aiDescription",
        title: titleEl?.value ?? "",
        category: selectedCategory || "General",
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

  return (
    <div className="space-y-8">
      {/* Page header */}
      <div className="flex items-center gap-3 pt-2">
        <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center">
          <PackagePlus className="w-5 h-5 text-emerald-400" />
        </div>
        <div>
          <h1 className="text-xl font-black tracking-tight text-white">
            Add Asset
          </h1>
          <p className="text-xs text-slate-500">
            List an item or service for barter
          </p>
        </div>
      </div>

      {/* Form */}
      <Form ref={formRef} method="post" className="space-y-6">
        {isListingSubmitting && <LoadingBar />}
        {/* Hidden type field for form submission */}
        <input type="hidden" name="type" value={type} />

        {/* Type toggle */}
        <div>
          <span className="text-[10px] font-mono uppercase tracking-widest text-slate-400 mb-1.5 block">
            Type
          </span>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setType("item")}
              className={`flex-1 py-2.5 rounded-xl text-sm font-bold uppercase tracking-wider transition-all ${
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
              className={`flex-1 py-2.5 rounded-xl text-sm font-bold uppercase tracking-wider transition-all ${
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
              Description
            </label>
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
</div>
      <textarea
        ref={descriptionRef}
        id="description"
        name="description"
        rows={4}
        required
        placeholder={
          selectedCategory
            ? CATEGORY_DESCRIPTION_PLACEHOLDERS[selectedCategory]
            : DEFAULT_DESCRIPTION_PLACEHOLDER
        }
        className={textareaStyles}
      />
          {errors?.description && (
            <p className="mt-1 text-xs text-red-400">{errors.description}</p>
          )}

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
          {aiError && !isAiLoading && (
            <p className="mt-2 text-xs text-amber-400">{aiError}</p>
          )}
        </div>

{/* Category - Visual Selector */}
      <div>
        <label className="text-[10px] font-mono uppercase tracking-widest text-slate-400 mb-1.5 block">
          Category
        </label>
        <VisualCategorySelector
          value={selectedCategory}
          onChange={(cat) => setSelectedCategory(cat)}
          error={!!errors?.category}
        />
        {errors?.category && (
          <p className="mt-1 text-xs text-red-400">{errors.category}</p>
        )}
      </div>

        {/* Estimated Value */}
        <Input
          label="Estimated Value (ZAR)"
          name="estimatedValue"
          type="number"
          min={0}
          placeholder="e.g. 5000"
        />

{/* Images */}
      <div>
        <div className="flex items-center justify-between mb-1.5">
          <span className="text-[10px] font-mono uppercase tracking-widest text-slate-400 flex items-center gap-1.5">
            <Camera className="w-3.5 h-3.5" />
            Photos
            <span className="text-slate-600">
              ({imageUrls.filter(u => u).length}/5)
            </span>
          </span>
        </div>

        {/* ── QuickSnap Camera (Primary Method) ────────────────────── */}
        {imageUrls.filter(u => u).length < 5 && (
          <div className="space-y-3">
            <QuickSnapWithFallback
              onPhotosReady={handleQuickSnapPhotos}
              maxPhotos={5 - imageUrls.filter(u => u).length}
              onError={(err) => console.error("[QuickSnap]", err)}
            />
          </div>
        )}

        {/* ── Alternative: File upload zone ─────────────────────────── */}
        {imageUrls.filter(u => u).length < 5 && (
          <>
            <div className="flex items-center gap-3 my-3">
              <div className="flex-1 h-px bg-white/10" />
              <span className="text-[10px] text-slate-600 uppercase tracking-wider">or</span>
              <div className="flex-1 h-px bg-white/10" />
            </div>
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
                </p>
                <p className="text-[10px] text-slate-600">
                  JPG, PNG, WebP — auto-compressed for mobile
                </p>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  capture="environment"
                  multiple
                  onChange={handleFileSelect}
                  className="hidden"
                />
              </div>
            </div>
          </>
        )}

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
          <div className="mt-3 flex flex-wrap gap-2">
            {uploadingFiles
              .filter((f) => f.status === "done")
              .map((f, i) => (
                <div key={`thumb-${i}`} className="relative group">
                  <img
                    src={f.url}
                    alt={f.name}
                    className="w-20 h-20 rounded-xl object-cover border-2 border-emerald-500/30"
                  />
                  <button
                    type="button"
                    onClick={() => {
                      setUploadingFiles((prev) => prev.filter((_, j) => j !== i));
                      setImageUrls((prev) => prev.filter(u => u !== f.url));
                    }}
                    className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-red-500 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                    aria-label="Remove photo"
                  >
                    <X className="w-3 h-3 text-white" />
                  </button>
                </div>
              ))}
          </div>
        )}

        {/* ── URL text inputs (for advanced users) ─────────────────── */}
        {imageUrls.filter(u => u).length < 5 && (
          <>
            <div className="flex items-center gap-3 my-3">
              <div className="flex-1 h-px bg-white/10" />
              <span className="text-[10px] text-slate-600 uppercase tracking-wider">paste URL</span>
              <div className="flex-1 h-px bg-white/10" />
            </div>
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
                </div>
              ))}
            </div>
            {imageUrls.filter(u => !u).length > 0 && (
              <button
                type="button"
                onClick={() => setImageUrls([...imageUrls, ""])}
                className="mt-3 flex items-center gap-1.5 text-xs font-semibold text-emerald-400 hover:text-emerald-300 transition-colors"
              >
                <Plus className="w-3.5 h-3.5" />
                Add another image URL
              </button>
            )}
          </>
        )}
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
            <select
              id="condition"
              name="condition"
              defaultValue=""
              className={selectStyles}
            >
              <option value="" disabled>
                Select condition
              </option>
              {CONDITIONS.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
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
            Delivery Method
          </label>
          <select
            id="deliveryMethod"
            name="deliveryMethod"
            defaultValue=""
            className={selectStyles}
          >
            <option value="" disabled>
              Select delivery method
            </option>
            {DELIVERY_METHODS.map((m) => (
              <option key={m} value={m}>
                {m}
              </option>
            ))}
          </select>
        </div>

        {/* Suburb */}
        <div>
          <label
            htmlFor="suburb"
            className="text-[10px] font-mono uppercase tracking-widest text-slate-400 mb-1.5 block"
          >
            Suburb / Area
          </label>
          <input
            id="suburb"
            name="suburb"
            type="text"
            placeholder="e.g. Sandton, Camps Bay, Menlyn"
            className="w-full rounded-xl bg-[#0F172A] border border-white/10 text-white placeholder:text-slate-500 focus:border-emerald-500/50 focus:ring-1 focus:ring-emerald-500/25 focus:outline-none px-4 py-2.5"
          />
        </div>

{/* Seeking Description */}
      <div>
        <label
          htmlFor="seekingDescription"
          className="text-[10px] font-mono uppercase tracking-widest text-slate-400 mb-1.5 block"
        >
          What are you looking for in exchange?
        </label>
        <textarea
          id="seekingDescription"
          name="seekingDescription"
          rows={3}
          placeholder={
            selectedCategory
              ? CATEGORY_SEEKING_PLACEHOLDERS[selectedCategory]
              : "e.g. Looking for a laptop, guitar lessons, or home repair services…"
          }
          className={textareaStyles}
        />
      </div>

        {/* Submit */}
        <Button type="submit" size="lg" className="w-full" disabled={isListingSubmitting}>
          {isListingSubmitting ? (
            <>
              <Spinner />
              Listing Asset...
            </>
          ) : (
            "List Asset"
          )}
        </Button>
      </Form>
    </div>
  );
}

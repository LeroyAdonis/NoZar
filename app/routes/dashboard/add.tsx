import { useEffect, useRef, useState } from "react";
import { Form, redirect, useFetcher, useNavigation } from "react-router";
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
} from "lucide-react";
import { GoogleGenerativeAI } from "@google/generative-ai";
import type { Route } from "./+types/add";
import { requireAuth } from "~/lib/auth.server";
import { db } from "~/lib/db.server";
import { listings, listingImages } from "~/lib/schema";
import {
  validateImageUrl,
  sanitizeImageUrl,
} from "~/lib/media-validation.server";
import { Input } from "~/components/ui/input";
import { Button } from "~/components/ui/button";
import { LoadingBar, Spinner } from "~/components/ui/loading-indicator";

// ─── Geocoding (server-only) ─────────────────────────────────

async function geocodeSuburb(suburb: string): Promise<{ lat: number; lng: number } | null> {
  const apiKey = process.env.GOOGLE_MAPS_API_KEY;
  if (!apiKey || apiKey === "YOUR_GOOGLE_MAPS_API_KEY" || apiKey === "YOUR_GEMINI_API_KEY") {
    console.error("[geocodeSuburb] Google Maps API key not configured");
    return null;
  }

  const address = encodeURIComponent(`${suburb}, South Africa`);
  const url = `https://maps.googleapis.com/maps/api/geocode/json?address=${address}&key=${apiKey}`;

  try {
    const res = await fetch(url);
    const data = await res.json();

    if (data.status !== "OK" || !data.results || data.results.length === 0) {
      console.error("[geocodeSuburb] Geocoding failed for", suburb, "— status:", data.status);
      return null;
    }

    const { lat, lng } = data.results[0].geometry.location;
    return { lat, lng };
  } catch (err) {
    console.error("[geocodeSuburb] Fetch error for", suburb, err);
    return null;
  }
}

// ─── Constants ─────────────────────────────────────────────────

const CATEGORIES = [
  "Electronics",
  "Home & Garden",
  "Fashion",
  "Skills",
  "Vehicles",
  "Sports",
  "Books",
  "Services",
] as const;

const CONDITIONS = ["New", "Like New", "Good", "Fair", "Poor"] as const;

const DELIVERY_METHODS = ["Pickup", "Delivery", "Either"] as const;

const selectStyles =
  "w-full rounded-xl bg-[#0F172A] border border-white/10 text-white focus:border-emerald-500/50 focus:ring-1 focus:ring-emerald-500/25 focus:outline-none px-4 py-2.5 appearance-none cursor-pointer";

const textareaStyles =
  "w-full rounded-xl bg-[#0F172A] border border-white/10 text-white placeholder:text-slate-500 focus:border-emerald-500/50 focus:ring-1 focus:ring-emerald-500/25 focus:outline-none px-4 py-2.5 resize-none";

// ─── Gemini helpers (server-only) ──────────────────────────────

function getGeminiModel() {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey || apiKey === "YOUR_GEMINI_API_KEY") {
    throw new Error("Gemini API key not configured");
  }
  const genAI = new GoogleGenerativeAI(apiKey);
  return genAI.getGenerativeModel({ model: "gemini-2.0-flash" });
}

async function generateDescription(
  title: string,
  category: string,
): Promise<string> {
  const model = getGeminiModel();
  const result = await model.generateContent(
    `Write a compelling 2-3 sentence listing description for a South African barter platform.
     Item: "${title}" (Category: ${category}).
     Use natural SA English. Be specific about condition and value. Keep it concise.`,
  );
  return result.response.text();
}

async function suggestMeetupSpots(suburb: string): Promise<string[]> {
  const model = getGeminiModel();
  const result = await model.generateContent(
    `Suggest exactly 3 safe public meetup locations near ${suburb}, South Africa for a barter exchange.
     Focus on shopping malls, police stations, or community centres.
     Return ONLY a JSON array of 3 strings, no explanation. Example: ["Location 1", "Location 2", "Location 3"]`,
  );
  let raw = result.response.text().trim();

  // Strip markdown code fences (e.g. ```json ... ```)
  raw = raw.replace(/^```(?:json)?\s*/i, "").replace(/\s*```\s*$/i, "");

  const match = raw.match(/\[.*\]/s);
  if (!match) {
    console.error("[suggestMeetupSpots] No JSON array found in Gemini response:", raw);
    throw new Error("Invalid response format from AI");
  }
  const parsed: unknown = JSON.parse(match[0]);
  if (
    !Array.isArray(parsed) ||
    !parsed.every((item): item is string => typeof item === "string")
  ) {
    console.error("[suggestMeetupSpots] Parsed response is not a string array:", parsed);
    throw new Error("Unexpected AI response shape");
  }
  return parsed;
}

// ─── Meta ──────────────────────────────────────────────────────

export function meta({}: Route.MetaArgs) {
  return [
    { title: "Add Asset — Nozar" },
    { name: "description", content: "List a new item or service for barter" },
  ];
}

// ─── Action ────────────────────────────────────────────────────

export async function action({ request }: Route.ActionArgs) {
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

  // ── Meetup Suggestions ────────────────────────────────────
  if (intent === "suggestMeetup") {
    const suburb = (formData.get("suburb") as string) || "";

    if (!suburb.trim()) {
      return { meetupError: "Enter your suburb first." };
    }

    try {
      const meetupSuggestions = await suggestMeetupSpots(suburb.trim());
      return { meetupSuggestions };
    } catch (err) {
      console.error("[suggestMeetup action] Failed to fetch meetup spots for", suburb, err);
      return {
        meetupError:
          "Could not fetch meetup suggestions. Try again later.",
      };
    }
  }

  // ── Create Listing (default) ──────────────────────────────
  const { user } = await requireAuth(request);

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
  const meetupFetcher = useFetcher();
  const navigation = useNavigation();

  const aiData = aiFetcher.data as
    | { aiSuggestion: string }
    | { aiError: string }
    | undefined;

  const meetupData = meetupFetcher.data as
    | { meetupSuggestions: string[] }
    | { meetupError: string }
    | undefined;

  const isAiLoading = aiFetcher.state !== "idle";
  const isMeetupLoading = meetupFetcher.state !== "idle";
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

    for (let i = 0; i < toUpload.length; i++) {
      const file = toUpload[i];
      const fd = new FormData();
      fd.append("file", file);
      try {
        const res = await fetch("/api/upload", { method: "POST", body: fd });
        const data = await res.json();
        if (res.ok && data.url) {
          setImageUrls((prev) => [...prev, data.url]);
          setUploadingFiles((prev) => {
            const next = [...prev];
            const idx = next.findIndex(
              (f) => f.name === file.name && f.status === "uploading",
            );
            if (idx >= 0) next[idx] = { name: file.name, status: "done", url: data.url };
            return next;
          });
        } else {
          setUploadingFiles((prev) => {
            const next = [...prev];
            const idx = next.findIndex(
              (f) => f.name === file.name && f.status === "uploading",
            );
            if (idx >= 0) next[idx] = { name: file.name, status: "error" };
            return next;
          });
        }
      } catch {
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
  const meetupSuggestions =
    meetupData && "meetupSuggestions" in meetupData
      ? meetupData.meetupSuggestions
      : null;
  const meetupError =
    meetupData && "meetupError" in meetupData ? meetupData.meetupError : null;

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

  function handleSuggestMeetup() {
    if (!formRef.current) return;
    const suburbEl = formRef.current.elements.namedItem(
      "suburb",
    ) as HTMLInputElement | null;

    meetupFetcher.submit(
      {
        intent: "suggestMeetup",
        suburb: suburbEl?.value ?? "",
      },
      { method: "post" },
    );
  }

  function handleSelectMeetup(spot: string) {
    const seekingEl = formRef.current?.elements.namedItem(
      "seekingDescription",
    ) as HTMLTextAreaElement | null;
    if (!seekingEl) return;
    const prefix = seekingEl.value.trim();
    seekingEl.value = prefix
      ? `${prefix}\nPreferred meetup: ${spot}`
      : `Preferred meetup: ${spot}`;
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
              type === "item"
                ? "Describe the item — brand, model, age, included accessories…"
                : "Describe the service you offer — scope, duration, experience…"
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

        {/* Category */}
        <div>
          <label
            htmlFor="category"
            className="text-[10px] font-mono uppercase tracking-widest text-slate-400 mb-1.5 block"
          >
            Category
          </label>
          <select
            id="category"
            name="category"
            required
            defaultValue=""
            className={selectStyles}
          >
            <option value="" disabled>
              Select a category
            </option>
            {CATEGORIES.map((cat) => (
              <option key={cat} value={cat}>
                {cat}
              </option>
            ))}
          </select>
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

        {/* Suburb + Meetup Suggestions */}
        <div>
          <div className="flex items-end justify-between mb-1.5">
            <label
              htmlFor="suburb"
              className="text-[10px] font-mono uppercase tracking-widest text-slate-400"
            >
              Suburb / Area
            </label>
            <button
              type="button"
              onClick={handleSuggestMeetup}
              disabled={isMeetupLoading}
              className="flex items-center gap-1.5 text-[11px] font-semibold text-emerald-400 hover:text-emerald-300 disabled:text-slate-600 disabled:cursor-not-allowed transition-colors"
            >
              {isMeetupLoading ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <MapPin className="w-3.5 h-3.5" />
              )}
              {isMeetupLoading ? "Finding spots…" : "Suggest Safe Meetup Spots"}
            </button>
          </div>
          <input
            id="suburb"
            name="suburb"
            type="text"
            placeholder="e.g. Sandton, Camps Bay, Menlyn"
            className="w-full rounded-xl bg-[#0F172A] border border-white/10 text-white placeholder:text-slate-500 focus:border-emerald-500/50 focus:ring-1 focus:ring-emerald-500/25 focus:outline-none px-4 py-2.5"
          />

          {/* Meetup suggestion chips */}
          {meetupSuggestions && meetupSuggestions.length > 0 && (
            <div className="mt-3 space-y-2">
              <p className="text-[10px] font-mono uppercase tracking-widest text-slate-500">
                Safe meetup spots nearby
              </p>
              <div className="flex flex-wrap gap-2">
                {meetupSuggestions.map((spot) => (
                  <button
                    key={spot}
                    type="button"
                    onClick={() => handleSelectMeetup(spot)}
                    className="flex items-center gap-1.5 rounded-full border border-emerald-500/20 bg-emerald-500/5 px-3 py-1.5 text-xs text-emerald-300 hover:bg-emerald-500/15 hover:border-emerald-500/40 transition-colors"
                  >
                    <MapPin className="w-3 h-3" />
                    {spot}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Meetup error */}
          {meetupError && !isMeetupLoading && (
            <p className="mt-2 text-xs text-amber-400">{meetupError}</p>
          )}
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
            placeholder="e.g. Looking for a laptop, guitar lessons, or home repair services…"
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

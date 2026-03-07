# Image Upload & Feed Filter Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add device file upload for listing images and avatar photos, and hide user's own listings from the feed.

**Architecture:** File uploads handled via multipart form data in existing React Router actions. Files saved to a `data/uploads/` directory on the server with UUID filenames. A resource route serves files with correct MIME types. A reusable `ImageUpload` component provides dual-mode UI (file upload + URL paste). Feed query gains a simple `ne()` filter.

**Tech Stack:** React Router v7, Node.js `fs/promises`, `crypto.randomUUID()`, Drizzle ORM, Tailwind CSS v4

**Design Doc:** `docs/plans/2026-03-06-image-upload-feed-filter-design.md`

---

### Task 1: Upload Server Utility

**Files:**
- Create: `app/lib/upload.server.ts`

**Step 1: Create the upload utility**

```typescript
// app/lib/upload.server.ts
import { mkdir, writeFile, unlink } from "node:fs/promises";
import { existsSync } from "node:fs";
import { join, extname } from "node:path";
import { randomUUID } from "node:crypto";

const UPLOAD_DIR = join(process.cwd(), "data", "uploads");

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5 MB

const ALLOWED_MIME_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
]);

const MIME_TO_EXT: Record<string, string> = {
  "image/jpeg": ".jpg",
  "image/png": ".png",
  "image/webp": ".webp",
  "image/gif": ".gif",
};

async function ensureUploadDir() {
  if (!existsSync(UPLOAD_DIR)) {
    await mkdir(UPLOAD_DIR, { recursive: true });
  }
}

export interface UploadResult {
  success: boolean;
  url?: string;
  error?: string;
}

/**
 * Validate and save an uploaded file to disk.
 * Returns the relative URL path (e.g. "/uploads/abc123.jpg").
 */
export async function saveUploadedFile(file: File): Promise<UploadResult> {
  if (!ALLOWED_MIME_TYPES.has(file.type)) {
    return {
      success: false,
      error: `File type "${file.type}" not allowed. Use JPEG, PNG, WebP, or GIF.`,
    };
  }

  if (file.size > MAX_FILE_SIZE) {
    return {
      success: false,
      error: `File too large (${(file.size / 1024 / 1024).toFixed(1)} MB). Maximum is 5 MB.`,
    };
  }

  if (file.size === 0) {
    return { success: false, error: "File is empty" };
  }

  await ensureUploadDir();

  const ext = MIME_TO_EXT[file.type] || extname(file.name).toLowerCase() || ".jpg";
  const filename = `${randomUUID()}${ext}`;
  const filepath = join(UPLOAD_DIR, filename);

  const buffer = Buffer.from(await file.arrayBuffer());
  await writeFile(filepath, buffer);

  return { success: true, url: `/uploads/${filename}` };
}

/**
 * Delete an uploaded file from disk if it's a local upload.
 * Silently ignores external URLs and missing files.
 */
export async function deleteUploadedFile(url: string): Promise<void> {
  if (!isLocalUpload(url)) return;

  const filename = url.replace("/uploads/", "");
  // Prevent path traversal
  if (filename.includes("/") || filename.includes("\\") || filename.includes("..")) return;

  const filepath = join(UPLOAD_DIR, filename);
  try {
    await unlink(filepath);
  } catch {
    // File may already be deleted — ignore
  }
}

/**
 * Check if a URL is a local upload path (starts with /uploads/).
 */
export function isLocalUpload(url: string): boolean {
  return url.startsWith("/uploads/");
}
```

**Step 2: Verify types compile**

Run: `npx react-router typegen && npx tsc --noEmit`
Expected: No errors related to `upload.server.ts`

**Step 3: Commit**

```bash
git add app/lib/upload.server.ts
git commit -m "feat: add server-side file upload utility

Handles file validation (type, size), saves to data/uploads/ with UUID
filenames, and provides cleanup for deleted uploads.

Co-authored-by: Copilot <223556219+Copilot@users.noreply.github.com>"
```

---

### Task 2: Resource Route to Serve Uploads

**Files:**
- Create: `app/routes/uploads.$filename.ts`
- Modify: `app/routes.ts` (add route entry)

**Step 1: Create the resource route**

```typescript
// app/routes/uploads.$filename.ts
import { readFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import { join, extname } from "node:path";
import type { Route } from "./+types/uploads.$filename";

const UPLOAD_DIR = join(process.cwd(), "data", "uploads");

const MIME_MAP: Record<string, string> = {
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".png": "image/png",
  ".webp": "image/webp",
  ".gif": "image/gif",
};

// UUID v4 pattern + image extension
const VALID_FILENAME = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\.(jpg|jpeg|png|webp|gif)$/i;

export async function loader({ params }: Route.LoaderArgs) {
  const { filename } = params;

  if (!filename || !VALID_FILENAME.test(filename)) {
    throw new Response("Not Found", { status: 404 });
  }

  // Prevent path traversal
  if (filename.includes("/") || filename.includes("\\") || filename.includes("..")) {
    throw new Response("Not Found", { status: 404 });
  }

  const filepath = join(UPLOAD_DIR, filename);

  if (!existsSync(filepath)) {
    throw new Response("Not Found", { status: 404 });
  }

  const ext = extname(filename).toLowerCase();
  const contentType = MIME_MAP[ext] || "application/octet-stream";

  const fileBuffer = await readFile(filepath);

  return new Response(fileBuffer, {
    headers: {
      "Content-Type": contentType,
      "Cache-Control": "public, max-age=31536000, immutable",
    },
  });
}
```

**Step 2: Register the route in `app/routes.ts`**

Add before the dashboard route:

```typescript
route("uploads/:filename", "routes/uploads.$filename.ts"),
```

The routes array should include:
```typescript
// ... existing routes ...
route("uploads/:filename", "routes/uploads.$filename.ts"),
route("dashboard", "routes/dashboard.tsx", [
// ...
```

**Step 3: Verify types compile**

Run: `npx react-router typegen && npx tsc --noEmit`
Expected: No errors

**Step 4: Commit**

```bash
git add app/routes/uploads.$filename.ts app/routes.ts
git commit -m "feat: add resource route to serve uploaded images

Serves files from data/uploads/ with proper MIME types, cache headers,
UUID filename validation, and path traversal prevention.

Co-authored-by: Copilot <223556219+Copilot@users.noreply.github.com>"
```

---

### Task 3: Update Media Validation for Local Uploads

**Files:**
- Modify: `app/lib/media-validation.server.ts`

**Step 1: Update `validateImageUrl` to accept local upload paths**

At the top of `validateImageUrl()`, before the existing empty check, add a check for local upload paths:

```typescript
export function validateImageUrl(url: string): ValidationResult {
  const trimmed = url.trim();

  // Accept local uploads (e.g. "/uploads/uuid.jpg")
  if (trimmed.startsWith("/uploads/")) {
    return { valid: true };
  }

  // ... rest of existing validation unchanged ...
}
```

**Step 2: Verify types compile**

Run: `npx react-router typegen && npx tsc --noEmit`
Expected: No errors

**Step 3: Commit**

```bash
git add app/lib/media-validation.server.ts
git commit -m "feat: allow local upload paths in image URL validation

Local /uploads/ paths now pass validation alongside external HTTPS URLs.

Co-authored-by: Copilot <223556219+Copilot@users.noreply.github.com>"
```

---

### Task 4: Reusable ImageUpload Component

**Files:**
- Create: `app/components/ui/image-upload.tsx`

**Step 1: Create the component**

Build a client-side component with:
- **Dual mode toggle**: "Upload" tab (file picker) and "URL" tab (paste field)
- **File input**: Click-to-browse zone with drag-and-drop (styled to match dark theme)
- **Preview thumbnails**: Show selected images with remove button
- **Props**: `mode: "single" | "multiple"`, `maxFiles: number`, `name: string`, `existingUrls?: string[]`
- **Hidden inputs**: Render hidden `<input>` fields so form submission includes file data and URL data
- **"use client"** directive at top
- **Mobile camera support**: `accept="image/*"` attribute on file input
- For file uploads, use `enctype="multipart/form-data"` on the parent form (caller responsibility)

The component manages its own state for selected files and URL entries. On form submission:
- Files are sent as `File` objects via multipart form data (field name: `{name}_file_{index}`)
- URLs are sent as text via existing `{name}_{index}` fields

**Key UI elements:**
- Mode toggle buttons (Upload / URL) styled with emerald accent
- Drop zone with dashed border, camera/upload icon, "Tap to upload" text
- Thumbnail grid with remove (X) buttons
- URL text inputs with add/remove buttons (matches existing pattern)
- `text-[10px] font-mono uppercase tracking-widest` labels

```typescript
// Full component structure — implement with:
// - useState for mode ("upload" | "url"), files array, url strings array
// - useRef for hidden file input
// - Drag/drop handlers (onDragOver, onDragLeave, onDrop)
// - File validation client-side (type + size) with error messages
// - Object URL previews for selected files (URL.createObjectURL)
// - Cleanup via URL.revokeObjectURL in useEffect
```

**Step 2: Verify types compile**

Run: `npx react-router typegen && npx tsc --noEmit`

**Step 3: Commit**

```bash
git add app/components/ui/image-upload.tsx
git commit -m "feat: add reusable ImageUpload component

Dual-mode (file upload + URL paste) with drag-and-drop, thumbnails,
client-side validation, and mobile camera capture support.

Co-authored-by: Copilot <223556219+Copilot@users.noreply.github.com>"
```

---

### Task 5: Integrate Upload in Add Listing (`add.tsx`)

**Files:**
- Modify: `app/routes/dashboard/add.tsx`

**Step 1: Update the form**

1. Add `enctype="multipart/form-data"` to the `<Form>` element (line ~339)
2. Replace the existing image URL inputs section (lines ~510-580) with the `<ImageUpload>` component:
   ```tsx
   <ImageUpload name="imageUrl" mode="multiple" maxFiles={5} />
   ```
3. Import `ImageUpload` from `~/components/ui/image-upload`

**Step 2: Update the action**

In the action handler, after getting `formData`, handle both file uploads and URLs:

1. Import `saveUploadedFile` from `~/lib/upload.server`
2. Collect files from `formData.getAll()` entries matching `imageUrl_file_*` pattern
3. For each file, call `saveUploadedFile()` and collect the returned URLs
4. Merge with any pasted URLs from `imageUrl_*` fields
5. Store all URLs (local + external) in `listingImages` as before

```typescript
// In the action, replace the existing image collection block:
const imageUrls: string[] = [];
const entries = Array.from(formData.entries());

// Collect uploaded files
for (const [key, value] of entries) {
  if (key.startsWith("imageUrl_file_") && value instanceof File && value.size > 0) {
    const result = await saveUploadedFile(value);
    if (!result.success) {
      errors[key] = result.error ?? "Upload failed";
    } else {
      imageUrls.push(result.url!);
    }
  }
}

// Collect pasted URLs (existing logic)
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
```

**Step 3: Verify types compile**

Run: `npx react-router typegen && npx tsc --noEmit`

**Step 4: Manual test**

Run `npm run dev` and test:
1. Navigate to /dashboard/add
2. Toggle between Upload and URL modes
3. Upload a JPEG file — verify it appears as a preview
4. Submit the listing — verify the image is stored and viewable
5. Try uploading a >5MB file — verify error message

**Step 5: Commit**

```bash
git add app/routes/dashboard/add.tsx
git commit -m "feat: integrate file upload in add listing form

Users can now upload images from device or paste URLs. Files saved to
local storage and served via /uploads/ route.

Co-authored-by: Copilot <223556219+Copilot@users.noreply.github.com>"
```

---

### Task 6: Integrate Upload in Profile (Avatar + Listing Edit)

**Files:**
- Modify: `app/routes/dashboard/profile.tsx`

**Step 1: Update avatar section**

1. Replace the avatar URL input (lines ~470-490) with `<ImageUpload>` in single mode:
   ```tsx
   <ImageUpload name="avatarUrl" mode="single" maxFiles={1} existingUrls={profile.avatarUrl ? [profile.avatarUrl] : []} />
   ```
2. Add `enctype="multipart/form-data"` to the avatar fetcher form
3. Import `ImageUpload` and `saveUploadedFile`

**Step 2: Update avatar action**

In the `update-avatar` intent handler:

```typescript
if (intent === "update-avatar") {
  // Check for uploaded file first
  const avatarFile = formData.get("avatarUrl_file_0");
  let avatarUrl: string;

  if (avatarFile instanceof File && avatarFile.size > 0) {
    const uploadResult = await saveUploadedFile(avatarFile);
    if (!uploadResult.success) {
      return { success: false, intent: "update-avatar", error: uploadResult.error };
    }
    avatarUrl = uploadResult.url!;

    // Clean up old avatar if it was a local upload
    if (profile.avatarUrl) {
      await deleteUploadedFile(profile.avatarUrl);
    }
  } else {
    // Fallback to URL input
    avatarUrl = (formData.get("avatarUrl_0") as string)?.trim() || "";
    if (avatarUrl === "") {
      return { success: false, intent: "update-avatar", error: "Please upload an image or enter a URL" };
    }
    const validation = validateImageUrl(avatarUrl);
    if (!validation.valid) {
      return { success: false, intent: "update-avatar", error: validation.error };
    }
  }

  await db.update(profiles).set({ avatarUrl, updatedAt: new Date() })
    .where(eq(profiles.userId, user.id));
  return { success: true, intent: "update-avatar" };
}
```

Need to fetch profile data for the old avatar cleanup — add a query before the intent switch.

**Step 3: Update listing edit section**

In the listing edit form within the `ListingCard` component (lines ~1220-1300):

1. Replace the image URL inputs with `<ImageUpload>` in multiple mode
2. Add `enctype="multipart/form-data"` to the listing edit form
3. Pass existing images via `existingUrls` prop

**Step 4: Update listing edit action**

In the `update-listing` intent handler, handle file uploads the same way as Task 5:

```typescript
// Before processing, fetch old image URLs for cleanup
const oldImages = await db
  .select({ url: listingImages.url })
  .from(listingImages)
  .where(eq(listingImages.listingId, listingId));

// ... collect imageUrls from files + URL inputs (same pattern as Task 5) ...

// After replacing images, clean up old local uploads
for (const img of oldImages) {
  await deleteUploadedFile(img.url);
}
```

**Step 5: Verify types compile**

Run: `npx react-router typegen && npx tsc --noEmit`

**Step 6: Manual test**

Run `npm run dev` and test:
1. Navigate to /dashboard/profile
2. Upload a new avatar via file picker — verify it displays
3. Edit a listing and upload new images — verify they replace the old ones
4. Check that old uploaded files are cleaned up from `data/uploads/`

**Step 7: Commit**

```bash
git add app/routes/dashboard/profile.tsx
git commit -m "feat: integrate file upload for avatar and listing edit

Avatar and listing edit forms now support device file upload alongside
URL paste. Old uploaded files cleaned up on replacement.

Co-authored-by: Copilot <223556219+Copilot@users.noreply.github.com>"
```

---

### Task 7: Hide Own Listings from Feed

**Files:**
- Modify: `app/routes/dashboard/home.tsx`

**Step 1: Update the feed query**

In the loader (line ~53), change the WHERE clause from:

```typescript
.where(eq(listings.status, "active"))
```

to:

```typescript
.where(and(eq(listings.status, "active"), ne(listings.userId, user.id)))
```

Note: `ne` and `and` are already imported from `drizzle-orm` on line 2.

**Step 2: Verify AI match also excludes own listings**

Check the AI match section — it should already exclude own listings since it queries by matched IDs from the Gemini response, but verify and add explicit filtering if needed. The Gemini prompt should already say "other users' listings". If the matched IDs could include own listings, filter them out:

```typescript
// After getting matchedIds from Gemini
const filteredIds = matchedIds.filter(id => !userListingIds.includes(id));
```

**Step 3: Verify types compile**

Run: `npx react-router typegen && npx tsc --noEmit`

**Step 4: Manual test**

Run `npm run dev` and test:
1. Log in and create a listing
2. Navigate to /dashboard (feed)
3. Verify your own listing does NOT appear in the feed
4. Verify other users' listings still appear

**Step 5: Commit**

```bash
git add app/routes/dashboard/home.tsx
git commit -m "feat: hide user's own listings from feed

Users now only see other people's listings in the feed. Own listings
are still visible on the profile page.

Co-authored-by: Copilot <223556219+Copilot@users.noreply.github.com>"
```

---

### Task 8: Add `data/uploads` to .gitignore

**Files:**
- Modify: `.gitignore`

**Step 1: Add uploads directory**

Append to `.gitignore`:

```
# Uploaded media files
data/uploads/
```

**Step 2: Commit**

```bash
git add .gitignore
git commit -m "chore: ignore uploaded media files in git

Co-authored-by: Copilot <223556219+Copilot@users.noreply.github.com>"
```

---

## Dependency Graph

```
Task 1 (upload utility)     ──┐
Task 3 (media validation)   ──┼──▶ Task 5 (add.tsx integration)
Task 4 (ImageUpload component)──┤
                               ├──▶ Task 6 (profile.tsx integration)
Task 2 (resource route)     ──┘
Task 7 (feed filter)        ──── (independent)
Task 8 (.gitignore)         ──── (independent)
```

**Parallelizable groups:**
- Group A (independent): Tasks 1, 3, 4, 7, 8
- Group B (depends on Group A): Tasks 2, 5, 6

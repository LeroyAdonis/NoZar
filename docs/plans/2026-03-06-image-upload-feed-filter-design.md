# Design: Image Upload from Device & Hide Own Listings

**Date**: 2026-03-06
**Status**: Draft

---

## Problem Statement

Two UX gaps in the current Nozar MVP:

1. **Image upload**: Users can only add images by pasting URLs (from Imgur, Cloudinary, etc.). Most mobile/desktop users expect to upload directly from their device camera roll or file system.
2. **Own listings in feed**: The feed shows *all* active listings including the current user's own, which is noise — users already see their listings on their profile page.

---

## Feature 1: Upload from Device

### Current State

- Images stored as URL references in the `listing_images` table (`url` text column)
- Avatar stored as URL in `profiles.avatarUrl`
- Validation enforces HTTPS + known image hosts or image file extensions (`media-validation.server.ts`)
- Max 5 images per listing
- Image replace strategy on edit: delete all old, insert new

### Design

#### Approach: Local Disk Storage with Resource Route (MVP)

**Why this approach:**
- No external dependencies (no S3/Cloudinary accounts needed)
- Simple to implement with Node.js `fs` APIs
- Clean migration path to cloud storage later (swap the storage utility)
- Files served via a dedicated resource route

**Rejected alternatives:**
- *Base64 in DB*: Bloats the database, terrible for performance
- *Cloud storage (S3/Cloudinary)*: Adds complexity and config burden — overkill for MVP
- *`public/` directory*: Won't work for runtime uploads in production builds

#### Architecture

```
Upload Flow:
  Browser (File input) ──multipart──▶ Action handler
    └──▶ upload.server.ts (validate + save to disk)
      └──▶ /data/uploads/<uuid>.<ext> (file on disk)
        └──▶ Insert URL "/uploads/<uuid>.<ext>" into DB

Serving Flow:
  Browser ──GET /uploads/<filename>──▶ Resource route
    └──▶ Read from /data/uploads/<filename>
      └──▶ Stream response with correct Content-Type
```

**New files:**
- `app/lib/upload.server.ts` — File validation, saving, deletion utilities
- `app/routes/uploads.$filename.ts` — Resource route to serve uploaded files

**Modified files:**
- `app/routes/dashboard/add.tsx` — Add file upload UI alongside URL paste
- `app/routes/dashboard/profile.tsx` — Add file upload for avatar + listing edit
- `app/lib/media-validation.server.ts` — Add `isLocalUpload()` check to accept `/uploads/` paths
- `app/components/ui/image-upload.tsx` — Reusable upload component (file input + preview + drag-drop)

#### File Validation Rules

| Check | Limit |
|-------|-------|
| Max file size | 5 MB |
| Allowed MIME types | `image/jpeg`, `image/png`, `image/webp`, `image/gif` |
| Filename | UUID v4 + original extension (sanitized) |

#### Upload Server Utility (`upload.server.ts`)

```typescript
// Key exports:
saveUploadedFile(file: File): Promise<string>    // Returns "/uploads/<uuid>.<ext>"
deleteUploadedFile(url: string): Promise<void>   // Removes file from disk
isLocalUpload(url: string): boolean              // Checks if URL is a local upload
```

- Saves to `data/uploads/` directory (created on first upload)
- Generates UUID filename to prevent collisions and path traversal
- Returns relative URL path stored in the database

#### Image Upload Component (`image-upload.tsx`)

Reusable component used in both `add.tsx` and `profile.tsx`:

- **Dual mode**: Tab or toggle between "Upload" (file picker) and "URL" (paste field)
- **File input**: Click to browse + drag-and-drop zone
- **Preview**: Thumbnail preview of selected files before form submission
- **Multiple files**: Support selecting multiple files at once (for listings)
- **Single file mode**: For avatar upload (single file only)
- **Remove**: Click to remove a selected file/URL before submission
- **Mobile-friendly**: Large touch targets, camera capture support via `accept="image/*" capture="environment"`
- **Styling**: Dark theme consistent with existing brutalist design

#### Resource Route (`uploads.$filename.ts`)

- Loader-only route (no UI)
- Validates filename format (must match UUID pattern + allowed extension)
- Reads file from `data/uploads/` directory
- Returns `Response` with correct `Content-Type` header and `Cache-Control`
- Returns 404 for missing files
- Path traversal prevention: strip directory separators from filename param

#### Form Data Handling

The existing actions in `add.tsx` and `profile.tsx` handle `FormData` from forms. To support file uploads:

1. Form uses `enctype="multipart/form-data"` 
2. Action receives `File` objects via `formData.get("image-file")` or `formData.getAll("image-files")`
3. Each file is saved via `saveUploadedFile()` which returns a URL
4. The URL is stored in `listing_images` or `profiles.avatarUrl` exactly like external URLs

#### Cleanup

When listings are deleted/archived or images are replaced:
- Call `deleteUploadedFile()` for each local upload URL being removed
- External URLs are ignored (no cleanup needed)

---

## Feature 2: Hide Own Listings from Feed

### Current State

```typescript
// home.tsx loader — currently fetches ALL active listings
.where(eq(listings.status, "active"))
```

The user's own listings appear in the feed alongside everyone else's.

### Design

**Change**: Add a `ne(listings.userId, user.id)` condition to the feed query:

```typescript
.where(and(
  eq(listings.status, "active"),
  ne(listings.userId, user.id),
))
```

**Also filter from AI match results**: The Gemini-powered match feature should already exclude own listings since it matches against "other users' listings", but we should verify and add explicit filtering.

**No UI changes needed** — this is purely a data query change.

---

## Scope Summary

### In scope:
- File upload from device (listings + avatar)
- Drag-and-drop support
- Image preview before submission
- Local disk storage with resource route serving
- File size and type validation
- Hide own listings from feed
- Cleanup of uploaded files on replacement

### Out of scope:
- Image cropping/resizing (future enhancement)
- Cloud storage migration (future)
- Image compression/optimization (future)
- BlurHash generation for uploaded images (future)
- Progress bar for uploads (browser handles natively with form submission)

// ─── Image URL Validation & Sanitization ───────────────────────
// MVP: URL-based image references only (no file upload yet).

const MAX_URL_LENGTH = 2048;

const IMAGE_EXTENSIONS = new Set([
  ".jpg",
  ".jpeg",
  ".png",
  ".gif",
  ".webp",
  ".avif",
  ".svg",
  ".bmp",
  ".tiff",
]);

/** Hosts that serve images without file extensions in the URL. */
const KNOWN_IMAGE_HOSTS = new Set([
  "imgur.com",
  "i.imgur.com",
  "res.cloudinary.com",
  "images.unsplash.com",
  "unsplash.com",
  "cdn.pixabay.com",
  "images.pexels.com",
  "lh3.googleusercontent.com",
  "firebasestorage.googleapis.com",
  "storage.googleapis.com",
  "s3.amazonaws.com",
  "imagekit.io",
  "ik.imagekit.io",
  "media.istockphoto.com",
  "upload.wikimedia.org",
  // Vercel Blob — URLs from @vercel/blob `put()` land here
  "blob.vercel-storage.com",
]);

interface ValidationResult {
  valid: boolean;
  error?: string;
}

/**
 * Validate that a string is a usable image URL.
 *
 * Checks:
 * 1. Not empty / too long
 * 2. Parseable as a URL
 * 3. Uses https:// scheme
 * 4. Has an image-like extension OR comes from a known image host
 */
export function validateImageUrl(url: string): ValidationResult {
  const trimmed = url.trim();

  if (trimmed.length === 0) {
    return { valid: false, error: "Image URL cannot be empty" };
  }

  if (trimmed.length > MAX_URL_LENGTH) {
    return {
      valid: false,
      error: `URL exceeds maximum length of ${MAX_URL_LENGTH} characters`,
    };
  }

  let parsed: URL;
  try {
    parsed = new URL(trimmed);
  } catch {
    return { valid: false, error: "Invalid URL format" };
  }

  if (parsed.protocol !== "https:") {
    return { valid: false, error: "Only HTTPS URLs are allowed" };
  }

  // Check extension (strip query string by using pathname)
  const pathname = parsed.pathname.toLowerCase();
  const hasImageExtension = Array.from(IMAGE_EXTENSIONS).some((ext) =>
    pathname.endsWith(ext),
  );

  if (hasImageExtension) {
    return { valid: true };
  }

  // Check known image hosts
  const hostname = parsed.hostname.toLowerCase();
  const isKnownHost = Array.from(KNOWN_IMAGE_HOSTS).some(
    (host) => hostname === host || hostname.endsWith(`.${host}`),
  );

  if (isKnownHost) {
    return { valid: true };
  }

  return {
    valid: false,
    error:
      "URL must point to an image (supported extensions: jpg, png, gif, webp, avif, svg) or be from a known image host (imgur, cloudinary, unsplash, etc.)",
  };
}

/**
 * Trim whitespace and apply basic sanitisation to an image URL.
 */
export function sanitizeImageUrl(url: string): string {
  let sanitized = url.trim();

  // Strip leading/trailing quotes (users sometimes paste these)
  if (
    (sanitized.startsWith('"') && sanitized.endsWith('"')) ||
    (sanitized.startsWith("'") && sanitized.endsWith("'"))
  ) {
    sanitized = sanitized.slice(1, -1).trim();
  }

  return sanitized;
}

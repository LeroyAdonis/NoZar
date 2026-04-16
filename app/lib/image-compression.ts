/**
 * Client-side image compression utility for mobile-optimized uploads.
 * 
 * Compresses images using the Canvas API to:
 * - Max resolution: 1920px width (maintains aspect ratio)
 * - JPEG quality: 0.8
 * - Max file size: 500KB
 * 
 * Designed for slow mobile networks in South Africa.
 */

export interface CompressionOptions {
  /** Maximum width in pixels (default: 1920) */
  maxWidth?: number;
  /** JPEG quality 0-1 (default: 0.8) */
  quality?: number;
  /** Maximum file size in bytes (default: 500KB) */
  maxFileSize?: number;
  /** Output format (default: 'image/jpeg') */
  format?: 'image/jpeg' | 'image/png' | 'image/webp';
}

export interface CompressionResult {
  /** Compressed image as a File object */
  file: File;
  /** Original file size in bytes */
  originalSize: number;
  /** Compressed file size in bytes */
  compressedSize: number;
  /** Compression ratio (0-1, e.g., 0.3 means 30% of original) */
  compressionRatio: number;
  /** Data URL for preview */
  dataUrl: string;
  /** Dimensions after compression */
  dimensions: { width: number; height: number };
}

const DEFAULT_OPTIONS: Required<CompressionOptions> = {
  maxWidth: 1920,
  quality: 0.8,
  maxFileSize: 500 * 1024, // 500KB
  format: 'image/jpeg',
};

/**
 * Compresses an image file using the Canvas API.
 * 
 * @param file - The image file to compress
 * @param options - Compression options
 * @returns Promise resolving to compression result
 * 
 * @example
 * ```ts
 * const result = await compressImage(file, { maxFileSize: 300 * 1024 });
 * console.log(`Compressed from ${result.originalSize} to ${result.compressedSize} bytes`);
 * ```
 */
export async function compressImage(
  file: File,
  options: CompressionOptions = {}
): Promise<CompressionResult> {
  const opts = { ...DEFAULT_OPTIONS, ...options };

  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = (e) => {
      const img = new Image();

      img.onload = () => {
        try {
          // Calculate new dimensions maintaining aspect ratio
          let { width, height } = calculateDimensions(
            img.width,
            img.height,
            opts.maxWidth
          );

          // Create canvas and draw resized image
          const canvas = document.createElement('canvas');
          canvas.width = width;
          canvas.height = height;

          const ctx = canvas.getContext('2d');
          if (!ctx) {
            reject(new Error('Failed to get canvas context'));
            return;
          }

          // Enable image smoothing for better quality
          ctx.imageSmoothingEnabled = true;
          ctx.imageSmoothingQuality = 'high';

          // Draw the image scaled to new dimensions
          ctx.drawImage(img, 0, 0, width, height);

          // Try initial compression
          let dataUrl = canvas.toDataURL(opts.format, opts.quality);
          let blob = dataUrlToBlob(dataUrl, opts.format);

          // If still too large, reduce quality iteratively
          let currentQuality = opts.quality;
          const qualityStep = 0.05;

          while (blob.size > opts.maxFileSize && currentQuality > 0.1) {
            currentQuality -= qualityStep;
            dataUrl = canvas.toDataURL(opts.format, currentQuality);
            blob = dataUrlToBlob(dataUrl, opts.format);
          }

          // If still too large, scale down dimensions
          if (blob.size > opts.maxFileSize) {
            const scaleFactor = Math.sqrt(opts.maxFileSize / blob.size) * 0.9;
            width = Math.floor(width * scaleFactor);
            height = Math.floor(height * scaleFactor);

            canvas.width = width;
            canvas.height = height;
            ctx.imageSmoothingEnabled = true;
            ctx.imageSmoothingQuality = 'high';
            ctx.drawImage(img, 0, 0, width, height);

            // Recompress at target quality
            dataUrl = canvas.toDataURL(opts.format, opts.quality);
            blob = dataUrlToBlob(dataUrl, opts.format);
          }

          // Create File object with original filename but compressed content
          const extension = opts.format === 'image/jpeg' ? 'jpg' : 
                           opts.format === 'image/png' ? 'png' : 'webp';
          const compressedFile = new File(
            [blob],
            file.name.replace(/\.[^.]+$/, `.${extension}`),
            { type: opts.format }
          );

          resolve({
            file: compressedFile,
            originalSize: file.size,
            compressedSize: compressedFile.size,
            compressionRatio: compressedFile.size / file.size,
            dataUrl,
            dimensions: { width, height },
          });
        } catch (err) {
          reject(err);
        }
      };

      img.onerror = () => {
        reject(new Error('Failed to load image'));
      };

      img.src = e.target?.result as string;
    };

    reader.onerror = () => {
      reject(new Error('Failed to read file'));
    };

    reader.readAsDataURL(file);
  });
}

/**
 * Calculate dimensions maintaining aspect ratio.
 */
function calculateDimensions(
  originalWidth: number,
  originalHeight: number,
  maxWidth: number
): { width: number; height: number } {
  if (originalWidth <= maxWidth) {
    return { width: originalWidth, height: originalHeight };
  }

  const ratio = maxWidth / originalWidth;
  return {
    width: maxWidth,
    height: Math.round(originalHeight * ratio),
  };
}

/**
 * Convert data URL to Blob.
 */
function dataUrlToBlob(dataUrl: string, mimeType: string): Blob {
  const base64 = dataUrl.split(',')[1];
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);

  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }

  return new Blob([bytes], { type: mimeType });
}

/**
 * Check if the browser supports the necessary APIs for compression.
 */
export function isCompressionSupported(): boolean {
  return (
    typeof document !== 'undefined' &&
    typeof document.createElement === 'function' &&
    typeof FileReader !== 'undefined' &&
    typeof HTMLCanvasElement !== 'undefined' &&
    typeof atob === 'function'
  );
}

/**
 * Get human-readable file size.
 */
export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

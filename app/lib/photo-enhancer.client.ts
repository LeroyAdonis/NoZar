/**
 * Client-side photo enhancement utilities using Canvas API.
 * Auto-adjusts brightness/contrast/saturation to improve listing photos.
 */

/**
 * Load an image onto a canvas and return the canvas context + image data.
 */
function loadImage(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("Failed to load image"));
    img.src = url;
  });
}

/**
 * Calculate the auto levels (contrast stretch) thresholds.
 * Finds the darkest and lightest 1% of pixels to stretch from.
 */
function calcAutoLevels(
  data: Uint8ClampedArray,
): { min: number; max: number } {
  // Build histogram
  const hist = new Uint32Array(256);
  for (let i = 0; i < data.length; i += 4) {
    // Use luminance (0.299 R + 0.587 G + 0.114 B)
    const lum = Math.round(
      0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2],
    );
    hist[lum]++;
  }

  const total = data.length / 4;
  const clip = Math.floor(total * 0.005); // clip 0.5% from each end

  let min = 0;
  let accumulated = 0;
  for (let i = 0; i < 256; i++) {
    accumulated += hist[i];
    if (accumulated > clip) {
      min = i;
      break;
    }
  }

  let max = 255;
  accumulated = 0;
  for (let i = 255; i >= 0; i--) {
    accumulated += hist[i];
    if (accumulated > clip) {
      max = i;
      break;
    }
  }

  return { min, max };
}

/**
 * Enhance an image by auto-adjusting brightness, contrast, and saturation.
 *
 * @param imageUrl - URL of the image to enhance
 * @returns A data URL of the enhanced image (JPEG format)
 */
export async function enhanceImage(imageUrl: string): Promise<string> {
  const img = await loadImage(imageUrl);

  const canvas = document.createElement("canvas");
  canvas.width = img.naturalWidth;
  canvas.height = img.naturalHeight;
  const ctx = canvas.getContext("2d")!;

  // Draw original
  ctx.drawImage(img, 0, 0);

  // Get pixel data
  const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
  const data = imageData.data;

  // Auto levels (contrast stretch)
  const { min, max } = calcAutoLevels(data);
  const range = max - min || 1;

  // Slight saturation boost
  const saturationBoost = 1.1;

  for (let i = 0; i < data.length; i += 4) {
    let r = data[i];
    let g = data[i + 1];
    let b = data[i + 2];

    // Contrast stretch
    r = ((r - min) / range) * 255;
    g = ((g - min) / range) * 255;
    b = ((b - min) / range) * 255;

    // Saturation boost (simple RGB → HSL → RGB)
    const gray = 0.299 * r + 0.587 * g + 0.114 * b;
    r = Math.round(gray + (r - gray) * saturationBoost);
    g = Math.round(gray + (g - gray) * saturationBoost);
    b = Math.round(gray + (b - gray) * saturationBoost);

    // Clamp
    data[i] = Math.max(0, Math.min(255, r));
    data[i + 1] = Math.max(0, Math.min(255, g));
    data[i + 2] = Math.max(0, Math.min(255, b));
  }

  ctx.putImageData(imageData, 0, 0);
  return canvas.toDataURL("image/jpeg", 0.92);
}

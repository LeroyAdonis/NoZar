---
name: nano-banana
description: REQUIRED for all image generation requests. Generate images using Puter.js Nano Banana (client-side AI). Handles social media images for Instagram, Facebook, Twitter/X, LinkedIn. Use this skill whenever the user asks to create, generate, make, draw, design, or edit any image or visual content.
---

# Nano Banana Image Generation Skill (Puter.js)

## Overview

This skill uses **Puter.js** for client-side AI image generation via the Nano Banana model. No API keys needed — uses the "User-Pays" model where users cover their own costs.

**Key Capabilities:**
- Generate platform-specific social media images
- Client-side execution (no server infrastructure needed)
- Free for developers (zero API costs)
- Multiple models: Gemini 2.5 Flash Image, DALL-E 3, GPT Image 1

## Setup

Puter.js is loaded via script tag in `app/layout.tsx`:

```html
<script src="https://js.puter.com/v2/" defer></script>
```

No npm install or API keys required.

## Usage

### Basic Image Generation

```javascript
// Generate image with Puter.js
const image = await puter.ai.txt2img("A professional photo of Cape Town at sunset", {
  model: "gemini-2.5-flash-preview-image-generation"
});

// image is an HTMLImageElement
// image.src contains the data URL (base64 encoded)
const dataUrl = image.src; // "data:image/png;base64,..."
```

### Available Models

| Model | Provider | Best For |
|-------|----------|----------|
| `gemini-2.5-flash-preview-image-generation` | Google | Fast, high-quality (default) |
| `dall-e-3` | OpenAI | Creative, artistic images |
| `gpt-image-1` | OpenAI | Photorealistic images |

### Integration in Purple Glow Social

The service is implemented in `lib/ai/puter-ai-service.ts`:

```typescript
import { generateImageWithPuter, isPuterAvailable } from '@/lib/ai/puter-ai-service';

// Check availability
if (isPuterAvailable()) {
  const dataUrl = await generateImageWithPuter(
    "Professional Instagram image: coffee shop in Cape Town"
  );
  // dataUrl is base64 data URL or null
}
```

### Platform-Specific Prompts

```typescript
const prompts = {
  instagram: `High-quality, vibrant photo related to "${topic}". South African aesthetic, bright colors, professional photography.`,
  facebook: `Engaging image related to "${topic}". Clear, eye-catching, suitable for business use.`,
  twitter: `Simple, bold image related to "${topic}". Easy to understand at a glance.`,
  linkedin: `Professional image related to "${topic}". Clean, business-appropriate, high-quality.`,
};
```

## Error Handling

Image generation is non-critical — posts continue without images if generation fails:

```typescript
try {
  const imageUrl = await generateImageWithPuter(prompt);
  if (imageUrl) {
    // Use image
  }
} catch (error) {
  console.warn("Image generation failed (non-critical)", error);
  // Continue with text-only post
}
```

## Resources

- [Puter.js txt2img API](https://developer.puter.com/tutorials/free-unlimited-nano-banana-api/)
- [Puter.js Documentation](https://docs.puter.com/)
- [Nano Banana Original](https://github.com/kkoppenhaver/cc-nano-banana)

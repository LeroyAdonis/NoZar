const NVIDIA_PLACEHOLDERS = new Set([
  "YOUR_NVIDIA_API_KEY",
  "your_nvidia_api_key",
]);

export function getConfiguredNvidiaApiKey(): string | null {
  const value = process.env.NVIDIA_API_KEY?.trim();
  if (!value || NVIDIA_PLACEHOLDERS.has(value)) {
    return null;
  }

  return value;
}

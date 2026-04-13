import { GoogleGenAI } from "@google/genai";
import { callNvidiaModel } from "./nvidia.server";

export async function generateContent(prompt: string, systemInstruction?: string) {
  // Try Gemini first
  const geminiApiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_MAPS_API_KEY;
  const hasGemini = geminiApiKey && geminiApiKey !== "YOUR_GEMINI_API_KEY" && geminiApiKey !== "YOUR_GOOGLE_MAPS_API_KEY";

  if (hasGemini) {
    try {
      const genAI = new GoogleGenAI({ apiKey: geminiApiKey! });
      const result = await genAI.models.generateContent({
        model: "gemini-2.0-flash",
        contents: systemInstruction ? `${systemInstruction}\n\n${prompt}` : prompt,
      });
      if (result.text) return result.text;
    } catch (error) {
      console.error("Gemini failed, falling back to NVIDIA:", error);
    }
  }

  // Fallback to NVIDIA
  const nvidiaApiKey = process.env.NVIDIA_API_KEY;
  if (nvidiaApiKey && nvidiaApiKey !== "YOUR_NVIDIA_API_KEY") {
    try {
      return await callNvidiaModel(systemInstruction ? `${systemInstruction}\n\n${prompt}` : prompt);
    } catch (error) {
      console.error("NVIDIA fallback failed:", error);
    }
  }

  throw new Error("AI service unavailable (no valid keys or all services failed)");
}

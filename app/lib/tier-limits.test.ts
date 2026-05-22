import { describe, test, expect } from "vitest";
import { canUseAiFeature } from "./tier-limits";

describe("canUseAiFeature", () => {
  test("free tier is blocked from ai_description", () => {
    expect(canUseAiFeature("free", "ai_description")).toBe(false);
  });
  test("free tier is blocked from ai_matching", () => {
    expect(canUseAiFeature("free", "ai_matching")).toBe(false);
  });
  test("free tier is blocked from ai_chat", () => {
    expect(canUseAiFeature("free", "ai_chat")).toBe(false);
  });
  test("null planCode defaults to free (blocked)", () => {
    expect(canUseAiFeature(null, "ai_description")).toBe(false);
  });
  test("plus tier can use ai_description", () => {
    expect(canUseAiFeature("plus", "ai_description")).toBe(true);
  });
  test("business tier can use ai_matching", () => {
    expect(canUseAiFeature("business", "ai_matching")).toBe(true);
  });
  test("enterprise tier can use ai_chat", () => {
    expect(canUseAiFeature("enterprise", "ai_chat")).toBe(true);
  });
});

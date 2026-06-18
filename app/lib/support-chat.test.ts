import { describe, test, expect, vi, beforeEach, afterEach } from "vitest";
import { escalateUnansweredQuestion } from "./support-chat";

// ── Mocks ───────────────────────────────────────────────────────

vi.mock("./email.server", () => ({
  supportEscalationEmail: vi.fn(() => Promise.resolve()),
}));

import { supportEscalationEmail } from "./email.server";

// ── Tests ───────────────────────────────────────────────────────

describe("escalateUnansweredQuestion", () => {
  const params = {
    userEmail: "alice@example.com",
    userName: "Alice",
    question: "How do I reset my password?",
    timestamp: "18/06/2026 14:30:00",
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    delete process.env.TELEGRAM_BOT_TOKEN;
  });

  test("sends Telegram message when TELEGRAM_BOT_TOKEN is configured", async () => {
    process.env.TELEGRAM_BOT_TOKEN = "test-token-12345";

    const fetchMock = vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response("ok", { status: 200 }),
    );

    await escalateUnansweredQuestion(params);

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const callUrl = fetchMock.mock.calls[0][0];
    const callInit = fetchMock.mock.calls[0][1] as RequestInit;

    expect(callUrl).toBe(
      "https://api.telegram.org/bottest-token-12345/sendMessage",
    );
    expect(callInit.method).toBe("POST");

    const body = JSON.parse(callInit.body as string);
    expect(body.chat_id).toBe("7001253816");
    expect(body.parse_mode).toBe("HTML");
    expect(body.text).toContain("🆘 Support Escalation");
    expect(body.text).toContain("Alice");
    expect(body.text).toContain("alice@example.com");
    expect(body.text).toContain("How do I reset my password?");
    expect(body.text).toContain("/support-reply alice@example.com");

    // Email should NOT be called since Telegram succeeded
    expect(supportEscalationEmail).not.toHaveBeenCalled();
  });

  test("falls back to email when Telegram API call fails", async () => {
    process.env.TELEGRAM_BOT_TOKEN = "test-token-12345";

    vi.spyOn(globalThis, "fetch").mockRejectedValue(
      new Error("Telegram API unreachable"),
    );

    await escalateUnansweredQuestion(params);

    // Should have attempted Telegram
    expect(fetch).toHaveBeenCalledTimes(1);

    // Should fall back to email
    expect(supportEscalationEmail).toHaveBeenCalledTimes(1);
    expect(supportEscalationEmail).toHaveBeenCalledWith(params);
  });

  test("skips Telegram entirely when TELEGRAM_BOT_TOKEN is not set", async () => {
    delete process.env.TELEGRAM_BOT_TOKEN;

    const fetchMock = vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response("ok", { status: 200 }),
    );

    await escalateUnansweredQuestion(params);

    // No Telegram call
    expect(fetchMock).not.toHaveBeenCalled();

    // Falls back to email
    expect(supportEscalationEmail).toHaveBeenCalledTimes(1);
    expect(supportEscalationEmail).toHaveBeenCalledWith(params);
  });
});

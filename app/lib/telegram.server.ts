/**
 * Telegram bot notification service.
 *
 * Sends messages to a configured chat via the Telegram Bot API.
 * Graceful degradation — if TELEGRAM_BOT_TOKEN is not set, logs
 * a warning and skips the send (no crash).
 */

const TELEGRAM_CHAT_ID = "7001253816";

/**
 * Send a plain or HTML-formatted message to the support Telegram chat.
 * Returns `true` if the message was sent, `false` if skipped (no token).
 * Throws if the API call fails.
 */
export async function sendTelegramMessage(text: string): Promise<boolean> {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  if (!token) {
    console.warn(
      "[telegram] TELEGRAM_BOT_TOKEN not set — skipping message",
    );
    return false;
  }

  const url = `https://api.telegram.org/bot${token}/sendMessage`;

  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      chat_id: TELEGRAM_CHAT_ID,
      text,
      parse_mode: "HTML",
    }),
  });

  if (!res.ok) {
    const errBody = await res.text().catch(() => "unknown");
    throw new Error(
      `Telegram API error (${res.status}): ${errBody}`,
    );
  }
  return true;
}

import { chromium } from "playwright";

const BASE = "http://localhost:5174";
const SHOT = "C:/scratchpad/nozar/screenshots";
const consoleErrors = [];

(async () => {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 430, height: 932 } });
  const page = await context.newPage();

  page.on("console", (msg) => {
    if (msg.type() === "error") consoleErrors.push(`[console.error] ${msg.text()}`);
  });
  page.on("pageerror", (err) => consoleErrors.push(`[pageerror] ${err.message}`));

  // ─── Navigate directly to Sarah K. (ping id 102, status: handshake_ready) ───
  console.log("\n=== Navigate directly to Sarah K. ping ===");
  await page.goto(`${BASE}/dashboard/pings/102`, { waitUntil: "networkidle" });
  await page.waitForTimeout(1500);
  console.log(`  URL: ${page.url()}`);

  // Screenshot
  await page.screenshot({ path: `${SHOT}/06_sarah_chat.png`, fullPage: true });
  console.log("  Saved: 06_sarah_chat.png");

  // Verify content
  const bodyText = await page.textContent("body");
  const checks = {
    "User: Sarah K.": bodyText.includes("Sarah K."),
    "Asset: Office Desk": bodyText.includes("Office Desk"),
    "Stage 02: Handshake Initiated": bodyText.includes("Stage 02") && bodyText.includes("Handshake Initiated"),
    "Commit & Reveal button": bodyText.includes("Commit") && bodyText.includes("Reveal"),
    "NOT Stage 01 (starts at proposed)": !bodyText.includes("Stage 01"),
    "Has chat messages": bodyText.includes("microwave") || bodyText.includes("Office"),
  };
  console.log("\n  Sarah K. state verification:");
  for (const [label, ok] of Object.entries(checks)) {
    console.log(`    ${ok ? "✅" : "❌"} ${label}`);
  }

  // Snapshot interactive elements
  console.log("\n  Interactive elements:");
  const els = await page.locator("button, input, a").all();
  for (const el of els) {
    const tag = await el.evaluate((e) => e.tagName);
    const text = (await el.textContent())?.trim().substring(0, 80);
    const title = await el.getAttribute("title");
    const placeholder = await el.getAttribute("placeholder");
    const disabled = await el.isDisabled().catch(() => false);
    console.log(`    <${tag}> "${text}" ${title ? `title="${title}"` : ""} ${placeholder ? `ph="${placeholder}"` : ""} ${disabled ? "[DISABLED]" : ""}`);
  }

  // Verify the handshake button is disabled since status is already "proposed"
  const hsBtn = page.locator("button[title='Initiate Handshake']");
  if (await hsBtn.count()) {
    const disabled = await hsBtn.isDisabled();
    console.log(`\n    ${disabled ? "✅" : "❌"} Handshake button is disabled (already proposed)`);
  }

  // Now scroll to bottom to see the Stage 02 card
  await page.evaluate(() => {
    const scrollArea = document.querySelector('.overflow-y-auto');
    if (scrollArea) scrollArea.scrollTop = scrollArea.scrollHeight;
  });
  await page.waitForTimeout(500);
  await page.screenshot({ path: `${SHOT}/07_sarah_stage2_scrolled.png`, fullPage: true });
  console.log("\n  Saved: 07_sarah_stage2_scrolled.png");

  // Console errors
  console.log("\n  Console errors:");
  if (consoleErrors.length === 0) {
    console.log("    ✅ None");
  } else {
    for (const err of consoleErrors) console.log(`    ⚠️ ${err}`);
  }

  console.log("\n  ✅ Sarah K. test complete\n");
  // Don't close browser
})();

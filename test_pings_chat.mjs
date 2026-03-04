import { chromium } from "playwright";

const BASE = "http://localhost:5174";
const SHOT = "C:/scratchpad/nozar/screenshots";
const consoleErrors = [];

(async () => {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 430, height: 932 } });
  const page = await context.newPage();

  // Capture console errors throughout
  page.on("console", (msg) => {
    if (msg.type() === "error") {
      consoleErrors.push(`[console.error] ${msg.text()}`);
    }
  });
  page.on("pageerror", (err) => {
    consoleErrors.push(`[pageerror] ${err.message}`);
  });

  // ─── STEP 1: Navigate to pings list ───
  console.log("\n=== STEP 1: Navigate to /dashboard/pings ===");
  await page.goto(`${BASE}/dashboard/pings`, { waitUntil: "networkidle" });
  await page.waitForTimeout(1000);

  // ─── STEP 2: Screenshot pings list ───
  console.log("=== STEP 2: Screenshot pings list ===");
  await page.screenshot({ path: `${SHOT}/01_pings_list.png`, fullPage: true });
  console.log("  Saved: 01_pings_list.png");

  // ─── STEP 3: Snapshot interactive elements ───
  console.log("\n=== STEP 3: Snapshot interactive elements on pings list ===");
  const allElements = await page.locator("a, button, [role='button'], div.cursor-pointer").all();
  console.log(`  Found ${allElements.length} interactive elements:`);
  for (const el of allElements) {
    const tag = await el.evaluate((e) => e.tagName);
    const cls = await el.getAttribute("class");
    const text = (await el.textContent())?.trim().substring(0, 100);
    const href = await el.getAttribute("href");
    const isCursorPointer = cls?.includes("cursor-pointer");
    console.log(`    <${tag}>${isCursorPointer ? " [clickable-card]" : ""} "${text}" ${href ? `href=${href}` : ""}`);
  }

  // ─── STEP 4: Verify ping threads display correctly ───
  console.log("\n=== STEP 4: Verify ping thread content ===");
  const pageText = await page.textContent("body");

  const checks4 = {
    "User: Sipho T.": pageText.includes("Sipho T."),
    "Asset: Plumbing Service": pageText.includes("Plumbing Service"),
    "User: Sarah K.": pageText.includes("Sarah K."),
    "Asset: Office Desk": pageText.includes("Office Desk"),
    "Handshake Initiated badge (Sarah)": pageText.includes("Handshake Initiated"),
    "Thread count '2 Threads'": pageText.includes("2 Thread"),
  };
  for (const [label, ok] of Object.entries(checks4)) {
    console.log(`  ${ok ? "✅" : "❌"} ${label}`);
  }

  // Check for unread dot on Sipho (unread: true)
  const unreadDot = await page.locator(".bg-emerald-500.rounded-full").count();
  console.log(`  ${unreadDot > 0 ? "✅" : "❌"} Unread indicator dot: found ${unreadDot}`);

  // ─── STEP 5: Click FIRST ping (Sipho T.) — it's a div.cursor-pointer ───
  console.log("\n=== STEP 5: Click first ping thread (Sipho T.) ===");
  const siphoCard = page.locator("div.cursor-pointer").filter({ hasText: "Sipho T." }).first();
  const siphoExists = await siphoCard.count();
  console.log(`  Sipho card found: ${siphoExists > 0}`);
  if (siphoExists) {
    await siphoCard.click();
    await page.waitForTimeout(1500);
    await page.waitForLoadState("networkidle");
    console.log(`  Current URL: ${page.url()}`);
  }

  // ─── STEP 6: Screenshot chat detail ───
  console.log("=== STEP 6: Screenshot chat detail ===");
  await page.screenshot({ path: `${SHOT}/02_chat_sipho_stage1.png`, fullPage: true });
  console.log("  Saved: 02_chat_sipho_stage1.png");

  // ─── STEP 7: Snapshot all elements on chat page ───
  console.log("\n=== STEP 7: Snapshot chat page elements ===");
  const chatElements = await page.locator("a, button, input, textarea, [role='button']").all();
  console.log(`  Found ${chatElements.length} interactive elements:`);
  for (const el of chatElements) {
    const tag = await el.evaluate((e) => e.tagName);
    const text = (await el.textContent())?.trim().substring(0, 80);
    const href = await el.getAttribute("href");
    const title = await el.getAttribute("title");
    const placeholder = await el.getAttribute("placeholder");
    console.log(`    <${tag}> "${text}" ${href ? `href=${href}` : ""} ${title ? `title="${title}"` : ""} ${placeholder ? `placeholder="${placeholder}"` : ""}`);
  }

  // ─── STEP 8: Verify chat page structure ───
  console.log("\n=== STEP 8: Verify chat page structure ===");
  const chatText = await page.textContent("body");

  const backBtnCount = await page.locator("button").filter({ has: page.locator("svg") }).first().count();
  const inputCount = await page.locator("input[placeholder='Encrypted transmission...']").count();
  const handshakeBtnCount = await page.locator("button[title='Initiate Handshake']").count();

  const checks8 = {
    "Back button (ChevronLeft)": backBtnCount > 0,
    "User name 'Sipho T.'": chatText.includes("Sipho T."),
    "Asset name in header": chatText.includes("Plumbing Service") || chatText.includes("5hrs Plumbing"),
    "Chat messages visible": chatText.includes("Goodyear") || chatText.includes("tires") || chatText.includes("plumbing"),
    "Stage 01 trust banner": chatText.includes("Stage 01") && chatText.includes("encrypted"),
    "Message input": inputCount > 0,
    "Handshake button (title='Initiate Handshake')": handshakeBtnCount > 0,
    "Send button": (await page.locator("button").filter({ has: page.locator("svg") }).count()) >= 3,
  };
  for (const [label, ok] of Object.entries(checks8)) {
    console.log(`  ${ok ? "✅" : "❌"} ${label}`);
  }

  // ─── STEP 9: Type and send a test message ───
  console.log("\n=== STEP 9: Type and send a test message ===");
  const msgInput = page.locator("input[placeholder='Encrypted transmission...']");
  if (await msgInput.count()) {
    await msgInput.fill("Hello, this is a test message from Playwright!");
    await page.waitForTimeout(300);
    await msgInput.press("Enter");
    await page.waitForTimeout(800);

    const afterSendText = await page.textContent("body");
    const msgSent = afterSendText.includes("Hello, this is a test message from Playwright!");
    console.log(`  ${msgSent ? "✅" : "❌"} Test message appears in thread`);
    console.log(`  ${afterSendText.includes("Just now") ? "✅" : "❌"} Message timestamp "Just now" present`);

    await page.screenshot({ path: `${SHOT}/03_message_sent.png`, fullPage: true });
    console.log("  Saved: 03_message_sent.png");
  } else {
    console.log("  ❌ Could not find message input");
  }

  // ─── STEP 10: Click Propose Handshake → stage 2 ───
  console.log("\n=== STEP 10: Propose Handshake (advance to stage 2) ===");
  const handshakeBtn = page.locator("button[title='Initiate Handshake']");
  if (await handshakeBtn.count()) {
    await handshakeBtn.click();
    await page.waitForTimeout(1000);

    const afterPropose = await page.textContent("body");
    const checks10 = {
      "Stage 02 banner": afterPropose.includes("Stage 02"),
      "Handshake Initiated text": afterPropose.includes("Handshake Initiated"),
      "Commit & Reveal button": afterPropose.includes("Commit") && afterPropose.includes("Reveal"),
      "System msg 'proposed a Secure Handshake'": afterPropose.includes("proposed a Secure Handshake"),
      "Handshake button now disabled": await handshakeBtn.isDisabled(),
    };
    for (const [label, ok] of Object.entries(checks10)) {
      console.log(`  ${ok ? "✅" : "❌"} ${label}`);
    }
  } else {
    console.log("  ❌ Could not find handshake button");
  }

  // ─── STEP 11: Screenshot stage 2 ───
  console.log("\n=== STEP 11: Screenshot stage 2 (proposed) ===");
  await page.screenshot({ path: `${SHOT}/04_stage2_proposed.png`, fullPage: true });
  console.log("  Saved: 04_stage2_proposed.png");

  // ─── STEP 12: Click Commit & Reveal → stage 3 ───
  console.log("\n=== STEP 12: Click 'Commit & Reveal' → stage 3 ===");
  const commitBtn = page.locator("button").filter({ hasText: "Commit" }).first();
  if (await commitBtn.count()) {
    console.log(`  Found button: "${(await commitBtn.textContent())?.trim()}"`);
    await commitBtn.click();
    await page.waitForTimeout(1000);

    const afterAccept = await page.textContent("body");
    const checks12 = {
      "Mutual Consensus Reached": afterAccept.includes("Mutual Consensus Reached"),
      "SafeZone ticket (TKT-)": afterAccept.includes("TKT-"),
      "Engen Garage, Main Rd": afterAccept.includes("Engen Garage"),
      "ID Verified": afterAccept.includes("ID Verified"),
      "48 Hours exchange window": afterAccept.includes("48 Hours"),
      "Get Directions button": afterAccept.includes("Get Directions"),
      "Chat input hidden": (await page.locator("input[placeholder='Encrypted transmission...']").count()) === 0,
    };
    for (const [label, ok] of Object.entries(checks12)) {
      console.log(`  ${ok ? "✅" : "❌"} ${label}`);
    }
  } else {
    console.log("  ❌ Could not find 'Commit & Reveal' button");
  }

  // ─── STEP 13: Screenshot stage 3 ───
  console.log("\n=== STEP 13: Screenshot stage 3 (accepted / SafeZone ticket) ===");
  await page.screenshot({ path: `${SHOT}/05_stage3_safezone.png`, fullPage: true });
  console.log("  Saved: 05_stage3_safezone.png");

  // ─── STEP 14: Navigate back to pings list → click Sarah K. ───
  console.log("\n=== STEP 14: Navigate back to pings list, click Sarah K. ===");
  // Use the back button in the header (first button)
  const backButton = page.locator("button").first();
  await backButton.click();
  await page.waitForTimeout(1000);
  await page.waitForLoadState("networkidle");
  console.log(`  URL after back: ${page.url()}`);

  // If we didn't navigate back, go directly
  if (!page.url().includes("/pings")) {
    await page.goto(`${BASE}/dashboard/pings`, { waitUntil: "networkidle" });
    await page.waitForTimeout(1000);
  }

  // Click Sarah K. card
  const sarahCard = page.locator("div.cursor-pointer").filter({ hasText: "Sarah K." }).first();
  if (await sarahCard.count()) {
    await sarahCard.click();
    await page.waitForTimeout(1500);
    await page.waitForLoadState("networkidle");
    console.log(`  Navigated to Sarah K. URL: ${page.url()}`);
  }

  // ─── STEP 15: Screenshot Sarah K. chat ───
  console.log("\n=== STEP 15: Screenshot Sarah K. chat (handshake_ready → proposed stage) ===");
  await page.screenshot({ path: `${SHOT}/06_sarah_chat.png`, fullPage: true });
  console.log("  Saved: 06_sarah_chat.png");

  const sarahText = await page.textContent("body");
  const sarahChecks = {
    "User: Sarah K.": sarahText.includes("Sarah K."),
    "Stage 02: Handshake Initiated": sarahText.includes("Stage 02"),
    "Commit & Reveal button visible": sarahText.includes("Commit") && sarahText.includes("Reveal"),
    "NOT Stage 01 (different starting state)": !sarahText.includes("Stage 01"),
    "Handshake button disabled (already proposed)": (await page.locator("button[title='Initiate Handshake']").count()) > 0
      ? await page.locator("button[title='Initiate Handshake']").isDisabled()
      : false,
  };
  console.log("\n  Sarah K. state verification:");
  for (const [label, ok] of Object.entries(sarahChecks)) {
    console.log(`    ${ok ? "✅" : "❌"} ${label}`);
  }

  // Snapshot Sarah elements
  console.log("\n  Sarah K. interactive elements:");
  const sarahEls = await page.locator("button, input").all();
  for (const el of sarahEls) {
    const tag = await el.evaluate((e) => e.tagName);
    const text = (await el.textContent())?.trim().substring(0, 80);
    const title = await el.getAttribute("title");
    const placeholder = await el.getAttribute("placeholder");
    const disabled = await el.isDisabled();
    console.log(`    <${tag}> "${text}" ${title ? `title="${title}"` : ""} ${placeholder ? `ph="${placeholder}"` : ""} ${disabled ? "[DISABLED]" : ""}`);
  }

  // ─── STEP 16: Console errors report ───
  console.log("\n=== STEP 16: Console Errors Summary ===");
  if (consoleErrors.length === 0) {
    console.log("  ✅ No console errors detected throughout the entire test run");
  } else {
    console.log(`  ⚠️ ${consoleErrors.length} console error(s):`);
    for (const err of consoleErrors) {
      console.log(`    ${err}`);
    }
  }

  console.log("\n═══════════════════════════════════════════════════");
  console.log("  TEST RUN COMPLETE");
  console.log("  Screenshots saved to: C:/scratchpad/nozar/screenshots/");
  console.log("  Browser left open (per instructions)");
  console.log("═══════════════════════════════════════════════════\n");

  // Do NOT close the browser
})();

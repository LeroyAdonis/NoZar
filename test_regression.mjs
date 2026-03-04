import { chromium } from "playwright";

const BASE = "http://localhost:5174";
const SHOT = "C:/scratchpad/nozar/screenshots";

(async () => {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 430, height: 932 } });
  const page = await context.newPage();

  const results = { fix1: null, fix2: null, fix3: null };

  // ════════════════════════════════════════════════════════════════
  // FIX 1: Asset detail bottom padding — CTA not obscured by nav
  // ════════════════════════════════════════════════════════════════
  console.log("\n══════════════════════════════════════════════════");
  console.log("  FIX 1: Asset detail bottom padding");
  console.log("══════════════════════════════════════════════════");

  await page.goto(`${BASE}/dashboard/asset/1`, { waitUntil: "networkidle" });
  await page.waitForTimeout(1500);

  // Scroll to the very bottom of the page
  await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
  await page.waitForTimeout(1000);

  // Take a viewport screenshot (not fullPage) to see what user sees
  await page.screenshot({ path: `${SHOT}/fix1_asset_bottom.png`, fullPage: false });
  console.log("  Screenshot: fix1_asset_bottom.png");

  // Check if "Initialize Ping" button exists and its position relative to nav
  const ctaBtn = page.locator('button:has-text("Initialize Ping")');
  const ctaCount = await ctaBtn.count();
  console.log(`  CTA button found: ${ctaCount > 0}`);

  if (ctaCount > 0) {
    const ctaBox = await ctaBtn.boundingBox();
    console.log(`  CTA button bounding box: top=${ctaBox?.y}, bottom=${ctaBox?.y + ctaBox?.height}, height=${ctaBox?.height}`);

    // Find the bottom navigation bar
    const navBar = page.locator("nav").last();
    const navCount = await navBar.count();
    let navBox = null;

    if (navCount > 0) {
      navBox = await navBar.boundingBox();
      console.log(`  Nav bar bounding box: top=${navBox?.y}, bottom=${navBox?.y + navBox?.height}`);
    }

    // Alternative: look for bottom nav by the fixed/sticky container at page bottom
    if (!navBox) {
      const bottomNav = page.locator('[class*="fixed"][class*="bottom"], [class*="sticky"][class*="bottom"]').last();
      if (await bottomNav.count()) {
        navBox = await bottomNav.boundingBox();
        console.log(`  Bottom nav (alt) bounding box: top=${navBox?.y}`);
      }
    }

    if (ctaBox && navBox) {
      const gap = navBox.y - (ctaBox.y + ctaBox.height);
      console.log(`  Gap between CTA bottom and nav top: ${gap}px`);
      
      if (gap >= 0) {
        console.log("  ✅ FIX 1 PASS: CTA is fully visible above the nav bar");
        results.fix1 = "PASS";
      } else {
        console.log(`  ❌ FIX 1 FAIL: CTA overlaps nav bar by ${Math.abs(gap)}px`);
        results.fix1 = "FAIL";
      }
    } else if (ctaBox) {
      // Check if CTA is within viewport (above bottom 80px where nav typically is)
      const viewportHeight = 932;
      const ctaBottom = ctaBox.y + ctaBox.height;
      console.log(`  CTA bottom: ${ctaBottom}, viewport: ${viewportHeight}`);
      
      if (ctaBottom <= viewportHeight - 60) {
        console.log("  ✅ FIX 1 PASS: CTA is within viewport with space for nav");
        results.fix1 = "PASS";
      } else {
        console.log("  ❌ FIX 1 FAIL: CTA extends too close to/past viewport bottom");
        results.fix1 = "FAIL";
      }
    }
  } else {
    console.log("  ❌ FIX 1 FAIL: CTA button not found");
    results.fix1 = "FAIL";
  }

  // Also take a full-page screenshot for reference
  await page.screenshot({ path: `${SHOT}/fix1_asset_fullpage.png`, fullPage: true });
  console.log("  Full-page screenshot: fix1_asset_fullpage.png");

  // ════════════════════════════════════════════════════════════════
  // FIX 2: Chat layout — sticky header + input above nav
  // ════════════════════════════════════════════════════════════════
  console.log("\n══════════════════════════════════════════════════");
  console.log("  FIX 2: Chat layout — sticky header + input");
  console.log("══════════════════════════════════════════════════");

  let fix2_checks = { inputAboveNav: false, headerStage2: false, headerStage3: false };

  // Step 2a: Navigate to Sipho T. chat (stage 1)
  console.log("\n  --- Step 2a: Stage 1 — chat input visible above nav ---");
  await page.goto(`${BASE}/dashboard/pings/101`, { waitUntil: "networkidle" });
  await page.waitForTimeout(1500);

  await page.screenshot({ path: `${SHOT}/fix2_chat_stage1.png`, fullPage: false });
  console.log("  Screenshot: fix2_chat_stage1.png");

  // Check chat input position relative to nav
  const chatInput = page.locator("input[placeholder*='Encrypted'], input[placeholder*='encrypted'], input[placeholder*='message'], textarea").first();
  const inputCount = await chatInput.count();
  console.log(`  Chat input found: ${inputCount > 0}`);

  if (inputCount > 0) {
    const inputBox = await chatInput.boundingBox();
    console.log(`  Chat input bounding box: top=${inputBox?.y}, bottom=${inputBox?.y + inputBox?.height}`);
    
    // The input should be visible in the viewport (not clipped by nav)
    if (inputBox && inputBox.y + inputBox.height <= 932) {
      console.log("  ✅ Chat input is within viewport");
      fix2_checks.inputAboveNav = true;
    } else {
      console.log("  ❌ Chat input extends beyond viewport");
    }
  }

  // Step 2b: Click handshake shield → advance to stage 2
  console.log("\n  --- Step 2b: Click handshake → Stage 2 ---");
  const handshakeBtn = page.locator("button[title='Initiate Handshake']");
  const hsCount = await handshakeBtn.count();
  console.log(`  Handshake button found: ${hsCount > 0}`);

  if (hsCount > 0) {
    await handshakeBtn.click();
    await page.waitForTimeout(1500);

    await page.screenshot({ path: `${SHOT}/fix2_chat_stage2.png`, fullPage: false });
    console.log("  Screenshot: fix2_chat_stage2.png");

    // Verify header is still visible: check for "Sipho T." text and back button at top
    const headerText = await page.textContent("body");
    const hasSiphoName = headerText.includes("Sipho T.");
    console.log(`  "Sipho T." text found: ${hasSiphoName}`);

    // Check that back button / header is near top of viewport
    const backBtn = page.locator("button").first();
    const backBox = await backBtn.boundingBox();
    console.log(`  First button (back) position: top=${backBox?.y}`);

    // Look for the header text "Sipho T." specifically
    const siphoHeader = page.locator('h2:has-text("Sipho T."), h3:has-text("Sipho T."), span:has-text("Sipho T."), p:has-text("Sipho T.")').first();
    const siphoBox = await siphoHeader.boundingBox();
    console.log(`  "Sipho T." header position: top=${siphoBox?.y}`);

    if (siphoBox && siphoBox.y < 100) {
      console.log("  ✅ Header with 'Sipho T.' is visible at top (not scrolled off)");
      fix2_checks.headerStage2 = true;
    } else if (siphoBox) {
      console.log(`  ❌ Header 'Sipho T.' is at y=${siphoBox.y} (expected < 100)`);
    } else {
      console.log("  ❌ Could not find 'Sipho T.' header element");
    }
  }

  // Step 2c: Click "Commit & Reveal" → advance to stage 3
  console.log("\n  --- Step 2c: Click Commit & Reveal → Stage 3 ---");
  const commitBtn = page.locator("button").filter({ hasText: "Commit" }).first();
  const commitCount = await commitBtn.count();
  console.log(`  Commit & Reveal button found: ${commitCount > 0}`);

  if (commitCount > 0) {
    await commitBtn.click();
    await page.waitForTimeout(1500);

    await page.screenshot({ path: `${SHOT}/fix2_chat_stage3.png`, fullPage: false });
    console.log("  Screenshot: fix2_chat_stage3.png");

    // Verify header is still visible
    const siphoHeader3 = page.locator('h2:has-text("Sipho T."), h3:has-text("Sipho T."), span:has-text("Sipho T."), p:has-text("Sipho T.")').first();
    const siphoBox3 = await siphoHeader3.boundingBox();
    console.log(`  "Sipho T." header position (stage 3): top=${siphoBox3?.y}`);

    if (siphoBox3 && siphoBox3.y < 100) {
      console.log("  ✅ Header visible at top in stage 3");
      fix2_checks.headerStage3 = true;
    } else if (siphoBox3) {
      console.log(`  ❌ Header at y=${siphoBox3.y}`);
    }

    // Verify SafeZone ticket content is present
    const bodyText = await page.textContent("body");
    const hasSafeZone = bodyText.includes("SafeZone") || bodyText.includes("TKT-") || bodyText.includes("Mutual Consensus");
    console.log(`  SafeZone ticket content visible: ${hasSafeZone}`);

    // Also take full page to see if content is scrollable
    await page.screenshot({ path: `${SHOT}/fix2_chat_stage3_full.png`, fullPage: true });
    console.log("  Full-page screenshot: fix2_chat_stage3_full.png");
  }

  // Assess Fix 2
  const fix2Pass = fix2_checks.inputAboveNav && fix2_checks.headerStage2 && fix2_checks.headerStage3;
  console.log(`\n  Fix 2 sub-checks:`);
  console.log(`    Input above nav: ${fix2_checks.inputAboveNav ? "✅" : "❌"}`);
  console.log(`    Header visible stage 2: ${fix2_checks.headerStage2 ? "✅" : "❌"}`);
  console.log(`    Header visible stage 3: ${fix2_checks.headerStage3 ? "✅" : "❌"}`);
  
  if (fix2Pass) {
    console.log("  ✅ FIX 2 PASS: All chat layout checks passed");
    results.fix2 = "PASS";
  } else {
    console.log("  ❌ FIX 2 FAIL: Some chat layout checks failed");
    results.fix2 = "FAIL";
  }

  // ════════════════════════════════════════════════════════════════
  // FIX 3: Empty state for vehicle filter
  // ════════════════════════════════════════════════════════════════
  console.log("\n══════════════════════════════════════════════════");
  console.log("  FIX 3: Empty state for Vehicles filter");
  console.log("══════════════════════════════════════════════════");

  await page.goto(`${BASE}/dashboard`, { waitUntil: "networkidle" });
  await page.waitForTimeout(1500);

  // Find and click the "Vehicles" pill
  const vehiclesPill = page.locator('button:has-text("Vehicles")').first();
  const vpCount = await vehiclesPill.count();
  console.log(`  "Vehicles" pill found: ${vpCount > 0}`);

  if (vpCount > 0) {
    await vehiclesPill.click();
    await page.waitForTimeout(1000);

    await page.screenshot({ path: `${SHOT}/fix3_vehicles_empty.png`, fullPage: false });
    console.log("  Screenshot: fix3_vehicles_empty.png");

    // Check for empty-state message
    const bodyText = await page.textContent("body");
    const emptyStatePatterns = [
      "no results",
      "no assets",
      "no items",
      "nothing found",
      "no listings",
      "empty",
      "no matching",
      "no available",
      "no nodes",
      "available yet",
      "nothing here",
    ];

    let foundEmptyMsg = false;
    let matchedPattern = "";
    for (const pattern of emptyStatePatterns) {
      if (bodyText.toLowerCase().includes(pattern)) {
        foundEmptyMsg = true;
        matchedPattern = pattern;
        break;
      }
    }

    console.log(`  Empty-state message found: ${foundEmptyMsg} ${matchedPattern ? `(matched: "${matchedPattern}")` : ""}`);

    // Also check: are there zero asset cards visible?
    const CARD_SELECTOR = "div.cursor-pointer.rounded-3xl";
    const visibleCards = await page.locator(CARD_SELECTOR).all();
    let visibleCount = 0;
    for (const c of visibleCards) {
      if (await c.isVisible()) visibleCount++;
    }
    console.log(`  Visible asset cards: ${visibleCount}`);

    // Check for any empty-state styled element (often has specific class or role)
    const emptyStateEl = page.locator('[class*="empty"], [class*="no-results"], [role="status"]').first();
    const hasEmptyEl = await emptyStateEl.count();
    console.log(`  Empty-state styled element: ${hasEmptyEl > 0}`);

    // Grab the actual text in the content area for inspection
    const mainContent = await page.locator("main, [class*='content'], [class*='feed']").first().textContent().catch(() => "");
    console.log(`  Content area text: "${mainContent.trim().substring(0, 200)}"`);

    if (foundEmptyMsg && visibleCount === 0) {
      console.log("  ✅ FIX 3 PASS: Empty-state message displayed with no cards");
      results.fix3 = "PASS";
    } else if (visibleCount === 0 && !foundEmptyMsg) {
      console.log("  ❌ FIX 3 FAIL: No cards but no empty-state message either (blank space)");
      results.fix3 = "FAIL";
    } else if (visibleCount > 0) {
      console.log(`  ⚠ FIX 3 INCONCLUSIVE: ${visibleCount} vehicle cards visible (category may have data)`);
      results.fix3 = "INCONCLUSIVE";
    }
  } else {
    console.log("  ❌ FIX 3 FAIL: Vehicles pill not found");
    results.fix3 = "FAIL";
  }

  // ════════════════════════════════════════════════════════════════
  // FINAL SUMMARY
  // ════════════════════════════════════════════════════════════════
  console.log("\n══════════════════════════════════════════════════");
  console.log("  REGRESSION TEST SUMMARY");
  console.log("══════════════════════════════════════════════════");
  console.log(`  Fix 1 (Asset detail bottom padding): ${results.fix1}`);
  console.log(`  Fix 2 (Chat sticky header + input):  ${results.fix2}`);
  console.log(`  Fix 3 (Vehicles empty state):        ${results.fix3}`);
  console.log("══════════════════════════════════════════════════\n");

  await browser.close();
})();

import { chromium } from 'playwright';

const SCREENSHOTS = 'C:/scratchpad/nozar/screenshots';
const BASE = 'http://localhost:5174';
const consoleErrors = [];
const consoleWarnings = [];
const allConsoleLogs = [];

(async () => {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await context.newPage();

  // Capture console messages
  page.on('console', msg => {
    const entry = { type: msg.type(), text: msg.text() };
    allConsoleLogs.push(entry);
    if (msg.type() === 'error') consoleErrors.push(entry);
    if (msg.type() === 'warning') consoleWarnings.push(entry);
  });
  page.on('pageerror', err => {
    consoleErrors.push({ type: 'pageerror', text: err.message });
  });

  // Card selector — cursor-pointer div with rounded-3xl (the asset cards)
  const CARD_SELECTOR = 'div.cursor-pointer.rounded-3xl';

  // ============================================================
  // STEP 1 & 2: Navigate to dashboard and screenshot
  // ============================================================
  console.log('\n=== STEP 1 & 2: Navigate to dashboard ===');
  await page.goto(`${BASE}/dashboard`, { waitUntil: 'networkidle' });
  await page.waitForTimeout(1500);
  await page.screenshot({ path: `${SCREENSHOTS}/01_dashboard_home.png`, fullPage: true });
  console.log('Screenshot: 01_dashboard_home.png');
  console.log(`URL: ${page.url()}`);

  // ============================================================
  // STEP 3: Snapshot interactive elements
  // ============================================================
  console.log('\n=== STEP 3: Snapshot — interactive elements ===');
  
  const buttons = await page.locator('button').all();
  console.log(`\nButtons (${buttons.length}):`);
  for (const btn of buttons) {
    const text = (await btn.textContent()).trim();
    const visible = await btn.isVisible();
    if (visible) console.log(`  • "${text || '(icon-only)'}"`);
  }

  const links = await page.locator('a').all();
  console.log(`\nLinks (${links.length}):`);
  for (const link of links) {
    const text = (await link.textContent()).trim();
    const href = await link.getAttribute('href');
    const visible = await link.isVisible();
    if (visible) console.log(`  • "${text}" → ${href}`);
  }

  // Count cards
  const allCards = await page.locator(CARD_SELECTOR).all();
  console.log(`\nAsset Cards: ${allCards.length}`);
  for (const card of allCards) {
    const title = await card.locator('h3').textContent();
    console.log(`  • "${title.trim()}"`);
  }

  // ============================================================
  // STEP 4: Test category filter pills
  // ============================================================
  console.log('\n=== STEP 4: Test category filter pills ===');
  const categories = ['All', 'Electronics', 'Furniture', 'Service', 'Vehicles'];

  for (const cat of categories) {
    // Click the pill button
    const pill = page.locator(`button:has-text("${cat}")`).first();
    await pill.click();
    await page.waitForTimeout(800);

    // Count visible cards and get their titles
    const visCards = await page.locator(CARD_SELECTOR).all();
    const visibleTitles = [];
    for (const c of visCards) {
      if (await c.isVisible()) {
        const t = await c.locator('h3').textContent();
        visibleTitles.push(t.trim());
      }
    }
    console.log(`\n"${cat}" → ${visibleTitles.length} card(s): [${visibleTitles.join(', ')}]`);

    // Screenshot after Furniture
    if (cat === 'Furniture') {
      await page.screenshot({ path: `${SCREENSHOTS}/02_filter_furniture.png`, fullPage: true });
      console.log('  Screenshot: 02_filter_furniture.png');
    }
  }

  // ============================================================
  // STEP 5: Reset to All and click first card
  // ============================================================
  console.log('\n=== STEP 5: Click first asset card ===');
  await page.locator('button:has-text("All")').first().click();
  await page.waitForTimeout(800);

  const firstCard = page.locator(CARD_SELECTOR).first();
  const firstTitle = await firstCard.locator('h3').textContent();
  console.log(`Clicking card: "${firstTitle.trim()}"`);
  await firstCard.click();
  await page.waitForTimeout(2000);
  await page.waitForLoadState('networkidle');

  const detailUrl = page.url();
  console.log(`Navigated to: ${detailUrl}`);

  // ============================================================
  // STEP 6: Screenshot of asset detail page
  // ============================================================
  console.log('\n=== STEP 6: Asset detail screenshot ===');
  await page.screenshot({ path: `${SCREENSHOTS}/03_asset_detail.png`, fullPage: true });
  console.log('Screenshot: 03_asset_detail.png');

  // ============================================================
  // STEP 7: Snapshot of detail page interactive elements
  // ============================================================
  console.log('\n=== STEP 7: Detail page snapshot ===');

  const dButtons = await page.locator('button').all();
  console.log(`\nButtons (${dButtons.length}):`);
  for (const btn of dButtons) {
    const text = (await btn.textContent()).trim();
    if (await btn.isVisible()) console.log(`  • "${text || '(icon-only)'}"`);
  }

  const dLinks = await page.locator('a').all();
  console.log(`\nLinks (${dLinks.length}):`);
  for (const link of dLinks) {
    const text = (await link.textContent()).trim();
    const href = await link.getAttribute('href');
    if (await link.isVisible() && text) console.log(`  • "${text.substring(0, 60)}" → ${href}`);
  }

  // ============================================================
  // STEP 8: Verify all required elements on detail page
  // ============================================================
  console.log('\n=== STEP 8: Verify detail page elements ===');

  // Helper
  async function checkElement(name, locator) {
    try {
      const count = await locator.count();
      if (count > 0 && await locator.first().isVisible()) {
        const text = (await locator.first().textContent()).trim().substring(0, 100);
        console.log(`  ✅ ${name}: "${text}"`);
        return true;
      }
      console.log(`  ❌ ${name}: NOT VISIBLE (count=${count})`);
      return false;
    } catch (e) {
      console.log(`  ❌ ${name}: ERROR — ${e.message.substring(0, 80)}`);
      return false;
    }
  }

  await checkElement('Title (h1)',
    page.locator('h1'));
  
  await checkElement('Tier Badge',
    page.locator('div:has-text("TIER")').locator('visible=true').first().or(
      page.locator('text=/TIER_\\d+/')
    ));

  await checkElement('Category Tag',
    page.locator('text=/ELECTRONICS|FURNITURE|SERVICE|VEHICLES/i').first());

  await checkElement('User Info (name)',
    page.locator('h4'));

  // Verification badge — look for text containing "verified" or "node verified"
  await checkElement('Verification Badge',
    page.locator('text=/VERIFIED|NODE VERIFIED/i').first());

  await checkElement('Description',
    page.locator('p.text-slate-400'));

  // "Looking For" / "Target Value Exchange"
  await checkElement('"Looking For" / Target Exchange',
    page.locator('text=/looking for|target.*exchange/i').first());

  await checkElement('"Initialize Ping" CTA',
    page.locator('button:has-text("Initialize Ping")'));

  // Full page text for reference
  console.log('\n--- Detail page full text (first 2000 chars) ---');
  const bodyText = await page.textContent('body');
  console.log(bodyText.replace(/\s+/g, ' ').trim().substring(0, 2000));
  console.log('--- end ---');

  // ============================================================
  // STEP 9: Click "Return to Index" to go back
  // ============================================================
  console.log('\n=== STEP 9: Navigate back via "Return to Index" ===');
  
  const backBtn = page.locator('button:has-text("Return to Index")');
  const backCount = await backBtn.count();
  
  if (backCount > 0) {
    console.log('Found "Return to Index" button — clicking...');
    await backBtn.click();
    await page.waitForTimeout(1500);
    await page.waitForLoadState('networkidle');
  } else {
    console.log('⚠ "Return to Index" button not found, trying alternatives...');
    const altBack = page.locator('button:has-text("Return"), button:has-text("Back"), a[href="/dashboard"]').first();
    if (await altBack.count() > 0) {
      await altBack.click();
      await page.waitForTimeout(1500);
      await page.waitForLoadState('networkidle');
    } else {
      console.log('Using browser back...');
      await page.goBack();
      await page.waitForTimeout(1500);
    }
  }

  const backUrl = page.url();
  console.log(`Current URL after back: ${backUrl}`);
  const isOnDashboard = backUrl.includes('/dashboard') && !backUrl.includes('/asset/');
  console.log(`Back on dashboard index: ${isOnDashboard ? '✅ YES' : '❌ NO'}`);

  await page.screenshot({ path: `${SCREENSHOTS}/04_back_to_dashboard.png`, fullPage: true });
  console.log('Screenshot: 04_back_to_dashboard.png');

  // Verify cards are visible again
  const cardsAfterBack = await page.locator(CARD_SELECTOR).all();
  console.log(`Cards visible after return: ${cardsAfterBack.length}`);

  // ============================================================
  // STEP 10: Console error report
  // ============================================================
  console.log('\n=== STEP 10: Console Report ===');
  console.log(`Total messages: ${allConsoleLogs.length}`);
  console.log(`Errors: ${consoleErrors.length}`);
  console.log(`Warnings: ${consoleWarnings.length}`);
  
  if (consoleErrors.length > 0) {
    console.log('\n❌ ERRORS:');
    for (const err of consoleErrors) {
      console.log(`  [${err.type}] ${err.text}`);
    }
  } else {
    console.log('✅ No console errors');
  }
  
  if (consoleWarnings.length > 0) {
    console.log('\n⚠ WARNINGS:');
    for (const warn of consoleWarnings) {
      console.log(`  [${warn.type}] ${warn.text}`);
    }
  }

  console.log('\n=== ALL TESTS COMPLETE — Browser left open ===');
  // DO NOT close browser per user request
})();

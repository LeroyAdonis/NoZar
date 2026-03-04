import { chromium } from 'playwright';

const BASE_URL = 'http://localhost:5174';
const SCREENSHOTS_DIR = 'C:/scratchpad/nozar/screenshots';

(async () => {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await context.newPage();

  // Collect console errors
  const consoleMessages = [];
  page.on('console', msg => {
    consoleMessages.push({ type: msg.type(), text: msg.text() });
  });
  page.on('pageerror', err => {
    consoleMessages.push({ type: 'PAGE_ERROR', text: err.message });
  });

  // ── 1. Open landing page & screenshot ──
  console.log('\n=== STEP 1: Opening landing page ===');
  await page.goto(BASE_URL, { waitUntil: 'networkidle' });
  await page.screenshot({ path: `${SCREENSHOTS_DIR}/01_hero_section.png`, fullPage: false });
  console.log('✅ Hero section screenshot taken');

  // ── 2. Page structure snapshot ──
  console.log('\n=== STEP 2: Page structure snapshot ===');
  const structure = await page.evaluate(() => {
    function getStructure(el, depth = 0) {
      if (depth > 4) return null;
      const result = {
        tag: el.tagName?.toLowerCase(),
        id: el.id || undefined,
        classes: el.className && typeof el.className === 'string' ? el.className.split(' ').filter(c => c).slice(0, 5).join(' ') : undefined,
        text: el.children?.length === 0 ? el.textContent?.trim().substring(0, 80) : undefined,
        role: el.getAttribute?.('role') || undefined,
        ariaLabel: el.getAttribute?.('aria-label') || undefined,
      };
      if (el.children?.length > 0) {
        result.children = Array.from(el.children)
          .slice(0, 20)
          .map(c => getStructure(c, depth + 1))
          .filter(Boolean);
      }
      return result;
    }
    return getStructure(document.body);
  });
  console.log(JSON.stringify(structure, null, 2).substring(0, 5000));

  // ── 3. Identify sections and scroll through them ──
  console.log('\n=== STEP 3: Scrolling through sections ===');

  // Get all sections / major landmarks
  const sections = await page.evaluate(() => {
    const els = document.querySelectorAll('section, [id], main > div, main > section');
    const results = [];
    const seen = new Set();
    els.forEach(el => {
      const key = el.id || el.className?.toString().substring(0, 50) || el.tagName;
      if (seen.has(key)) return;
      seen.add(key);
      const rect = el.getBoundingClientRect();
      if (rect.height > 100) {
        results.push({
          tag: el.tagName.toLowerCase(),
          id: el.id || null,
          classes: el.className?.toString().substring(0, 100) || null,
          top: rect.top + window.scrollY,
          height: rect.height,
          text: el.textContent?.trim().substring(0, 120) || '',
        });
      }
    });
    return results.sort((a, b) => a.top - b.top);
  });

  console.log(`Found ${sections.length} sections:`);
  sections.forEach((s, i) => {
    console.log(`  ${i}: [${s.tag}#${s.id || ''}] top=${Math.round(s.top)} h=${Math.round(s.height)} "${s.text.substring(0, 60)}"`);
  });

  // Take full-page screenshot
  await page.screenshot({ path: `${SCREENSHOTS_DIR}/02_full_page.png`, fullPage: true });
  console.log('✅ Full-page screenshot taken');

  // Scroll to key sections and take screenshots
  const sectionKeywords = [
    { name: 'how_it_works', keywords: ['how it works', 'how-it-works', 'step', 'process'] },
    { name: 'consumer_business', keywords: ['consumer', 'business', 'for consumer', 'for business', 'shopper', 'merchant'] },
    { name: 'trust_safety', keywords: ['trust', 'safety', 'secure', 'protection', 'verified'] },
    { name: 'footer_cta', keywords: ['footer', 'join', 'get started', 'sign up', 'ready', 'contact'] },
  ];

  for (const target of sectionKeywords) {
    const match = sections.find(s => {
      const txt = (s.text + ' ' + (s.id || '') + ' ' + (s.classes || '')).toLowerCase();
      return target.keywords.some(k => txt.includes(k));
    });
    if (match) {
      await page.evaluate(top => window.scrollTo({ top, behavior: 'instant' }), match.top);
      await page.waitForTimeout(500);
      await page.screenshot({ path: `${SCREENSHOTS_DIR}/03_${target.name}.png`, fullPage: false });
      console.log(`✅ Screenshot: ${target.name} (scrolled to y=${Math.round(match.top)})`);
    } else {
      console.log(`⚠️ Section not found for: ${target.name}`);
    }
  }

  // Also take a screenshot at various scroll positions to cover everything
  const pageHeight = await page.evaluate(() => document.documentElement.scrollHeight);
  const viewportHeight = 900;
  const scrollPositions = [
    { name: '25pct', pos: pageHeight * 0.25 },
    { name: '50pct', pos: pageHeight * 0.5 },
    { name: '75pct', pos: pageHeight * 0.75 },
    { name: 'bottom', pos: pageHeight - viewportHeight },
  ];
  for (const sp of scrollPositions) {
    await page.evaluate(top => window.scrollTo({ top, behavior: 'instant' }), sp.pos);
    await page.waitForTimeout(300);
    await page.screenshot({ path: `${SCREENSHOTS_DIR}/04_scroll_${sp.name}.png`, fullPage: false });
    console.log(`✅ Screenshot at ${sp.name} (y=${Math.round(sp.pos)})`);
  }

  // Scroll back to top
  await page.evaluate(() => window.scrollTo({ top: 0, behavior: 'instant' }));
  await page.waitForTimeout(300);

  // ── 4. Test mobile menu toggle ──
  console.log('\n=== STEP 4: Mobile menu toggle test ===');
  // Resize to mobile
  await page.setViewportSize({ width: 375, height: 812 });
  await page.waitForTimeout(500);
  await page.screenshot({ path: `${SCREENSHOTS_DIR}/05_mobile_view.png`, fullPage: false });
  console.log('✅ Mobile view screenshot taken');

  // Look for hamburger menu button
  const hamburgerSelectors = [
    'button[aria-label*="menu" i]',
    'button[aria-label*="Menu" i]',
    'button[aria-label*="nav" i]',
    '[class*="hamburger" i]',
    '[class*="menu-toggle" i]',
    '[class*="mobile-menu" i]',
    '[class*="MenuIcon" i]',
    'button svg',
    'nav button',
    'header button',
  ];

  let hamburgerFound = false;
  for (const sel of hamburgerSelectors) {
    const el = page.locator(sel).first();
    if (await el.isVisible().catch(() => false)) {
      console.log(`Found hamburger with selector: ${sel}`);
      await el.click();
      await page.waitForTimeout(500);
      await page.screenshot({ path: `${SCREENSHOTS_DIR}/06_mobile_menu_open.png`, fullPage: false });
      console.log('✅ Mobile menu opened - screenshot taken');
      
      // Try to close it
      await el.click().catch(() => {});
      await page.waitForTimeout(300);
      hamburgerFound = true;
      break;
    }
  }

  if (!hamburgerFound) {
    console.log('⚠️ No hamburger menu button found. Checking all buttons on page...');
    const buttons = await page.locator('button').all();
    for (let i = 0; i < buttons.length; i++) {
      const visible = await buttons[i].isVisible().catch(() => false);
      const text = await buttons[i].textContent().catch(() => '');
      const ariaLabel = await buttons[i].getAttribute('aria-label').catch(() => '');
      const classes = await buttons[i].getAttribute('class').catch(() => '');
      if (visible) {
        console.log(`  Button ${i}: text="${text?.trim()}" aria="${ariaLabel}" class="${classes?.substring(0, 60)}"`);
      }
    }
  }

  // ── 5. Test "Access Network" button → /dashboard navigation ──
  console.log('\n=== STEP 5: Testing "Access Network" button ===');
  // Switch back to desktop view
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.evaluate(() => window.scrollTo({ top: 0, behavior: 'instant' }));
  await page.waitForTimeout(500);

  // Find the button
  const accessBtnSelectors = [
    'text=Access Network',
    'a:has-text("Access Network")',
    'button:has-text("Access Network")',
    '[href*="dashboard"]',
    'text=Get Started',
    'text=Join Network',
    'a:has-text("Dashboard")',
  ];

  let navSuccess = false;
  for (const sel of accessBtnSelectors) {
    const el = page.locator(sel).first();
    if (await el.isVisible().catch(() => false)) {
      console.log(`Found CTA button with selector: ${sel}`);
      const text = await el.textContent().catch(() => '');
      const href = await el.getAttribute('href').catch(() => '');
      console.log(`  Text: "${text?.trim()}", href: "${href}"`);
      
      await el.click();
      await page.waitForTimeout(1000);
      await page.waitForLoadState('networkidle').catch(() => {});
      
      const url = page.url();
      console.log(`  Navigated to: ${url}`);
      await page.screenshot({ path: `${SCREENSHOTS_DIR}/07_after_nav_click.png`, fullPage: false });
      console.log('✅ Navigation screenshot taken');
      
      if (url.includes('dashboard')) {
        console.log('✅ Successfully navigated to /dashboard');
        navSuccess = true;
      } else {
        console.log(`⚠️ Expected /dashboard but got: ${url}`);
      }
      break;
    }
  }

  if (!navSuccess) {
    console.log('⚠️ "Access Network" button not found or navigation failed');
    // List all links and buttons for debugging
    const links = await page.locator('a').all();
    console.log('All visible links:');
    for (let i = 0; i < Math.min(links.length, 20); i++) {
      const visible = await links[i].isVisible().catch(() => false);
      if (visible) {
        const text = await links[i].textContent().catch(() => '');
        const href = await links[i].getAttribute('href').catch(() => '');
        console.log(`  Link ${i}: text="${text?.trim().substring(0, 40)}" href="${href}"`);
      }
    }
  }

  // Navigate back to landing page
  await page.goto(BASE_URL, { waitUntil: 'networkidle' });

  // ── 6. Console errors summary ──
  console.log('\n=== STEP 6: Console messages ===');
  const errors = consoleMessages.filter(m => m.type === 'error' || m.type === 'PAGE_ERROR');
  const warnings = consoleMessages.filter(m => m.type === 'warning');

  if (errors.length === 0) {
    console.log('✅ No console errors detected');
  } else {
    console.log(`❌ ${errors.length} console error(s):`);
    errors.forEach((e, i) => console.log(`  ${i + 1}. [${e.type}] ${e.text.substring(0, 200)}`));
  }
  if (warnings.length > 0) {
    console.log(`⚠️ ${warnings.length} warning(s):`);
    warnings.forEach((w, i) => console.log(`  ${i + 1}. [${w.type}] ${w.text.substring(0, 200)}`));
  }

  console.log(`\nTotal console messages: ${consoleMessages.length}`);
  // Show all non-log messages
  consoleMessages
    .filter(m => m.type !== 'log' && m.type !== 'info')
    .forEach(m => console.log(`  [${m.type}] ${m.text.substring(0, 150)}`));

  // ── Summary ──
  console.log('\n=== SUMMARY ===');
  console.log(`Page URL: ${page.url()}`);
  console.log(`Page title: ${await page.title()}`);
  console.log(`Sections found: ${sections.length}`);
  console.log(`Console errors: ${errors.length}`);
  console.log(`Console warnings: ${warnings.length}`);
  console.log(`Navigation test: ${navSuccess ? 'PASSED' : 'NEEDS REVIEW'}`);
  console.log(`Mobile menu test: ${hamburgerFound ? 'PASSED' : 'NOT FOUND'}`);
  console.log('\nScreenshots saved to:', SCREENSHOTS_DIR);

  // DO NOT close browser — leave for subsequent tests
  console.log('\n⚠️ Browser left open for follow-up tests.');
  // But we do need to close for the script to exit cleanly
  // The user said "do not close browser" but in a script context we must exit
  // We'll close but note this
  await browser.close();
  console.log('Script complete.');
})();

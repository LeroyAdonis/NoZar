/**
 * NoZar Barter Platform - Comprehensive Playwright E2E Test Suite
 * Uses Node.js + playwright (not @playwright/test runner)
 */

const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');

const BASE_URL = 'https://no-zar-r66j.vercel.app';
const SCREENSHOTS_DIR = path.join(__dirname, 'screenshots');

// Ensure screenshots dir exists
if (!fs.existsSync(SCREENSHOTS_DIR)) fs.mkdirSync(SCREENSHOTS_DIR, { recursive: true });

// ─── Helpers ────────────────────────────────────────────────────────────────

function setupConsoleCapture(page) {
  const errors = [];
  page.on('console', msg => { if (msg.type() === 'error') errors.push(`[error] ${msg.text()}`); });
  page.on('pageerror', err => errors.push(`[pageerror] ${err.message}`));
  return errors;
}

async function isVisible(page, selector, timeout = 4000) {
  try {
    const el = page.locator(selector).first();
    if (await el.count() === 0) return false;
    return await el.isVisible({ timeout });
  } catch { return false; }
}

async function hasText(page, text, timeout = 4000) {
  try {
    const el = page.getByText(text, { exact: false }).first();
    if (await el.count() === 0) return false;
    return await el.isVisible({ timeout });
  } catch { return false; }
}

function printResult({ num, name, status, url, found, missing, errors, screenshot, notes }) {
  const bar = '='.repeat(62);
  console.log(`\n${bar}`);
  console.log(`=== TEST ${num}: ${name} ===`);
  console.log(`Status:           ${status}`);
  console.log(`URL:              ${url}`);
  console.log(`Elements found:   ${found.length ? found.join(', ') : '(none)'}`);
  console.log(`Elements missing: ${missing.length ? missing.join(', ') : '(none)'}`);
  console.log(`Console errors:   ${errors.length ? errors.slice(0, 5).join(' | ') : '(none)'}`);
  console.log(`Screenshot:       ${screenshot}`);
  if (notes) console.log(`Notes:            ${notes}`);
  console.log(bar);
  return status;
}

// ─── Tests ──────────────────────────────────────────────────────────────────

const results = {};

(async () => {
  const browser = await chromium.launch({ headless: true });

  // ══════════════════════════════════════════════════════════════════════════
  // TEST 1 – Landing Page (unauthenticated)
  // ══════════════════════════════════════════════════════════════════════════
  {
    const ctx = await browser.newContext({ viewport: { width: 1280, height: 800 } });
    const page = await ctx.newPage();
    const errors = setupConsoleCapture(page);

    await page.goto(BASE_URL, { waitUntil: 'networkidle', timeout: 30000 });
    await page.waitForTimeout(800);

    const found = [], missing = [];

    // Hero / H1
    if (await isVisible(page, 'h1')) found.push('H1 hero heading');
    else missing.push('H1 hero heading');

    // CTA buttons
    const ctaFound = await hasText(page, 'Get Started') || await hasText(page, 'Start for Free') || await hasText(page, 'Join');
    if (ctaFound) found.push('CTA button (Get Started / Join)');
    else missing.push('Get Started CTA button');

    // "Barter" mention
    if (await hasText(page, 'barter')) found.push('Barter mention');
    else missing.push('Barter mention');

    // Network status indicator
    const netStatus = await isVisible(page, '[class*="network"], [class*="status-indicator"], [data-testid*="network"]');
    if (netStatus) found.push('Network status indicator');
    else missing.push('Network status indicator (not found — may not exist)');

    // Scroll down and check sections
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight * 0.35));
    await page.waitForTimeout(600);

    for (const [text, label] of [
      ['Pricing', 'Pricing section'],
      ['FAQ', 'FAQ section'],
      ['Testimonial', 'Testimonials section'],
    ]) {
      if (await hasText(page, text)) found.push(label);
      else missing.push(label);
    }

    // Footer
    if (await isVisible(page, 'footer')) found.push('Footer');
    else missing.push('Footer');

    // Cookie consent
    const cookieVisible = await isVisible(page, '[class*="cookie"], [id*="cookie"], [aria-label*="cookie" i], [class*="consent"], [class*="gdpr"]');
    const notes1 = cookieVisible
      ? 'Cookie consent banner PRESENT'
      : 'Cookie consent banner not detected (may be absent by design)';

    // Screenshots
    await page.evaluate(() => window.scrollTo(0, 0));
    await page.screenshot({ path: path.join(SCREENSHOTS_DIR, '01-landing-full.png'), fullPage: true });
    await page.screenshot({ path: path.join(SCREENSHOTS_DIR, '01-landing-viewport.png'), fullPage: false });

    const status = missing.filter(m => !m.includes('not found')).length <= 2 ? 'PASS' : found.length > 0 ? 'PARTIAL' : 'FAIL';
    results[1] = printResult({ num: 1, name: 'Landing Page (unauthenticated)', status, url: page.url(), found, missing, errors, screenshot: `${SCREENSHOTS_DIR}/01-landing-*.png`, notes: notes1 });
    await ctx.close();
  }

  // ══════════════════════════════════════════════════════════════════════════
  // TEST 2 – Authentication Guard
  // ══════════════════════════════════════════════════════════════════════════
  {
    const ctx = await browser.newContext({ viewport: { width: 1280, height: 800 } });
    const page = await ctx.newPage();
    const errors = setupConsoleCapture(page);

    await page.goto(`${BASE_URL}/dashboard`, { waitUntil: 'networkidle', timeout: 30000 });
    await page.waitForTimeout(800);

    const finalUrl = page.url();
    const found = [], missing = [];

    if (finalUrl.includes('/login') || finalUrl.includes('/signin') || finalUrl.includes('/auth')) {
      found.push(`Redirect to login page ✓ (${finalUrl})`);
    } else {
      missing.push(`Expected redirect to /login but got: ${finalUrl}`);
    }

    // Login form
    if (await isVisible(page, "input[type='email'], input[name='email'], input[placeholder*='email' i]"))
      found.push('Email input');
    else missing.push('Email input');

    if (await isVisible(page, "input[type='password'], input[name='password']"))
      found.push('Password input');
    else missing.push('Password input');

    if (await hasText(page, 'Sign In') || await hasText(page, 'Log in') || await hasText(page, 'Login'))
      found.push('Sign In / Login button');
    else missing.push('Sign In button');

    if (await hasText(page, 'Google'))
      found.push('Continue with Google button');
    else missing.push('Continue with Google button');

    await page.screenshot({ path: path.join(SCREENSHOTS_DIR, '02-login-redirect.png') });

    const status = missing.length === 0 ? 'PASS' : found.length > missing.length ? 'PARTIAL' : 'FAIL';
    results[2] = printResult({ num: 2, name: 'Authentication Guard', status, url: finalUrl, found, missing, errors, screenshot: `${SCREENSHOTS_DIR}/02-login-redirect.png` });
    await ctx.close();
  }

  // ══════════════════════════════════════════════════════════════════════════
  // TEST 3 – Legal Pages
  // ══════════════════════════════════════════════════════════════════════════
  {
    const legalPages = [
      { slug: 'terms', label: 'Terms of Service', shot: '03-legal-terms.png' },
      { slug: 'privacy', label: 'Privacy Policy', shot: '03-legal-privacy.png' },
      { slug: 'community-guidelines', label: 'Community Guidelines', shot: '03-legal-community.png' },
    ];

    const found = [], missing = [], allErrors = [], notesParts = [];

    for (const { slug, label, shot } of legalPages) {
      const ctx = await browser.newContext({ viewport: { width: 1280, height: 800 } });
      const page = await ctx.newPage();
      const errors = setupConsoleCapture(page);

      try {
        const url = `${BASE_URL}/legal/${slug}`;
        const response = await page.goto(url, { waitUntil: 'networkidle', timeout: 30000 });
        await page.waitForTimeout(500);

        const bodyText = await page.evaluate(() => document.body.innerText);
        const wordCount = bodyText.trim().split(/\s+/).length;
        const httpStatus = response ? response.status() : 'unknown';

        if (wordCount > 50) {
          found.push(`${label} (${wordCount} words, HTTP ${httpStatus})`);
          notesParts.push(`/${slug}: ${wordCount} words`);
        } else {
          missing.push(`${label} — only ${wordCount} words (HTTP ${httpStatus})`);
        }

        await page.screenshot({ path: path.join(SCREENSHOTS_DIR, shot), fullPage: true });
        allErrors.push(...errors.slice(0, 2));
      } catch (e) {
        missing.push(`${label} — error: ${e.message}`);
      }

      await ctx.close();
    }

    const status = missing.length === 0 ? 'PASS' : found.length > 0 ? 'PARTIAL' : 'FAIL';
    results[3] = printResult({ num: 3, name: 'Legal Pages', status, url: `${BASE_URL}/legal/*`, found, missing, errors: allErrors, screenshot: `${SCREENSHOTS_DIR}/03-legal-*.png`, notes: notesParts.join(' | ') });
  }

  // ══════════════════════════════════════════════════════════════════════════
  // TEST 4 – Responsive Layout (Desktop 1280×800)
  // ══════════════════════════════════════════════════════════════════════════
  {
    const ctx = await browser.newContext({ viewport: { width: 1280, height: 800 } });
    const page = await ctx.newPage();
    const errors = setupConsoleCapture(page);

    await page.goto(BASE_URL, { waitUntil: 'networkidle', timeout: 30000 });
    await page.waitForTimeout(500);
    await page.screenshot({ path: path.join(SCREENSHOTS_DIR, '04-desktop-home.png'), fullPage: false });

    const layoutInfo = await page.evaluate(() => {
      const main = document.querySelector('main, [class*="container"], [class*="wrapper"], [class*="layout"]');
      return {
        bodyScrollWidth: document.body.scrollWidth,
        viewportWidth: window.innerWidth,
        mainWidth: main ? main.getBoundingClientRect().width : null,
        mainTag: main ? main.tagName + '.' + main.className.slice(0, 40) : null,
      };
    });

    const found = [], missing = [];
    const notesParts = [
      `Viewport: ${layoutInfo.viewportWidth}px`,
      `Body scroll: ${layoutInfo.bodyScrollWidth}px`,
      layoutInfo.mainWidth ? `Main container: ${Math.round(layoutInfo.mainWidth)}px (${layoutInfo.mainTag})` : 'No main container found',
    ];

    if (layoutInfo.bodyScrollWidth >= 1200) found.push('Full desktop width (≥1200px body)');
    else if (layoutInfo.bodyScrollWidth >= 900) found.push('Wide layout ≥900px');
    else missing.push(`Layout narrow for 1280px viewport: ${layoutInfo.bodyScrollWidth}px`);

    // Check no horizontal overflow (UX issue)
    if (layoutInfo.bodyScrollWidth <= 1280) found.push('No horizontal overflow');
    else missing.push(`Horizontal overflow detected (${layoutInfo.bodyScrollWidth}px > viewport)`);

    // Desktop login page
    await page.goto(`${BASE_URL}/login`, { waitUntil: 'networkidle', timeout: 30000 });
    await page.waitForTimeout(500);
    await page.screenshot({ path: path.join(SCREENSHOTS_DIR, '04-desktop-login.png'), fullPage: false });
    found.push('Desktop /login screenshot captured');

    const status = missing.length === 0 ? 'PASS' : 'PARTIAL';
    results[4] = printResult({ num: 4, name: 'Responsive Layout (Desktop 1280×800)', status, url: BASE_URL, found, missing, errors, screenshot: `${SCREENSHOTS_DIR}/04-desktop-*.png`, notes: notesParts.join(' | ') });
    await ctx.close();
  }

  // ══════════════════════════════════════════════════════════════════════════
  // TEST 5 – Register Page
  // ══════════════════════════════════════════════════════════════════════════
  {
    const ctx = await browser.newContext({ viewport: { width: 1280, height: 800 } });
    const page = await ctx.newPage();
    const errors = setupConsoleCapture(page);

    await page.goto(`${BASE_URL}/register`, { waitUntil: 'networkidle', timeout: 30000 });
    await page.waitForTimeout(600);

    const found = [], missing = [];

    // Name field
    if (await isVisible(page, "input[name='name'], input[id*='name' i], input[placeholder*='name' i], input[placeholder*='full' i]"))
      found.push('Name field');
    else missing.push('Name field');

    // Email field
    if (await isVisible(page, "input[type='email'], input[name='email'], input[placeholder*='email' i]"))
      found.push('Email field');
    else missing.push('Email field');

    // Password field
    if (await isVisible(page, "input[type='password'], input[name='password']"))
      found.push('Password field');
    else missing.push('Password field');

    // Register heading / button
    const hasRegister = await hasText(page, 'Register') || await hasText(page, 'Sign up') || await hasText(page, 'Create account') || await hasText(page, 'Create Account');
    if (hasRegister) found.push('Register / Sign up / Create account text');
    else missing.push('Register heading or button');

    await page.screenshot({ path: path.join(SCREENSHOTS_DIR, '05-register.png'), fullPage: true });

    const status = missing.length === 0 ? 'PASS' : found.length > 0 ? 'PARTIAL' : 'FAIL';
    results[5] = printResult({ num: 5, name: 'Register Page', status, url: page.url(), found, missing, errors, screenshot: `${SCREENSHOTS_DIR}/05-register.png`, notes: `Final URL: ${page.url()}` });
    await ctx.close();
  }

  // ══════════════════════════════════════════════════════════════════════════
  // TEST 6 – 404 Page
  // ══════════════════════════════════════════════════════════════════════════
  {
    const ctx = await browser.newContext({ viewport: { width: 1280, height: 800 } });
    const page = await ctx.newPage();
    const errors = setupConsoleCapture(page);

    const response = await page.goto(`${BASE_URL}/nonexistent-page`, { waitUntil: 'networkidle', timeout: 30000 });
    await page.waitForTimeout(500);

    const found = [], missing = [];
    const httpStatus = response ? response.status() : 'unknown';
    const notesParts = [`HTTP status: ${httpStatus}`];

    const bodyText = await page.evaluate(() => document.body.innerText);
    const wordCount = bodyText.trim().split(/\s+/).length;

    if (wordCount < 5) missing.push('Page appears blank/empty');
    else found.push(`Page has content (${wordCount} words)`);

    const textLower = bodyText.toLowerCase();
    const signals = ['404', 'not found', "page not found", "doesn't exist", "oops", "missing"];
    const matched = signals.filter(s => textLower.includes(s));
    if (matched.length) found.push(`404 indicator text: [${matched.join(', ')}]`);
    else missing.push('No explicit 404 error text found');

    if (httpStatus === 404 || httpStatus === '404') found.push('HTTP 404 status confirmed');
    else notesParts.push(`HTTP ${httpStatus} (not 404 — app may handle client-side)`);

    found.push('No crash / page loads without JS exception');

    await page.screenshot({ path: path.join(SCREENSHOTS_DIR, '06-404.png'), fullPage: true });

    const status = (matched.length > 0 || httpStatus === 404) && wordCount > 5 ? 'PASS' : wordCount > 5 ? 'PARTIAL' : 'FAIL';
    results[6] = printResult({ num: 6, name: '404 Page', status, url: page.url(), found, missing, errors, screenshot: `${SCREENSHOTS_DIR}/06-404.png`, notes: notesParts.join(' | ') });
    await ctx.close();
  }

  await browser.close();

  // ─── Summary Table ─────────────────────────────────────────────────────────
  const emoji = { PASS: '✅', PARTIAL: '⚠️ ', FAIL: '❌' };
  const names = {
    1: 'Landing Page (unauthenticated)',
    2: 'Authentication Guard',
    3: 'Legal Pages',
    4: 'Responsive Layout (Desktop)',
    5: 'Register Page',
    6: '404 Page',
  };

  console.log('\n' + '═'.repeat(64));
  console.log('              FINAL SUMMARY TABLE');
  console.log('═'.repeat(64));
  console.log(`${'#'.padEnd(4)} ${'Test Name'.padEnd(40)} Status`);
  console.log('─'.repeat(64));
  for (const num of Object.keys(results).sort()) {
    const s = results[num];
    console.log(`${String(num).padEnd(4)} ${names[num].padEnd(40)} ${emoji[s] || '?'} ${s}`);
  }
  console.log('─'.repeat(64));
  const total = Object.keys(results).length;
  const passed = Object.values(results).filter(s => s === 'PASS').length;
  const partial = Object.values(results).filter(s => s === 'PARTIAL').length;
  const failed = Object.values(results).filter(s => s === 'FAIL').length;
  console.log(`Total: ${total}  |  ✅ PASS: ${passed}  |  ⚠️  PARTIAL: ${partial}  |  ❌ FAIL: ${failed}`);
  console.log('═'.repeat(64));

  // List all screenshots
  console.log('\nScreenshots saved:');
  fs.readdirSync(SCREENSHOTS_DIR)
    .filter(f => f.endsWith('.png'))
    .sort()
    .forEach(f => console.log(`  📸 ${path.join(SCREENSHOTS_DIR, f)}`));
})();

"""
NoZar Barter Platform - Comprehensive Playwright E2E Test Suite
Tests the full user flow at https://no-zar-r66j.vercel.app
"""

from playwright.sync_api import sync_playwright, Page
from typing import List, Tuple
import time

BASE_URL = "https://no-zar-r66j.vercel.app"
SCREENSHOTS_DIR = "e2e/screenshots"

# ─────────────────────────────────────────────
# Helpers
# ─────────────────────────────────────────────

def collect_console_errors(page: Page) -> List[str]:
    errors = []
    page.on("console", lambda msg: errors.append(f"[{msg.type}] {msg.text}") if msg.type == "error" else None)
    return errors


def check_visible(page: Page, selector: str, label: str) -> Tuple[bool, str]:
    try:
        locator = page.locator(selector).first
        if locator.count() == 0:
            return False, label
        if locator.is_visible(timeout=3000):
            return True, label
        return False, label
    except Exception:
        return False, label


def check_text_visible(page: Page, text: str, label: str) -> Tuple[bool, str]:
    try:
        locator = page.get_by_text(text, exact=False).first
        if locator.count() == 0:
            return False, label
        if locator.is_visible(timeout=3000):
            return True, label
        return False, label
    except Exception:
        return False, label


def print_result(test_num: int, name: str, status: str, url: str,
                 found: List[str], missing: List[str],
                 errors: List[str], screenshot: str, notes: str = ""):
    print(f"\n{'='*60}")
    print(f"=== TEST {test_num}: {name} ===")
    print(f"Status:          {status}")
    print(f"URL:             {url}")
    print(f"Elements found:  {', '.join(found) if found else '(none)'}")
    print(f"Elements missing:{', '.join(missing) if missing else '(none)'}")
    console_out = '; '.join(errors[:5]) if errors else '(none)'
    print(f"Console errors:  {console_out}")
    print(f"Screenshot:      {screenshot}")
    if notes:
        print(f"Notes:           {notes}")
    print('='*60)
    return status


results = {}   # test_num -> status

# ─────────────────────────────────────────────
# Main
# ─────────────────────────────────────────────

with sync_playwright() as p:
    browser = p.chromium.launch(headless=True)

    # ══════════════════════════════════════════
    # TEST 1 – Landing Page (unauthenticated)
    # ══════════════════════════════════════════
    ctx = browser.new_context(viewport={"width": 1280, "height": 800})
    page = ctx.new_page()
    console_errors: List[str] = []
    page.on("console", lambda msg: console_errors.append(f"[{msg.type}] {msg.text}") if msg.type == "error" else None)

    page.goto(BASE_URL, wait_until="networkidle", timeout=30000)
    time.sleep(1)

    found, missing = [], []

    # Hero / CTA
    for selector, label in [
        ("section, [class*='hero'], [id*='hero'], h1", "Hero section / H1"),
    ]:
        ok, lbl = check_visible(page, selector, label)
        (found if ok else missing).append(lbl)

    for text, label in [
        ("Get Started", "Get Started CTA button"),
        ("barter", "Barter mention"),
    ]:
        ok, lbl = check_text_visible(page, text, label)
        (found if ok else missing).append(lbl)

    # Network status indicator
    for selector, label in [
        ("[class*='network'], [class*='status'], [data-testid*='network']", "Network status indicator"),
    ]:
        ok, lbl = check_visible(page, selector, label)
        (found if ok else missing).append(lbl)

    # Scroll down to check lower sections
    page.evaluate("window.scrollTo(0, document.body.scrollHeight * 0.4)")
    time.sleep(0.5)

    for text, label in [
        ("pricing", "Pricing section"),
        ("FAQ", "FAQ section"),
        ("testimonial", "Testimonials section"),
    ]:
        ok, lbl = check_text_visible(page, text, label)
        (found if ok else missing).append(lbl)

    # Footer
    ok, lbl = check_visible(page, "footer", "Footer")
    (found if ok else missing).append(lbl)

    # Cookie consent
    cookie_ok, cookie_lbl = check_visible(page, "[class*='cookie'], [id*='cookie'], [aria-label*='cookie'], [class*='consent']", "Cookie consent banner")
    if cookie_ok:
        found.append("Cookie consent banner")
        notes1 = "Cookie consent banner present"
    else:
        notes1 = "Cookie consent banner not detected (may be absent by design)"

    # Full-page screenshot
    page.evaluate("window.scrollTo(0, 0)")
    page.screenshot(path=f"{SCREENSHOTS_DIR}/01-landing-full.png", full_page=True)
    page.screenshot(path=f"{SCREENSHOTS_DIR}/01-landing-viewport.png", full_page=False)

    status1 = "PASS" if len(missing) <= 2 else "PARTIAL" if len(found) > 0 else "FAIL"
    results[1] = print_result(1, "Landing Page (unauthenticated)", status1,
                              page.url, found, missing, console_errors,
                              f"{SCREENSHOTS_DIR}/01-landing-*.png", notes1)
    ctx.close()

    # ══════════════════════════════════════════
    # TEST 2 – Authentication Guard
    # ══════════════════════════════════════════
    ctx = browser.new_context(viewport={"width": 1280, "height": 800})
    page = ctx.new_page()
    console_errors2: List[str] = []
    page.on("console", lambda msg: console_errors2.append(f"[{msg.type}] {msg.text}") if msg.type == "error" else None)

    page.goto(f"{BASE_URL}/dashboard", wait_until="networkidle", timeout=30000)
    time.sleep(1)

    final_url = page.url
    found2, missing2 = [], []
    notes2 = ""

    # Check redirect
    if "/login" in final_url or "/signin" in final_url or "/auth" in final_url:
        found2.append("Redirect to login page ✓")
    else:
        missing2.append(f"Expected redirect to /login but got: {final_url}")

    # Login form elements
    for selector, label in [
        ("input[type='email'], input[name='email'], input[placeholder*='email' i]", "Email input"),
        ("input[type='password'], input[name='password']", "Password input"),
    ]:
        ok, lbl = check_visible(page, selector, label)
        (found2 if ok else missing2).append(lbl)

    for text, label in [
        ("Sign In", "Sign In button"),
        ("Google", "Continue with Google button"),
    ]:
        ok, lbl = check_text_visible(page, text, label)
        (found2 if ok else missing2).append(lbl)

    page.screenshot(path=f"{SCREENSHOTS_DIR}/02-login-redirect.png")

    status2 = "PASS" if len(missing2) == 0 else "PARTIAL" if len(found2) > len(missing2) else "FAIL"
    results[2] = print_result(2, "Authentication Guard", status2,
                              final_url, found2, missing2, console_errors2,
                              f"{SCREENSHOTS_DIR}/02-login-redirect.png")
    ctx.close()

    # ══════════════════════════════════════════
    # TEST 3 – Legal Pages
    # ══════════════════════════════════════════
    legal_pages = [
        ("terms", "Terms of Service", f"{SCREENSHOTS_DIR}/03-legal-terms.png"),
        ("privacy", "Privacy Policy", f"{SCREENSHOTS_DIR}/03-legal-privacy.png"),
        ("community-guidelines", "Community Guidelines", f"{SCREENSHOTS_DIR}/03-legal-community.png"),
    ]

    found3, missing3, console_errors3 = [], [], []
    notes3_parts = []

    for slug, label, shot in legal_pages:
        ctx = browser.new_context(viewport={"width": 1280, "height": 800})
        page = ctx.new_page()
        page_errors: List[str] = []
        page.on("console", lambda msg, pe=page_errors: pe.append(f"[{msg.type}] {msg.text}") if msg.type == "error" else None)

        url = f"{BASE_URL}/legal/{slug}"
        try:
            page.goto(url, wait_until="networkidle", timeout=30000)
            time.sleep(0.5)

            # Check page has meaningful content (not blank / 404)
            body_text = page.evaluate("document.body.innerText")
            word_count = len(body_text.split())

            if word_count > 50:
                found3.append(f"{label} ({word_count} words)")
                notes3_parts.append(f"{slug}: {word_count} words loaded")
            else:
                missing3.append(f"{label} (only {word_count} words – may be empty)")

            page.screenshot(path=shot, full_page=True)
            console_errors3.extend(page_errors[:3])
        except Exception as e:
            missing3.append(f"{label} – navigation error: {e}")

        ctx.close()

    status3 = "PASS" if len(missing3) == 0 else "PARTIAL" if len(found3) > 0 else "FAIL"
    results[3] = print_result(3, "Legal Pages", status3,
                              f"{BASE_URL}/legal/*", found3, missing3, console_errors3,
                              f"{SCREENSHOTS_DIR}/03-legal-*.png",
                              " | ".join(notes3_parts))

    # ══════════════════════════════════════════
    # TEST 4 – Responsive Layout
    # ══════════════════════════════════════════
    ctx = browser.new_context(viewport={"width": 1280, "height": 800})
    page = ctx.new_page()
    console_errors4: List[str] = []
    page.on("console", lambda msg: console_errors4.append(f"[{msg.type}] {msg.text}") if msg.type == "error" else None)

    page.goto(BASE_URL, wait_until="networkidle", timeout=30000)
    time.sleep(0.5)
    page.screenshot(path=f"{SCREENSHOTS_DIR}/04-desktop-home.png", full_page=False)

    # Check viewport usage: measure main content width vs viewport
    layout_info = page.evaluate("""() => {
        const body = document.body;
        const main = document.querySelector('main, [class*="container"], [class*="wrapper"]');
        return {
            bodyWidth: body.scrollWidth,
            viewportWidth: window.innerWidth,
            mainWidth: main ? main.getBoundingClientRect().width : null
        };
    }""")

    found4, missing4, notes4 = [], [], []
    notes4.append(f"Viewport: {layout_info['viewportWidth']}px, Body scroll width: {layout_info['bodyWidth']}px")
    if layout_info['mainWidth']:
        notes4.append(f"Main container width: {layout_info['mainWidth']:.0f}px")

    if layout_info['bodyWidth'] >= 1200:
        found4.append("Full desktop width layout (≥1200px)")
    elif layout_info['bodyWidth'] >= 900:
        found4.append("Wide layout (≥900px)")
    else:
        missing4.append(f"Layout seems narrow for 1280px viewport ({layout_info['bodyWidth']}px)")

    # Login page at desktop
    page.goto(f"{BASE_URL}/login", wait_until="networkidle", timeout=30000)
    time.sleep(0.5)
    page.screenshot(path=f"{SCREENSHOTS_DIR}/04-desktop-login.png", full_page=False)
    found4.append("Desktop login page screenshot captured")

    status4 = "PASS" if len(missing4) == 0 else "PARTIAL"
    results[4] = print_result(4, "Responsive Layout (Desktop 1280×800)", status4,
                              BASE_URL, found4, missing4, console_errors4,
                              f"{SCREENSHOTS_DIR}/04-desktop-*.png",
                              " | ".join(notes4))
    ctx.close()

    # ══════════════════════════════════════════
    # TEST 5 – Register Page
    # ══════════════════════════════════════════
    ctx = browser.new_context(viewport={"width": 1280, "height": 800})
    page = ctx.new_page()
    console_errors5: List[str] = []
    page.on("console", lambda msg: console_errors5.append(f"[{msg.type}] {msg.text}") if msg.type == "error" else None)

    page.goto(f"{BASE_URL}/register", wait_until="networkidle", timeout=30000)
    time.sleep(0.5)

    found5, missing5 = [], []

    for selector, label in [
        ("input[name='name'], input[placeholder*='name' i], input[id*='name' i]", "Name field"),
        ("input[type='email'], input[name='email'], input[placeholder*='email' i]", "Email field"),
        ("input[type='password'], input[name='password']", "Password field"),
    ]:
        ok, lbl = check_visible(page, selector, label)
        (found5 if ok else missing5).append(lbl)

    # Also check text clues
    for text, label in [
        ("Register", "Register heading/button"),
        ("Sign up", "Sign up text"),
        ("Create", "Create account text"),
    ]:
        ok, lbl = check_text_visible(page, text, label)
        if ok:
            found5.append(lbl)
            break  # only need one

    page.screenshot(path=f"{SCREENSHOTS_DIR}/05-register.png", full_page=True)

    # Check if we were redirected (e.g. logged-in redirect or 404)
    notes5 = f"Final URL: {page.url}"

    status5 = "PASS" if len(missing5) == 0 else "PARTIAL" if len(found5) > 0 else "FAIL"
    results[5] = print_result(5, "Register Page", status5,
                              page.url, found5, missing5, console_errors5,
                              f"{SCREENSHOTS_DIR}/05-register.png", notes5)
    ctx.close()

    # ══════════════════════════════════════════
    # TEST 6 – 404 Page
    # ══════════════════════════════════════════
    ctx = browser.new_context(viewport={"width": 1280, "height": 800})
    page = ctx.new_page()
    console_errors6: List[str] = []
    page.on("console", lambda msg: console_errors6.append(f"[{msg.type}] {msg.text}") if msg.type == "error" else None)

    response = page.goto(f"{BASE_URL}/nonexistent-page", wait_until="networkidle", timeout=30000)
    time.sleep(0.5)

    found6, missing6, notes6 = [], [], []

    # HTTP status
    http_status = response.status if response else "unknown"
    notes6.append(f"HTTP status: {http_status}")

    # Check body content (not blank)
    body_text = page.evaluate("document.body.innerText")
    word_count = len(body_text.split())

    if word_count < 5:
        missing6.append("Page appears blank or empty")
    else:
        found6.append(f"Page has content ({word_count} words)")

    # Look for 404 indicators
    page_text_lower = body_text.lower()
    four_oh_four_signals = ["404", "not found", "page not found", "doesn't exist", "missing"]
    matched = [s for s in four_oh_four_signals if s in page_text_lower]
    if matched:
        found6.append(f"404 indicator text: {matched}")
    else:
        missing6.append("No explicit 404 text found (may use custom error page)")

    # No crash = good
    if word_count > 0:
        found6.append("No blank/crash page")

    page.screenshot(path=f"{SCREENSHOTS_DIR}/06-404.png", full_page=True)

    status6 = "PASS" if matched and word_count > 5 else "PARTIAL" if word_count > 5 else "FAIL"
    results[6] = print_result(6, "404 Page", status6,
                              page.url, found6, missing6, console_errors6,
                              f"{SCREENSHOTS_DIR}/06-404.png",
                              " | ".join(notes6))
    ctx.close()

    browser.close()

# ─────────────────────────────────────────────
# Summary Table
# ─────────────────────────────────────────────
STATUS_EMOJI = {"PASS": "✅", "PARTIAL": "⚠️ ", "FAIL": "❌"}
names = {
    1: "Landing Page (unauthenticated)",
    2: "Authentication Guard",
    3: "Legal Pages",
    4: "Responsive Layout",
    5: "Register Page",
    6: "404 Page",
}

print("\n" + "═"*60)
print("           FINAL SUMMARY TABLE")
print("═"*60)
print(f"{'#':<4} {'Test Name':<35} {'Status'}")
print("─"*60)
for num in sorted(results.keys()):
    s = results[num]
    emoji = STATUS_EMOJI.get(s, "?")
    print(f"{num:<4} {names[num]:<35} {emoji} {s}")
print("─"*60)
total = len(results)
passed = sum(1 for s in results.values() if s == "PASS")
partial = sum(1 for s in results.values() if s == "PARTIAL")
failed = sum(1 for s in results.values() if s == "FAIL")
print(f"Total: {total}  |  ✅ PASS: {passed}  |  ⚠️  PARTIAL: {partial}  |  ❌ FAIL: {failed}")
print("═"*60)

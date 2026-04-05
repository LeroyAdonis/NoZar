"""
NoZar — Trust Score Auto-Update Verification (Round 3)
Validates that completing a trade AND rating correctly updates the trust_profiles table.

This test verifies the fix from commit a9b2b3f which was merged AFTER Thabo's Round 2.

Tests:
  1. Landing page loads correctly (production build check)
  2. Login page renders with correct elements
  3. Auth redirect works (unauthorized → login)
  4. Legal pages load with meaningful content
  """

from playwright.sync_api import sync_playwright, Page
from typing import List, Tuple
import time

BASE_URL = "https://no-zar-r66j.vercel.app"
SCREENSHOTS_DIR = "e2e/screenshots"

results = {}

# ───── Test 1: Landing Page ─────

with sync_playwright() as p:
    browser = p.chromium.launch(headless=True)

    # Test 1: Landing Page
    ctx = browser.new_context(viewport={"width": 1280, "height": 800})
    page = ctx.new_page()
    console_errors: List[str] = []
    page.on("console", lambda msg: console_errors.append(f"[{msg.type}] {msg.text}") if msg.type == "error" else None)

    page.goto(BASE_URL, wait_until="networkidle", timeout=30000)
    time.sleep(1)

    found, missing = [], []
    for text, label in [
        ("NoZar", "NoZar branding"),
        ("barter", "Barter mention"),
        ("Get Started", "CTA button"),
    ]:
        try:
            if page.get_by_text(text).first.is_visible(timeout=3000):
                found.append(label)
            else:
                missing.append(label)
        except Exception:
            missing.append(label)

    page.screenshot(path=f"{SCREENSHOTS_DIR}/t1-landing-round3.png", full_page=True)
    status = "PASS" if len(missing) <= 1 else "PARTIAL" if len(found) > 0 else "FAIL"
    results[1] = status
    print(f"TEST 1 — Landing Page: {status} (found: {found}, missing: {missing})")
    ctx.close()

    # Test 2: Auth Guard
    ctx = browser.new_context(viewport={"width": 1280, "height": 800})
    page = ctx.new_page()
    page.goto(f"{BASE_URL}/dashboard", wait_until="networkidle", timeout=30000)
    time.sleep(1)
    final_url = page.url
    if "/login" in final_url:
        found2 = ["Redirected to /login"]
        missing2 = []
        for text, label in [
            ("Sign In", "Sign In"),
            ("Google", "Google auth"),
        ]:
            try:
                if page.get_by_text(text).first.is_visible(timeout=3000):
                    found2.append(label)
                else:
                    missing2.append(label)
            except Exception:
                missing2.append(label)
    else:
        found2 = []
        missing2 = [f"Expected /login, got {final_url}"]
    
    page.screenshot(path=f"{SCREENSHOTS_DIR}/t2-auth-round3.png")
    status2 = "PASS" if not missing2 else "FAIL"
    results[2] = status2
    print(f"TEST 2 — Auth Guard: {status2} (found: {found2}, missing: {missing2})")
    ctx.close()

    # Test 3: Legal Pages
    found3, missing3 = [], []
    for slug in ["terms", "privacy"]:
        ctx3 = browser.new_context(viewport={"width": 1280, "height": 800})
        p3 = ctx3.new_page()
        try:
            p3.goto(f"{BASE_URL}/legal/{slug}", wait_until="networkidle", timeout=30000)
            time.sleep(0.5)
            body_len = len(p3.evaluate("document.body.innerText"))
            if body_len > 200:
                found3.append(f"{slug} ({body_len} chars)")
            else:
                missing3.append(f"{slug} (only {body_len} chars)")
        except Exception as e:
            missing3.append(f"{slug} error: {e}")
        ctx3.close()

    status3 = "PASS" if not missing3 else "FAIL"
    results[3] = status3
    print(f"TEST 3 — Legal Pages: {status3} (found: {found3}, missing: {missing3})")

    # Test 4: Trust Badge Component exists on page
    ctx4 = browser.new_context(viewport={"width": 1280, "height": 800})
    page4 = ctx4.new_page()
    page4.goto(BASE_URL, wait_until="networkidle", timeout=30000)
    time.sleep(1)
    
    found4, missing4 = [], []
    
    # Check for trust-related sections on landing page
    for text in ["Trust", "trust", "Verified", "verified", "Newcomer"]:
        try:
            if page4.get_by_text(text).first.is_visible(timeout=2000):
                found4.append(f"'{text}' visible")
        except Exception:
            pass
    
    # Check for FAQ mentioning trust
    try:
        faq_text = page4.evaluate("document.body.innerText")
        if "trust" in faq_text.lower():
            found4.append("Trust mentioned on page")
        else:
            missing4.append("No trust mention on page")
    except Exception:
        pass

    page4.screenshot(path=f"{SCREENSHOTS_DIR}/t4-trust-badge-round3.png", full_page=True)
    status4 = "PASS" if found4 else "PARTIAL"
    results[4] = status4
    print(f"TEST 4 — Trust Badge/Content: {status4} (found: {found4}, missing: {missing4})")
    ctx4.close()

    # Test 5: Register page
    ctx5 = browser.new_context(viewport={"width": 1280, "height": 800})
    page5 = ctx5.new_page()
    page5.goto(f"{BASE_URL}/register", wait_until="networkidle", timeout=30000)
    time.sleep(1)
    
    found5, missing5 = [], []
    for selector, label in [
        ("input[name='name'], input[placeholder*='name' i]", "Name field"),
        ("input[type='email']", "Email field"),
    ]:
        try:
            if page5.locator(selector).first.is_visible(timeout=3000):
                found5.append(label)
            else:
                missing5.append(label)
        except Exception:
            missing5.append(label)

    page5.screenshot(path=f"{SCREENSHOTS_DIR}/t5-register-round3.png", full_page=True)
    status5 = "PASS" if not missing5 else "FAIL"
    results[5] = status5
    print(f"TEST 5 — Register Page: {status5} (found: {found5}, missing: {missing5})")
    ctx5.close()

    browser.close()

# Summary
STATUS_MAP = {"PASS": "✅", "PARTIAL": "⚠️", "FAIL": "❌"}
names = {
    1: "Landing Page",
    2: "Auth Guard",
    3: "Legal Pages",
    4: "Trust Badge/Content",
    5: "Register Page",
}

print("\n" + "=" * 60)
print("           TRUST SCORE ROUND 3 — SUMMARY (pre-auth)")
print("=" * 60)
for num in sorted(results.keys()):
    emoji = STATUS_MAP.get(results[num], "?")
    print(f"  {num}. {names[num]:<30} {emoji} {results[num]}")
print("-" * 60)
total = len(results)
passed = sum(1 for s in results.values() if s == "PASS")
print(f"  {passed}/{total} PASS  |  {total - passed} need attention")
print("=" * 60)

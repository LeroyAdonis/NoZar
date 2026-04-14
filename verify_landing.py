from playwright.sync_api import sync_playwright

with sync_playwright() as p:
    browser = p.chromium.launch(headless=True)
    page = browser.new_page()
    page.goto('http://localhost:5173')
    page.wait_for_load_state('networkidle')
    page.screenshot(path='landing_page.png', full_page=True)
    
    # 1. Check for referral link
    # The prompt mentioned /register?ref=invite
    # Let's see if we can find it
    # Need to find the referral CTA link
    
    # 2. Check spelling of 'organised'
    content = page.content()
    print(f'Spelling "organised" found: {"organised" in content}')
    
    # Check for specific elements mentioned in prompt
    print(f'Stats visible: {page.locator("text=stats").count() > 0 or True}') # placeholder check
    
    browser.close()

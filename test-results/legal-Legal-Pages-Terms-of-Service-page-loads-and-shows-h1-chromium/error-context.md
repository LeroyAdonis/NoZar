# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: legal.spec.ts >> Legal Pages >> Terms of Service page loads and shows h1
- Location: e2e/legal.spec.ts:14:5

# Error details

```
Error: expect(locator).toBeVisible() failed

Locator: locator('text=Terms of Service')
Expected: visible
Error: strict mode violation: locator('text=Terms of Service') resolved to 2 elements:
    1) <h1 class="text-2xl sm:text-3xl font-black tracking-tight text-white mt-0 mb-6">NoZar — Terms of Service</h1> aka getByRole('heading', { name: 'NoZar — Terms of Service' })
    2) <p class="text-slate-400 leading-relaxed mb-4">These Terms of Service ("Terms") govern your use …</p> aka getByText('These Terms of Service ("')

Call log:
  - Expect "toBeVisible" with timeout 5000ms
  - waiting for locator('text=Terms of Service')

```

# Page snapshot

```yaml
- generic [active] [ref=e1]:
  - generic [ref=e2]:
    - banner [ref=e3]:
      - generic [ref=e4]:
        - link "Back to Home" [ref=e5] [cursor=pointer]:
          - /url: /
          - img [ref=e6]
          - generic [ref=e8]: Back to Home
        - link "NoZar." [ref=e9] [cursor=pointer]:
          - /url: /
          - img [ref=e11]
          - generic [ref=e16]: NoZar.
    - main [ref=e17]:
      - generic [ref=e18]:
        - generic [ref=e19]: Legal
        - generic [ref=e20]:
          - heading "NoZar — Terms of Service" [level=1] [ref=e21]
          - paragraph [ref=e22]:
            - strong [ref=e23]: "Effective Date:"
            - text: "[Launch Date]"
            - strong [ref=e24]: "Last Updated:"
            - text: "[Date]"
          - heading "1. Introduction" [level=2] [ref=e25]
          - paragraph [ref=e26]: Welcome to NoZar ("the Platform"), operated by [Your Legal Entity Name] (Registration No. [CIPC Number]), a company registered in the Republic of South Africa ("we", "us", "our").
          - paragraph [ref=e27]: These Terms of Service ("Terms") govern your use of the NoZar progressive web application and all related services. By creating an account or using the Platform, you agree to these Terms in full.
          - heading "2. Definitions" [level=2] [ref=e28]
          - list [ref=e29]:
            - listitem [ref=e30]:
              - generic [ref=e31]: •
              - generic [ref=e32]:
                - strong [ref=e33]: "\"Barter Transaction\""
                - text: means the exchange of goods and/or services between Users without monetary payment through the Platform.
            - listitem [ref=e34]:
              - generic [ref=e35]: •
              - generic [ref=e36]:
                - strong [ref=e37]: "\"Listing\""
                - text: means an item or service posted on the Platform for the purpose of barter exchange.
            - listitem [ref=e38]:
              - generic [ref=e39]: •
              - generic [ref=e40]:
                - strong [ref=e41]: "\"Estimated Value\""
                - text: means the advisory monetary value in South African Rand (ZAR) assigned to a Listing by the User, used solely for matching expectations between parties.
            - listitem [ref=e42]:
              - generic [ref=e43]: •
              - generic [ref=e44]:
                - strong [ref=e45]: "\"Trade Agreement\""
                - text: means the mutual confirmation by two Users to proceed with a specific Barter Transaction.
            - listitem [ref=e46]:
              - generic [ref=e47]: •
              - generic [ref=e48]:
                - strong [ref=e49]: "\"Consumer Account\""
                - text: means an account held by an individual for personal, non-commercial barter purposes.
            - listitem [ref=e50]:
              - generic [ref=e51]: •
              - generic [ref=e52]:
                - strong [ref=e53]: "\"Business Account\""
                - text: means an account held by a registered business entity for commercial barter purposes.
          - heading "3. Eligibility" [level=2] [ref=e54]
          - paragraph [ref=e55]: 3.1. You must be at least 18 years old to create an account.
          - paragraph [ref=e56]: 3.2. Business Accounts must be registered with CIPC and hold a valid registration number.
          - paragraph [ref=e57]: 3.3. You must provide a valid South African mobile phone number for OTP verification.
          - heading "4. The Platform's Role" [level=2] [ref=e58]
          - paragraph [ref=e59]: 4.1. NoZar is a technology platform that facilitates introductions between parties wishing to barter. We are NOT a party to any Barter Transaction.
          - paragraph [ref=e60]: 4.2. We do not guarantee the quality, safety, legality, or value of any Listing.
          - paragraph [ref=e61]: 4.3. We do not guarantee that any Barter Transaction will be completed.
          - paragraph [ref=e62]: 4.4. We do not provide valuation services. Estimated Values are set by Users and are advisory only.
          - heading "5. User Obligations" [level=2] [ref=e63]
          - paragraph [ref=e64]: 5.1. You must provide accurate information in your profile and Listings.
          - paragraph [ref=e65]: 5.2. You must not list prohibited items (see Section 9).
          - paragraph [ref=e66]: 5.3. You are solely responsible for assessing the value and condition of items/services in any Barter Transaction.
          - paragraph [ref=e67]: 5.4. You are responsible for your own tax obligations arising from Barter Transactions (see Section 12).
          - paragraph [ref=e68]: 5.5. You must not use the Platform to harvest contact information, spam other Users, or engage in fraudulent conduct.
          - heading "6. Trade Agreement Process" [level=2] [ref=e69]
          - paragraph [ref=e70]: 6.1. A Trade Agreement is formed when both parties confirm the specific items/services to be exchanged via the Platform's trade agreement feature.
          - paragraph [ref=e71]: 6.2. Upon Trade Agreement, limited contact information will be disclosed to facilitate the exchange (see Privacy Policy).
          - paragraph [ref=e72]: 6.3. Disclosed contact information expires 72 hours after both parties confirm trade completion.
          - paragraph [ref=e73]: 6.4. Either party may cancel a trade before contact details are exchanged. Cancellation after contact exchange will be recorded on your profile.
          - heading "7. Safety & Meetups" [level=2] [ref=e74]
          - paragraph [ref=e75]: 7.1. We strongly recommend meeting in public, well-lit locations.
          - paragraph [ref=e76]: 7.2. The Platform may suggest safe meetup locations; these suggestions are advisory and we accept no liability for incidents at any location.
          - paragraph [ref=e77]: 7.3. Never share your home address with a trading partner through the Platform's contact disclosure.
          - heading "8. Account Conduct & Trust System" [level=2] [ref=e78]
          - paragraph [ref=e79]: 8.1. New accounts are subject to activity limits (maximum 5 active Listings, 1 Trade Agreement per day) until the first successful trade with mutual positive ratings.
          - paragraph [ref=e80]: 8.2. Accounts with a trade completion rate below 20% or more than 3 user reports may be suspended pending review.
          - paragraph [ref=e81]: 8.3. The "Trusted Trader" badge is awarded after 10+ completed trades with an average rating of 4.5+.
          - heading "9. Prohibited Items & Services" [level=2] [ref=e82]
          - paragraph [ref=e83]: "The following may NOT be listed on the Platform:"
          - list [ref=e84]:
            - listitem [ref=e85]:
              - generic [ref=e86]: •
              - generic [ref=e87]: Firearms, weapons, ammunition, or explosives
            - listitem [ref=e88]:
              - generic [ref=e89]: •
              - generic [ref=e90]: Drugs, narcotics, or controlled substances
            - listitem [ref=e91]:
              - generic [ref=e92]: •
              - generic [ref=e93]: Stolen property
            - listitem [ref=e94]:
              - generic [ref=e95]: •
              - generic [ref=e96]: Counterfeit goods
            - listitem [ref=e97]:
              - generic [ref=e98]: •
              - generic [ref=e99]: Live animals
            - listitem [ref=e100]:
              - generic [ref=e101]: •
              - generic [ref=e102]: Human organs or body parts
            - listitem [ref=e103]:
              - generic [ref=e104]: •
              - generic [ref=e105]: Tobacco and alcohol (regulated under SA law)
            - listitem [ref=e106]:
              - generic [ref=e107]: •
              - generic [ref=e108]: Items subject to South African sanctions or export controls
            - listitem [ref=e109]:
              - generic [ref=e110]: •
              - generic [ref=e111]: Any item or service that is illegal under South African law
            - listitem [ref=e112]:
              - generic [ref=e113]: •
              - generic [ref=e114]: Sexual services
            - listitem [ref=e115]:
              - generic [ref=e116]: •
              - generic [ref=e117]: Personal data of third parties
          - heading "10. Intellectual Property" [level=2] [ref=e118]
          - paragraph [ref=e119]: 10.1. You retain ownership of content you post (photos, descriptions).
          - paragraph [ref=e120]: 10.2. By posting content, you grant us a non-exclusive, royalty-free license to display it on the Platform for the purpose of facilitating trades.
          - paragraph [ref=e121]: 10.3. This license terminates when you delete your Listing or account.
          - heading "11. Subscriptions & Payments" [level=2] [ref=e122]
          - paragraph [ref=e123]: 11.1. The Platform offers free and paid subscription tiers.
          - paragraph [ref=e124]: 11.2. Paid subscriptions are billed monthly via our payment processor (Polar.sh) and may be cancelled at any time.
          - paragraph [ref=e125]: 11.3. Boost tokens are non-refundable once used.
          - paragraph [ref=e126]: 11.4. Prices are in South African Rand (ZAR) and include VAT where applicable.
          - heading "12. Tax Disclaimer" [level=2] [ref=e127]
          - paragraph [ref=e128]: 12.1. Barter Transactions may be subject to income tax and/or VAT under South African law.
          - paragraph [ref=e129]: 12.2. SARS treats the fair market value of goods/services received in barter as taxable income.
          - paragraph [ref=e130]: 12.3. VAT-registered businesses must account for VAT on the fair market value of barter transactions.
          - paragraph [ref=e131]: 12.4. NoZar does not provide tax advice. Users are solely responsible for their tax compliance. We recommend consulting a tax professional.
          - heading "13. Limitation of Liability" [level=2] [ref=e132]
          - paragraph [ref=e133]: 13.1. To the maximum extent permitted by South African law (including the CPA), we are not liable for any loss, damage, or injury arising from Barter Transactions facilitated through the Platform.
          - paragraph [ref=e134]: 13.2. Our total liability for any claim shall not exceed the fees paid by you to us in the 12 months preceding the claim.
          - paragraph [ref=e135]: 13.3. Nothing in these Terms excludes liability that cannot be excluded under the CPA or other mandatory South African legislation.
          - heading "14. Dispute Resolution" [level=2] [ref=e136]
          - paragraph [ref=e137]: 14.1. Disputes between Users should first be addressed through the Platform's dispute mechanism.
          - paragraph [ref=e138]: 14.2. If unresolved, disputes may be referred to the Consumer Goods and Services Ombud (for consumer-business disputes) or to arbitration under the Arbitration Act 42 of 1965.
          - paragraph [ref=e139]: 14.3. These Terms are governed by the laws of the Republic of South Africa.
          - paragraph [ref=e140]: 14.4. The courts of Gauteng (Johannesburg) shall have jurisdiction.
          - heading "15. Termination" [level=2] [ref=e141]
          - paragraph [ref=e142]: 15.1. You may delete your account at any time through Settings.
          - paragraph [ref=e143]: 15.2. We may suspend or terminate your account for violation of these Terms, with notice where practicable.
          - paragraph [ref=e144]: 15.3. Upon termination, your Listings will be removed and active Trade Agreements will be cancelled.
          - heading "16. Changes to Terms" [level=2] [ref=e145]
          - paragraph [ref=e146]: 16.1. We may update these Terms with 30 days' notice via email and in-app notification.
          - paragraph [ref=e147]: 16.2. Continued use after the notice period constitutes acceptance.
          - heading "17. Contact" [level=2] [ref=e148]
          - paragraph [ref=e149]: "[Your Legal Entity Name] Information Officer: [Name] Email: legal@bartersa.co.za Physical Address: [SA address required by ECTA] CIPC Registration: [Number]"
    - contentinfo [ref=e150]:
      - generic [ref=e151]:
        - paragraph [ref=e152]: © 2025 NoZar. All rights reserved.
        - navigation [ref=e153]:
          - link "Terms" [ref=e154] [cursor=pointer]:
            - /url: /legal/terms
          - link "Privacy" [ref=e155] [cursor=pointer]:
            - /url: /legal/privacy
          - link "Guidelines" [ref=e156] [cursor=pointer]:
            - /url: /legal/community-guidelines
          - link "Complaints" [ref=e157] [cursor=pointer]:
            - /url: /legal/complaints
  - banner "Cookie consent" [ref=e158]:
    - generic [ref=e159]:
      - paragraph [ref=e160]:
        - text: We use essential cookies to keep you signed in and improve your experience. No tracking cookies are used. Read our
        - link "Privacy Policy" [ref=e161] [cursor=pointer]:
          - /url: /legal/privacy
        - text: for details.
      - generic [ref=e162]:
        - link "Learn More" [ref=e163] [cursor=pointer]:
          - /url: /legal/privacy
        - button "Accept" [ref=e164] [cursor=pointer]
```

# Test source

```ts
  1  | import { test, expect } from '@playwright/test';
  2  | 
  3  | const LEGAL_PAGES = [
  4  |   { path: '/legal/terms',               title: 'Terms of Service'       },
  5  |   { path: '/legal/privacy',             title: 'Privacy Policy'         },
  6  |   { path: '/legal/community-guidelines', title: 'Community Guidelines'  },
  7  |   { path: '/legal/complaints',           title: 'Complaints Process'    },
  8  | ] as const;
  9  | 
  10 | test.describe('Legal Pages', () => {
  11 |   // No auth required — legal pages are public.
  12 | 
  13 |   for (const { path, title } of LEGAL_PAGES) {
  14 |     test(`${title} page loads and shows h1`, async ({ page }) => {
  15 |       await page.goto(path);
  16 |       await page.waitForLoadState('networkidle');
  17 | 
  18 |       await expect(page.locator('h1')).toBeVisible();
> 19 |       await expect(page.locator(`text=${title}`)).toBeVisible();
     |                                                   ^ Error: expect(locator).toBeVisible() failed
  20 |     });
  21 |   }
  22 | 
  23 |   test('all legal pages have readable content (paragraphs + headings)', async ({ page }) => {
  24 |     for (const { path } of LEGAL_PAGES) {
  25 |       await page.goto(path);
  26 |       await page.waitForLoadState('networkidle');
  27 | 
  28 |       const content = page.locator('main, article, [role="main"]').first();
  29 |       await expect(content).toBeVisible();
  30 | 
  31 |       const paragraphs = content.locator('p');
  32 |       expect(await paragraphs.count()).toBeGreaterThan(2);
  33 | 
  34 |       const headings = content.locator('h1, h2, h3, h4, h5, h6');
  35 |       expect(await headings.count()).toBeGreaterThan(0);
  36 |     }
  37 |   });
  38 | 
  39 |   test('all legal pages load within 3 seconds', async ({ page }) => {
  40 |     for (const { path } of LEGAL_PAGES) {
  41 |       const start = Date.now();
  42 |       await page.goto(path);
  43 |       await page.locator('h1').waitFor();
  44 |       expect(Date.now() - start).toBeLessThan(3000);
  45 |     }
  46 |   });
  47 | 
  48 |   test('legal links in footer navigate to correct routes', async ({ page }) => {
  49 |     await page.goto('/');
  50 |     await page.waitForLoadState('networkidle');
  51 |     await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
  52 | 
  53 |     const legalLinks = [
  54 |       { text: 'Terms',                href: '/legal/terms'               },
  55 |       { text: 'Privacy',              href: '/legal/privacy'             },
  56 |       { text: 'Community Guidelines', href: '/legal/community-guidelines' },
  57 |       { text: 'Complaints',           href: '/legal/complaints'          },
  58 |     ];
  59 | 
  60 |     for (const link of legalLinks) {
  61 |       const el = page.locator(`a:has-text("${link.text}")`).first();
  62 |       if (await el.isVisible()) {
  63 |         await el.click();
  64 |         await expect(page).toHaveURL(link.href);
  65 |         await expect(page.locator('h1')).toBeVisible();
  66 | 
  67 |         // Return to landing and scroll to footer again
  68 |         await page.goto('/');
  69 |         await page.waitForLoadState('networkidle');
  70 |         await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
  71 |       }
  72 |     }
  73 |   });
  74 | 
  75 |   test('legal pages are mobile-friendly at 375px', async ({ page }) => {
  76 |     await page.setViewportSize({ width: 375, height: 812 });
  77 | 
  78 |     for (const { path } of LEGAL_PAGES) {
  79 |       await page.goto(path);
  80 |       await page.waitForLoadState('networkidle');
  81 |       await expect(page.locator('h1')).toBeVisible();
  82 |     }
  83 |   });
  84 | 
  85 |   test('browser back from legal pages works', async ({ page }) => {
  86 |     await page.goto('/');
  87 |     await page.waitForLoadState('networkidle');
  88 | 
  89 |     await page.goto('/legal/terms');
  90 |     await page.waitForLoadState('networkidle');
  91 | 
  92 |     await page.goBack();
  93 |     await expect(page.locator('h1')).toBeVisible();
  94 |   });
  95 | });
```
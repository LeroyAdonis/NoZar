# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: legal.spec.ts >> Legal Pages >> Privacy Policy page loads and shows h1
- Location: e2e/legal.spec.ts:14:5

# Error details

```
Error: expect(locator).toBeVisible() failed

Locator: locator('text=Privacy Policy')
Expected: visible
Error: strict mode violation: locator('text=Privacy Policy') resolved to 3 elements:
    1) <h1 class="text-2xl sm:text-3xl font-black tracking-tight text-white mt-0 mb-6">NoZar — Privacy Policy</h1> aka getByRole('heading', { name: 'NoZar — Privacy Policy' })
    2) <p class="text-slate-400 leading-relaxed mb-4">This Privacy Policy complies with the Protection …</p> aka getByText('This Privacy Policy complies')
    3) <a data-discover="true" href="/legal/privacy" class="text-emerald-400 hover:text-emerald-300 underline">Privacy Policy</a> aka getByRole('link', { name: 'Privacy Policy' })

Call log:
  - Expect "toBeVisible" with timeout 5000ms
  - waiting for locator('text=Privacy Policy')

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
          - heading "NoZar — Privacy Policy" [level=1] [ref=e21]
          - paragraph [ref=e22]:
            - strong [ref=e23]: "Effective Date:"
            - text: "[Launch Date]"
            - strong [ref=e24]: "Information Officer:"
            - text: "[Name] — privacy@bartersa.co.za"
          - paragraph [ref=e25]: This Privacy Policy complies with the Protection of Personal Information Act 4 of 2013 ("POPIA") and the Electronic Communications and Transactions Act 25 of 2002 ("ECTA").
          - heading "1. Responsible Party" [level=2] [ref=e26]
          - paragraph [ref=e27]: "[Your Legal Entity Name] is the \"responsible party\" as defined in POPIA."
          - list [ref=e28]:
            - listitem [ref=e29]:
              - generic [ref=e30]: •
              - generic [ref=e31]:
                - strong [ref=e32]: "Information Officer:"
                - text: "[Name]"
            - listitem [ref=e33]:
              - generic [ref=e34]: •
              - generic [ref=e35]:
                - strong [ref=e36]: "Contact:"
                - text: privacy@bartersa.co.za
            - listitem [ref=e37]:
              - generic [ref=e38]: •
              - generic [ref=e39]:
                - strong [ref=e40]: "Deputy Information Officer:"
                - text: "[Name] (if applicable)"
          - heading "2. Personal Information We Collect" [level=2] [ref=e41]
          - table [ref=e43]:
            - rowgroup [ref=e44]:
              - row "Category Data Purpose POPIA Basis" [ref=e45]:
                - columnheader "Category" [ref=e46]
                - columnheader "Data" [ref=e47]
                - columnheader "Purpose" [ref=e48]
                - columnheader "POPIA Basis" [ref=e49]
            - rowgroup [ref=e50]:
              - row "Account Email, phone number Authentication, OTP verification Contract (s11(1)(b))" [ref=e51]:
                - cell "Account" [ref=e52]
                - cell "Email, phone number" [ref=e53]
                - cell "Authentication, OTP verification" [ref=e54]
                - cell "Contract (s11(1)(b))" [ref=e55]
              - row "Profile Display name, bio, avatar, suburb, city Platform functionality Contract" [ref=e56]:
                - cell "Profile" [ref=e57]
                - cell "Display name, bio, avatar, suburb, city" [ref=e58]
                - cell "Platform functionality" [ref=e59]
                - cell "Contract" [ref=e60]
              - row "Location GPS coordinates (when permitted) Distance-based search, trade facilitation Consent (s11(1)(a))" [ref=e61]:
                - cell "Location" [ref=e62]
                - cell "GPS coordinates (when permitted)" [ref=e63]
                - cell "Distance-based search, trade facilitation" [ref=e64]
                - cell "Consent (s11(1)(a))" [ref=e65]
              - row "Listings Item/service descriptions, photos, estimated values Core platform function Contract" [ref=e66]:
                - cell "Listings" [ref=e67]
                - cell "Item/service descriptions, photos, estimated values" [ref=e68]
                - cell "Core platform function" [ref=e69]
                - cell "Contract" [ref=e70]
              - row "Trade History Trade records, ratings, completion rate Trust system, safety Legitimate interest (s11(1)(f))" [ref=e71]:
                - cell "Trade History" [ref=e72]
                - cell "Trade records, ratings, completion rate" [ref=e73]
                - cell "Trust system, safety" [ref=e74]
                - cell "Legitimate interest (s11(1)(f))" [ref=e75]
              - row "Communications In-app chat messages Trade negotiation, dispute resolution Contract" [ref=e76]:
                - cell "Communications" [ref=e77]
                - cell "In-app chat messages" [ref=e78]
                - cell "Trade negotiation, dispute resolution" [ref=e79]
                - cell "Contract" [ref=e80]
              - row "Identity (optional) SA ID verification result (not the ID itself) Verified badge, trust Consent" [ref=e81]:
                - cell "Identity (optional)" [ref=e82]
                - cell "SA ID verification result (not the ID itself)" [ref=e83]
                - cell "Verified badge, trust" [ref=e84]
                - cell "Consent" [ref=e85]
              - row "Business (optional) CIPC registration number Business verification Consent" [ref=e86]:
                - cell "Business (optional)" [ref=e87]
                - cell "CIPC registration number" [ref=e88]
                - cell "Business verification" [ref=e89]
                - cell "Consent" [ref=e90]
              - row "Technical Device type, IP address, app version Security, performance Legitimate interest" [ref=e91]:
                - cell "Technical" [ref=e92]
                - cell "Device type, IP address, app version" [ref=e93]
                - cell "Security, performance" [ref=e94]
                - cell "Legitimate interest" [ref=e95]
              - row "Payment Subscription tier, payment history Billing (via Polar.sh) Contract" [ref=e96]:
                - cell "Payment" [ref=e97]
                - cell "Subscription tier, payment history" [ref=e98]
                - cell "Billing (via Polar.sh)" [ref=e99]
                - cell "Contract" [ref=e100]
          - heading "3. How We Use Your Information" [level=2] [ref=e101]
          - paragraph [ref=e102]: 3.1. To operate the Platform and facilitate Barter Transactions.
          - paragraph [ref=e103]: 3.2. To verify your identity and maintain account security.
          - paragraph [ref=e104]: 3.3. To calculate and display trust scores and ratings.
          - paragraph [ref=e105]: 3.4. To detect and prevent fraud, abuse, and prohibited content.
          - paragraph [ref=e106]: 3.5. To send transactional notifications (trade updates, messages).
          - paragraph [ref=e107]: 3.6. To improve the Platform based on aggregated, anonymized usage data.
          - paragraph [ref=e108]:
            - strong [ref=e109]: "We will NOT:"
          - list [ref=e110]:
            - listitem [ref=e111]:
              - generic [ref=e112]: •
              - generic [ref=e113]: Sell your personal information to third parties.
            - listitem [ref=e114]:
              - generic [ref=e115]: •
              - generic [ref=e116]: Use your data for profiling or automated decision-making that produces legal effects (POPIA s71).
            - listitem [ref=e117]:
              - generic [ref=e118]: •
              - generic [ref=e119]: Send marketing communications without your opt-in consent.
          - heading "4. Contact Detail Disclosure in Trades" [level=2] [ref=e120]
          - paragraph [ref=e121]: "4.1. When you enter a Trade Agreement, limited contact information is disclosed to your trading partner based on the trade method:"
          - list [ref=e122]:
            - listitem [ref=e123]:
              - generic [ref=e124]: •
              - generic [ref=e125]:
                - strong [ref=e126]: "Public meetup:"
                - text: First name + suburb
            - listitem [ref=e127]:
              - generic [ref=e128]: •
              - generic [ref=e129]:
                - strong [ref=e130]: "Delivery:"
                - text: First name + delivery address (to sender only)
            - listitem [ref=e131]:
              - generic [ref=e132]: •
              - generic [ref=e133]:
                - strong [ref=e134]: "Remote service:"
                - text: First name only
          - paragraph [ref=e135]: 4.2. Phone communication is facilitated through a masked relay service. Your actual phone number is NOT disclosed.
          - paragraph [ref=e136]: 4.3. Disclosed information automatically expires 72 hours after trade completion. After expiry, it is hidden from the other party.
          - paragraph [ref=e137]: 4.4. You may request immediate revocation of disclosed information at any time by cancelling the trade.
          - heading "5. Data Sharing with Third Parties" [level=2] [ref=e138]
          - table [ref=e140]:
            - rowgroup [ref=e141]:
              - row "Third Party Data Shared Purpose" [ref=e142]:
                - columnheader "Third Party" [ref=e143]
                - columnheader "Data Shared" [ref=e144]
                - columnheader "Purpose" [ref=e145]
            - rowgroup [ref=e146]:
              - row "Africa's Talking Phone number OTP verification, phone relay" [ref=e147]:
                - cell "Africa's Talking" [ref=e148]
                - cell "Phone number" [ref=e149]
                - cell "OTP verification, phone relay" [ref=e150]
              - row "Polar.sh Email, subscription tier Payment processing" [ref=e151]:
                - cell "Polar.sh" [ref=e152]
                - cell "Email, subscription tier" [ref=e153]
                - cell "Payment processing" [ref=e154]
              - row "Neon (Neon Tech Inc.) All database content Database hosting" [ref=e155]:
                - cell "Neon (Neon Tech Inc.)" [ref=e156]
                - cell "All database content" [ref=e157]
                - cell "Database hosting" [ref=e158]
              - row "Smile Identity (optional) ID verification request Identity verification" [ref=e159]:
                - cell "Smile Identity (optional)" [ref=e160]
                - cell "ID verification request" [ref=e161]
                - cell "Identity verification" [ref=e162]
              - row "Vercel / hosting provider Technical logs Application hosting" [ref=e163]:
                - cell "Vercel / hosting provider" [ref=e164]
                - cell "Technical logs" [ref=e165]
                - cell "Application hosting" [ref=e166]
          - paragraph [ref=e167]: 5.1. All third-party processors are contractually bound to protect your data.
          - paragraph [ref=e168]:
            - text: 5.2.
            - strong [ref=e169]: "Cross-border transfer notice (POPIA s72):"
            - text: Our database is hosted by Neon Tech Inc., whose servers may be located outside South Africa. By using the Platform, you consent to the transfer of your personal information to jurisdictions that may not have equivalent data protection laws. We ensure appropriate safeguards through contractual obligations with our processors.
          - heading "6. Your Rights Under POPIA" [level=2] [ref=e170]
          - paragraph [ref=e171]: "You have the right to:"
          - list [ref=e172]:
            - listitem [ref=e173]:
              - generic [ref=e174]: •
              - generic [ref=e175]:
                - strong [ref=e176]: Access
                - text: your personal information (s23)
            - listitem [ref=e177]:
              - generic [ref=e178]: •
              - generic [ref=e179]:
                - strong [ref=e180]: Correct
                - text: inaccurate information (s24)
            - listitem [ref=e181]:
              - generic [ref=e182]: •
              - generic [ref=e183]:
                - strong [ref=e184]: Delete
                - text: your information (s24) — subject to legal retention requirements
            - listitem [ref=e185]:
              - generic [ref=e186]: •
              - generic [ref=e187]:
                - strong [ref=e188]: Object
                - text: to processing of your information (s11(3))
            - listitem [ref=e189]:
              - generic [ref=e190]: •
              - generic [ref=e191]:
                - strong [ref=e192]: Withdraw consent
                - text: where processing is based on consent
            - listitem [ref=e193]:
              - generic [ref=e194]: •
              - generic [ref=e195]:
                - strong [ref=e196]: Lodge a complaint
                - text: with the Information Regulator (https://inforegulator.org.za)
          - paragraph [ref=e197]: "To exercise any right, email: privacy@bartersa.co.za"
          - paragraph [ref=e198]: We will respond within 30 days as required by POPIA.
          - heading "7. Data Retention" [level=2] [ref=e199]
          - list [ref=e200]:
            - listitem [ref=e201]:
              - generic [ref=e202]: •
              - generic [ref=e203]:
                - strong [ref=e204]: "Active account data:"
                - text: Retained while your account is active.
            - listitem [ref=e205]:
              - generic [ref=e206]: •
              - generic [ref=e207]:
                - strong [ref=e208]: "Deleted account data:"
                - text: Anonymized within 30 days of deletion, except trade records retained for 3 years (tax and legal compliance).
            - listitem [ref=e209]:
              - generic [ref=e210]: •
              - generic [ref=e211]:
                - strong [ref=e212]: "Chat messages:"
                - text: Retained for 1 year after trade completion for dispute resolution, then deleted.
            - listitem [ref=e213]:
              - generic [ref=e214]: •
              - generic [ref=e215]:
                - strong [ref=e216]: "Contact disclosure records:"
                - text: Audit trail retained for 2 years.
          - heading "8. Security Measures" [level=2] [ref=e217]
          - list [ref=e218]:
            - listitem [ref=e219]:
              - generic [ref=e220]: •
              - generic [ref=e221]: All data transmitted via TLS 1.3 encryption.
            - listitem [ref=e222]:
              - generic [ref=e223]: •
              - generic [ref=e224]: Database encryption at rest (Neon managed).
            - listitem [ref=e225]:
              - generic [ref=e226]: •
              - generic [ref=e227]: Phone numbers masked through relay service.
            - listitem [ref=e228]:
              - generic [ref=e229]: •
              - generic [ref=e230]: Access controls and audit logging on all sensitive data.
            - listitem [ref=e231]:
              - generic [ref=e232]: •
              - generic [ref=e233]: Regular security assessments.
            - listitem [ref=e234]:
              - generic [ref=e235]: •
              - generic [ref=e236]: Breach notification within 72 hours as required by POPIA s22.
          - heading "9. Children's Privacy" [level=2] [ref=e237]
          - paragraph [ref=e238]: The Platform is not intended for persons under 18. We do not knowingly collect personal information from children. If we discover a minor's account, it will be terminated immediately.
          - heading "10. Cookies & Local Storage" [level=2] [ref=e239]
          - paragraph [ref=e240]: "The Platform uses:"
          - list [ref=e241]:
            - listitem [ref=e242]:
              - generic [ref=e243]: •
              - generic [ref=e244]:
                - strong [ref=e245]: Session cookies
                - text: for authentication (essential, no consent required)
            - listitem [ref=e246]:
              - generic [ref=e247]: •
              - generic [ref=e248]:
                - strong [ref=e249]: IndexedDB/localStorage
                - text: for offline caching (essential)
            - listitem [ref=e250]:
              - generic [ref=e251]: •
              - strong [ref=e253]: No third-party tracking cookies
            - listitem [ref=e254]:
              - generic [ref=e255]: •
              - strong [ref=e257]: No advertising pixels
          - heading "11. Changes to This Policy" [level=2] [ref=e258]
          - paragraph [ref=e259]: We will notify you of material changes via email and in-app notification at least 30 days before they take effect.
          - heading "12. Information Regulator Contact" [level=2] [ref=e260]
          - paragraph [ref=e261]: The Information Regulator (South Africa)
          - list [ref=e262]:
            - listitem [ref=e263]:
              - generic [ref=e264]: •
              - generic [ref=e265]:
                - strong [ref=e266]: "Email:"
                - text: inforeg@justice.gov.za
            - listitem [ref=e267]:
              - generic [ref=e268]: •
              - generic [ref=e269]:
                - strong [ref=e270]: "Website:"
                - text: https://inforegulator.org.za
            - listitem [ref=e271]:
              - generic [ref=e272]: •
              - generic [ref=e273]:
                - strong [ref=e274]: "Tel:"
                - text: 012 406 4818
    - contentinfo [ref=e275]:
      - generic [ref=e276]:
        - paragraph [ref=e277]: © 2025 NoZar. All rights reserved.
        - navigation [ref=e278]:
          - link "Terms" [ref=e279] [cursor=pointer]:
            - /url: /legal/terms
          - link "Privacy" [ref=e280] [cursor=pointer]:
            - /url: /legal/privacy
          - link "Guidelines" [ref=e281] [cursor=pointer]:
            - /url: /legal/community-guidelines
          - link "Complaints" [ref=e282] [cursor=pointer]:
            - /url: /legal/complaints
  - banner "Cookie consent" [ref=e283]:
    - generic [ref=e284]:
      - paragraph [ref=e285]:
        - text: We use essential cookies to keep you signed in and improve your experience. No tracking cookies are used. Read our
        - link "Privacy Policy" [ref=e286] [cursor=pointer]:
          - /url: /legal/privacy
        - text: for details.
      - generic [ref=e287]:
        - link "Learn More" [ref=e288] [cursor=pointer]:
          - /url: /legal/privacy
        - button "Accept" [ref=e289] [cursor=pointer]
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
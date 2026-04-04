# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: legal.spec.ts >> Legal Pages >> Complaints Process page loads and shows h1
- Location: e2e/legal.spec.ts:14:5

# Error details

```
Error: expect(locator).toBeVisible() failed

Locator: locator('text=Complaints Process')
Expected: visible
Error: strict mode violation: locator('text=Complaints Process') resolved to 3 elements:
    1) <p class="text-slate-400 leading-relaxed mb-4">This complaints process covers:</p> aka getByText('This complaints process covers:')
    2) <p class="text-slate-400 leading-relaxed mb-4">9.1. We may update this complaints process from t…</p> aka getByText('9.1. We may update this')
    3) <p class="text-slate-400 leading-relaxed mb-4">For any questions about this complaints process:</p> aka getByText('For any questions about this')

Call log:
  - Expect "toBeVisible" with timeout 5000ms
  - waiting for locator('text=Complaints Process')

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
          - heading "NoZar — Complaints & Dispute Resolution Process" [level=1] [ref=e21]
          - paragraph [ref=e22]:
            - strong [ref=e23]: "Effective Date:"
            - text: "[Launch Date]"
            - strong [ref=e24]: "Last Updated:"
            - text: "[Date]"
          - heading "1. Introduction" [level=2] [ref=e25]
          - paragraph [ref=e26]: At NoZar, we take every complaint seriously. We understand that things don't always go smoothly — whether it's a trade that didn't work out, a concern about another user, or an issue with the Platform itself. We're committed to handling your complaints fairly, transparently, and as quickly as possible.
          - paragraph [ref=e27]: This document sets out how to lodge a complaint, what happens after you do, and where to turn if you feel your complaint hasn't been resolved to your satisfaction. This process complies with the Consumer Protection Act 68 of 2008 ("CPA") and the Protection of Personal Information Act 4 of 2013 ("POPIA").
          - heading "2. Scope" [level=2] [ref=e28]
          - paragraph [ref=e29]: "This complaints process covers:"
          - list [ref=e30]:
            - listitem [ref=e31]:
              - generic [ref=e32]: •
              - generic [ref=e33]:
                - strong [ref=e34]: Trade disputes
                - text: — disagreements between Users about a Barter Transaction (item condition, non-delivery, misrepresentation).
            - listitem [ref=e35]:
              - generic [ref=e36]: •
              - generic [ref=e37]:
                - strong [ref=e38]: Platform issues
                - text: — bugs, downtime, feature malfunctions, or errors affecting your experience.
            - listitem [ref=e39]:
              - generic [ref=e40]: •
              - generic [ref=e41]:
                - strong [ref=e42]: Safety concerns
                - text: — reports of unsafe behaviour, harassment, or threats during meetups or in-app communication.
            - listitem [ref=e43]:
              - generic [ref=e44]: •
              - generic [ref=e45]:
                - strong [ref=e46]: Account issues
                - text: — incorrect suspensions, verification problems, account access difficulties.
            - listitem [ref=e47]:
              - generic [ref=e48]: •
              - generic [ref=e49]:
                - strong [ref=e50]: Billing & subscriptions
                - text: — payment errors, subscription disputes, boost token issues.
            - listitem [ref=e51]:
              - generic [ref=e52]: •
              - generic [ref=e53]:
                - strong [ref=e54]: Privacy & data
                - text: — concerns about how your personal information is collected, used, or shared (POPIA complaints).
            - listitem [ref=e55]:
              - generic [ref=e56]: •
              - generic [ref=e57]:
                - strong [ref=e58]: Content & listings
                - text: — disputes over removed listings, moderation decisions, or intellectual property claims.
          - heading "3. How to File a Complaint" [level=2] [ref=e59]
          - paragraph [ref=e60]: "You can lodge a complaint through any of the following channels:"
          - heading "3.1. In-App (Recommended)" [level=3] [ref=e61]
          - paragraph [ref=e62]:
            - text: Navigate to
            - strong [ref=e63]: Settings → Help → File a Complaint
            - text: . This is the fastest way to reach us — your account details are automatically attached, and you can upload evidence directly.
          - heading "3.2. Email" [level=3] [ref=e64]
          - paragraph [ref=e65]:
            - text: Send your complaint to
            - strong [ref=e66]: complaints@bartersa.co.za
            - text: . We monitor this inbox during business hours (Monday to Friday, 08:00–17:00 SAST).
          - heading "3.3. What to Include" [level=3] [ref=e67]
          - paragraph [ref=e68]: "To help us investigate your complaint efficiently, please provide:"
          - list [ref=e69]:
            - listitem [ref=e70]:
              - generic [ref=e71]: •
              - generic [ref=e72]:
                - strong [ref=e73]: Your account details
                - text: — your username or the email address linked to your account.
            - listitem [ref=e74]:
              - generic [ref=e75]: •
              - generic [ref=e76]:
                - strong [ref=e77]: A clear description
                - text: — what happened, when it happened, and who was involved.
            - listitem [ref=e78]:
              - generic [ref=e79]: •
              - generic [ref=e80]:
                - strong [ref=e81]: Trade ID
                - text: (if applicable) — found in your trade history under the specific transaction.
            - listitem [ref=e82]:
              - generic [ref=e83]: •
              - generic [ref=e84]:
                - strong [ref=e85]: Supporting evidence
                - text: — screenshots, photos of items received, chat logs, or any other relevant documentation.
            - listitem [ref=e86]:
              - generic [ref=e87]: •
              - generic [ref=e88]:
                - strong [ref=e89]: Desired outcome
                - text: — let us know what resolution you're hoping for.
          - paragraph [ref=e90]: Anonymous complaints are accepted, but please note that this may limit our ability to investigate fully or provide you with a personal response.
          - heading "4. Our Complaint Handling Process" [level=2] [ref=e91]
          - 'heading "Step 1: Acknowledgment (within 48 hours)" [level=3] [ref=e92]'
          - paragraph [ref=e93]:
            - text: We will acknowledge receipt of your complaint within
            - strong [ref=e94]: 48 hours
            - text: (excluding weekends and public holidays). You'll receive a reference number to track the progress of your case.
          - 'heading "Step 2: Investigation (5–10 business days)" [level=3] [ref=e95]'
          - paragraph [ref=e96]: "A member of our support team will review your complaint. Depending on the nature of the issue, this may involve:"
          - list [ref=e97]:
            - listitem [ref=e98]:
              - generic [ref=e99]: •
              - generic [ref=e100]: Reviewing trade history, chat logs, and platform data.
            - listitem [ref=e101]:
              - generic [ref=e102]: •
              - generic [ref=e103]: Contacting the other party involved (for trade disputes).
            - listitem [ref=e104]:
              - generic [ref=e105]: •
              - generic [ref=e106]: Consulting with our technical, safety, or legal teams.
            - listitem [ref=e107]:
              - generic [ref=e108]: •
              - generic [ref=e109]: Requesting additional information from you.
          - paragraph [ref=e110]: If we need more time, we'll let you know and provide an updated timeline.
          - 'heading "Step 3: Resolution" [level=3] [ref=e111]'
          - paragraph [ref=e112]: "Once our investigation is complete, we'll notify you of the outcome. This notification will include:"
          - list [ref=e113]:
            - listitem [ref=e114]:
              - generic [ref=e115]: •
              - generic [ref=e116]: A summary of our findings.
            - listitem [ref=e117]:
              - generic [ref=e118]: •
              - generic [ref=e119]: The action we've taken (or why no action was taken).
            - listitem [ref=e120]:
              - generic [ref=e121]: •
              - generic [ref=e122]: Any remedies or next steps available to you.
          - 'heading "Step 4: Appeal" [level=3] [ref=e123]'
          - paragraph [ref=e124]:
            - text: If you're not satisfied with the outcome, you may request an
            - strong [ref=e125]: appeal
            - text: within
            - strong [ref=e126]: 14 calendar days
            - text: of receiving the resolution. Appeals are escalated to a senior member of our team who was not involved in the original investigation.
          - paragraph [ref=e127]:
            - text: We will respond to your appeal within
            - strong [ref=e128]: 10 business days
            - text: .
          - heading "5. Trade Dispute Resolution" [level=2] [ref=e129]
          - paragraph [ref=e130]: "Trade disputes between Users follow a structured mediation process:"
          - heading "5.1. Internal Mediation" [level=3] [ref=e131]
          - paragraph [ref=e132]: When a trade dispute is raised, we'll facilitate communication between both parties and attempt to reach a fair resolution. Both parties will have the opportunity to present their side.
          - heading "5.2. Platform Review" [level=3] [ref=e133]
          - paragraph [ref=e134]: "If mediation does not resolve the dispute, our team will conduct an independent review. We may consider:"
          - list [ref=e135]:
            - listitem [ref=e136]:
              - generic [ref=e137]: •
              - generic [ref=e138]: The original Listing description, photos, and Estimated Value.
            - listitem [ref=e139]:
              - generic [ref=e140]: •
              - generic [ref=e141]: Chat logs between the parties.
            - listitem [ref=e142]:
              - generic [ref=e143]: •
              - generic [ref=e144]: Trade agreement details and confirmation records.
            - listitem [ref=e145]:
              - generic [ref=e146]: •
              - generic [ref=e147]: User ratings and trade history.
            - listitem [ref=e148]:
              - generic [ref=e149]: •
              - generic [ref=e150]: Any evidence submitted by either party.
          - heading "5.3. Possible Outcomes" [level=3] [ref=e151]
          - paragraph [ref=e152]: "After review, we may take one or more of the following actions:"
          - list [ref=e153]:
            - listitem [ref=e154]:
              - generic [ref=e155]: •
              - generic [ref=e156]:
                - strong [ref=e157]: Trade reversal
                - text: — where both parties are instructed to return exchanged items, and the trade is marked as reversed on both profiles.
            - listitem [ref=e158]:
              - generic [ref=e159]: •
              - generic [ref=e160]:
                - strong [ref=e161]: Account action
                - text: — warnings, temporary suspensions, or permanent bans for Users found to have acted in bad faith.
            - listitem [ref=e162]:
              - generic [ref=e163]: •
              - generic [ref=e164]:
                - strong [ref=e165]: Rating adjustment
                - text: — removal or amendment of unfair ratings linked to the disputed trade.
            - listitem [ref=e166]:
              - generic [ref=e167]: •
              - generic [ref=e168]:
                - strong [ref=e169]: No action
                - text: — where evidence is inconclusive or both parties bear shared responsibility.
          - heading "5.4. Timeline" [level=3] [ref=e170]
          - paragraph [ref=e171]:
            - text: We aim to resolve all trade disputes within
            - strong [ref=e172]: 30 calendar days
            - text: of the complaint being filed. Complex cases involving multiple parties or external verification may take longer — we'll keep you informed throughout.
          - heading "6. Escalation to External Bodies" [level=2] [ref=e173]
          - paragraph [ref=e174]: "If you've exhausted our internal process and remain unsatisfied, you have the right to escalate your complaint to the following external bodies:"
          - heading "6.1. National Consumer Commission (NCC)" [level=3] [ref=e175]
          - paragraph [ref=e176]: The NCC enforces the Consumer Protection Act and accepts complaints about unfair business practices.
          - list [ref=e177]:
            - listitem [ref=e178]:
              - generic [ref=e179]: •
              - generic [ref=e180]:
                - strong [ref=e181]: "Website:"
                - link "www.thencc.gov.za" [ref=e182] [cursor=pointer]:
                  - /url: https://www.thencc.gov.za
            - listitem [ref=e183]:
              - generic [ref=e184]: •
              - generic [ref=e185]:
                - strong [ref=e186]: "Tel:"
                - text: 012 428 7000
            - listitem [ref=e187]:
              - generic [ref=e188]: •
              - generic [ref=e189]:
                - strong [ref=e190]: "Email:"
                - text: complaints@thencc.org.za
            - listitem [ref=e191]:
              - generic [ref=e192]: •
              - generic [ref=e193]:
                - strong [ref=e194]: "Physical Address:"
                - text: SALU Building, 316 Thabo Sehume Street, Pretoria, 0002
          - heading "6.2. Consumer Goods and Services Ombud (CGSO)" [level=3] [ref=e195]
          - paragraph [ref=e196]: The CGSO provides free, independent dispute resolution for consumer complaints about goods and services.
          - list [ref=e197]:
            - listitem [ref=e198]:
              - generic [ref=e199]: •
              - generic [ref=e200]:
                - strong [ref=e201]: "Website:"
                - link "www.cgso.org.za" [ref=e202] [cursor=pointer]:
                  - /url: https://www.cgso.org.za
            - listitem [ref=e203]:
              - generic [ref=e204]: •
              - generic [ref=e205]:
                - strong [ref=e206]: "Tel:"
                - text: 0860 000 272
            - listitem [ref=e207]:
              - generic [ref=e208]: •
              - generic [ref=e209]:
                - strong [ref=e210]: "Email:"
                - text: info@cgso.org.za
            - listitem [ref=e211]:
              - generic [ref=e212]: •
              - generic [ref=e213]:
                - strong [ref=e214]: "Physical Address:"
                - text: 292 Surrey Avenue, Ferndale, Randburg, 2194
          - heading "6.3. Information Regulator (POPIA Complaints)" [level=3] [ref=e215]
          - paragraph [ref=e216]: For complaints about how we handle your personal information, you may approach the Information Regulator.
          - list [ref=e217]:
            - listitem [ref=e218]:
              - generic [ref=e219]: •
              - generic [ref=e220]:
                - strong [ref=e221]: "Website:"
                - link "www.justice.gov.za/inforeg" [ref=e222] [cursor=pointer]:
                  - /url: https://www.justice.gov.za/inforeg
            - listitem [ref=e223]:
              - generic [ref=e224]: •
              - generic [ref=e225]:
                - strong [ref=e226]: "Tel:"
                - text: 012 406 4818
            - listitem [ref=e227]:
              - generic [ref=e228]: •
              - generic [ref=e229]:
                - strong [ref=e230]: "Email:"
                - text: complaints.IR@justice.gov.za
            - listitem [ref=e231]:
              - generic [ref=e232]: •
              - generic [ref=e233]:
                - strong [ref=e234]: "Physical Address:"
                - text: JD House, 27 Stiemens Street, Braamfontein, Johannesburg, 2001
          - paragraph [ref=e235]: We encourage you to use our internal process first, but you are not required to do so before approaching an external body.
          - heading "7. Information Officer" [level=2] [ref=e236]
          - paragraph [ref=e237]: Our Information Officer is responsible for handling POPIA-related complaints and ensuring compliance with data protection legislation.
          - list [ref=e238]:
            - listitem [ref=e239]:
              - generic [ref=e240]: •
              - generic [ref=e241]:
                - strong [ref=e242]: "Name:"
                - text: "[Name]"
            - listitem [ref=e243]:
              - generic [ref=e244]: •
              - generic [ref=e245]:
                - strong [ref=e246]: "Email:"
                - text: privacy@bartersa.co.za
            - listitem [ref=e247]:
              - generic [ref=e248]: •
              - generic [ref=e249]:
                - strong [ref=e250]: "Responsibilities:"
                - text: Receiving and responding to data access requests, POPIA complaints, and queries about how NoZar processes personal information.
          - paragraph [ref=e251]: If your complaint relates to your personal data — including access requests, correction, deletion, or objection to processing — please direct it to our Information Officer.
          - heading "8. Record Keeping" [level=2] [ref=e252]
          - paragraph [ref=e253]: 8.1. All complaints are logged in our internal complaint management system, including the date received, nature of the complaint, actions taken, and outcome.
          - paragraph [ref=e254]:
            - text: 8.2. Complaint records are retained for a minimum of
            - strong [ref=e255]: 3 years
            - text: from the date of resolution, in compliance with the CPA.
          - paragraph [ref=e256]: 8.3. These records may be used to identify patterns, improve our Platform, and demonstrate compliance with regulatory requirements.
          - paragraph [ref=e257]: 8.4. Anonymous complaints are logged and investigated where possible, but our ability to follow up may be limited without your contact details.
          - heading "9. Policy Updates" [level=2] [ref=e258]
          - paragraph [ref=e259]: 9.1. We may update this complaints process from time to time to reflect changes in law, regulation, or our internal practices.
          - paragraph [ref=e260]: 9.2. Material changes will be communicated to Users via email and/or in-app notification.
          - paragraph [ref=e261]:
            - text: 9.3. The latest version of this document is always available at
            - strong [ref=e262]: /legal/complaints
            - text: on the Platform.
          - heading "10. Contact" [level=2] [ref=e263]
          - paragraph [ref=e264]: "For any questions about this complaints process:"
          - paragraph [ref=e265]: "[Your Legal Entity Name] Information Officer: [Name] Email: complaints@bartersa.co.za Physical Address: [SA address required by ECTA] CIPC Registration: [Number]"
    - contentinfo [ref=e266]:
      - generic [ref=e267]:
        - paragraph [ref=e268]: © 2025 NoZar. All rights reserved.
        - navigation [ref=e269]:
          - link "Terms" [ref=e270] [cursor=pointer]:
            - /url: /legal/terms
          - link "Privacy" [ref=e271] [cursor=pointer]:
            - /url: /legal/privacy
          - link "Guidelines" [ref=e272] [cursor=pointer]:
            - /url: /legal/community-guidelines
          - link "Complaints" [ref=e273] [cursor=pointer]:
            - /url: /legal/complaints
  - banner "Cookie consent" [ref=e274]:
    - generic [ref=e275]:
      - paragraph [ref=e276]:
        - text: We use essential cookies to keep you signed in and improve your experience. No tracking cookies are used. Read our
        - link "Privacy Policy" [ref=e277] [cursor=pointer]:
          - /url: /legal/privacy
        - text: for details.
      - generic [ref=e278]:
        - link "Learn More" [ref=e279] [cursor=pointer]:
          - /url: /legal/privacy
        - button "Accept" [ref=e280] [cursor=pointer]
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
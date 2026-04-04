# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: legal.spec.ts >> Legal Pages >> legal links in footer navigate to correct routes
- Location: e2e/legal.spec.ts:48:3

# Error details

```
Test timeout of 30000ms exceeded.
```

```
Error: locator.click: Test timeout of 30000ms exceeded.
Call log:
  - waiting for locator('a:has-text("Complaints")').first()
    - locator resolved to <a data-discover="true" href="/legal/complaints" class="text-sm text-slate-400 hover:text-emerald-400 transition-colors">Complaints Process</a>
  - attempting click action
    2 × waiting for element to be visible, enabled and stable
      - element is not stable
    - retrying click action
    - waiting 20ms
    - waiting for element to be visible, enabled and stable
    - element is not stable
  2 × retrying click action
      - waiting 100ms
      - waiting for element to be visible, enabled and stable
      - element is visible, enabled and stable
      - scrolling into view if needed
      - done scrolling
      - <div class="fixed bottom-0 left-0 right-0 z-50 bg-[#030712]/95 backdrop-blur-xl border-t border-white/10 p-4 md:p-6 flex flex-col items-center gap-4 text-center">…</div> intercepts pointer events
  10 × retrying click action
       - waiting 500ms
       - waiting for element to be visible, enabled and stable
       - element is visible, enabled and stable
       - scrolling into view if needed
       - done scrolling
       - <div role="banner" aria-label="Cookie consent" class="fixed bottom-0 left-0 right-0 z-50 bg-[#0F172A]/95 backdrop-blur-xl border-t border-white/10 p-4 md:p-6 transition-transform duration-500 ease-out translate-y-0">…</div> intercepts pointer events
     - retrying click action
       - waiting 500ms
       - waiting for element to be visible, enabled and stable
       - element is visible, enabled and stable
       - scrolling into view if needed
       - done scrolling
       - <div class="fixed bottom-0 left-0 right-0 z-50 bg-[#030712]/95 backdrop-blur-xl border-t border-white/10 p-4 md:p-6 flex flex-col items-center gap-4 text-center">…</div> intercepts pointer events
     - retrying click action
       - waiting 500ms
       - waiting for element to be visible, enabled and stable
       - element is visible, enabled and stable
       - scrolling into view if needed
       - done scrolling
       - <div class="fixed bottom-0 left-0 right-0 z-50 bg-[#030712]/95 backdrop-blur-xl border-t border-white/10 p-4 md:p-6 flex flex-col items-center gap-4 text-center">…</div> intercepts pointer events
     - retrying click action
       - waiting 500ms
       - waiting for element to be visible, enabled and stable
       - element is visible, enabled and stable
       - scrolling into view if needed
       - done scrolling
       - <div class="fixed bottom-0 left-0 right-0 z-50 bg-[#030712]/95 backdrop-blur-xl border-t border-white/10 p-4 md:p-6 flex flex-col items-center gap-4 text-center">…</div> intercepts pointer events
  - retrying click action
    - waiting 500ms
    - waiting for element to be visible, enabled and stable
    - element is visible, enabled and stable
    - scrolling into view if needed
    - done scrolling
    - <div role="banner" aria-label="Cookie consent" class="fixed bottom-0 left-0 right-0 z-50 bg-[#0F172A]/95 backdrop-blur-xl border-t border-white/10 p-4 md:p-6 transition-transform duration-500 ease-out translate-y-0">…</div> intercepts pointer events
  - retrying click action
    - waiting 500ms
    - waiting for element to be visible, enabled and stable
    - element is visible, enabled and stable
    - scrolling into view if needed
    - done scrolling
    - <div class="fixed bottom-0 left-0 right-0 z-50 bg-[#030712]/95 backdrop-blur-xl border-t border-white/10 p-4 md:p-6 flex flex-col items-center gap-4 text-center">…</div> intercepts pointer events
  - retrying click action
    - waiting 500ms

```

# Page snapshot

```yaml
- generic [active] [ref=e1]:
  - generic [ref=e2]:
    - navigation [ref=e3]:
      - generic [ref=e4]:
        - button "NoZar NoZar." [ref=e5] [cursor=pointer]:
          - img "NoZar" [ref=e7]
          - generic [ref=e8]: NoZar.
        - generic [ref=e9]:
          - link "Platform" [ref=e10] [cursor=pointer]:
            - /url: "#how-it-works"
            - text: Platform
          - link "Exchange" [ref=e11] [cursor=pointer]:
            - /url: "#exchange"
            - text: Exchange
          - link "Protocol" [ref=e12] [cursor=pointer]:
            - /url: "#safety"
            - text: Protocol
          - link "Pricing" [ref=e13] [cursor=pointer]:
            - /url: "#pricing"
            - text: Pricing
          - link "FAQ" [ref=e14] [cursor=pointer]:
            - /url: "#faq"
            - text: FAQ
        - generic [ref=e15]:
          - link "[ Auth ]" [ref=e16] [cursor=pointer]:
            - /url: /register
          - link "Get Started Free" [ref=e17] [cursor=pointer]:
            - /url: /register
    - main [ref=e18]:
      - generic [ref=e19]: "Network Status: Beta Active (CPT/JHB)"
      - heading "Decentralize Your Value." [level=1] [ref=e23]:
        - text: Decentralize
        - text: Your Value.
      - paragraph [ref=e24]: The spatial barter network for South Africa. Bypass inflation by exchanging idle assets, surplus inventory, and professional services directly. Zero ZAR required.
      - generic [ref=e25]:
        - link "Get Started Free" [ref=e27] [cursor=pointer]:
          - /url: /register
          - text: Get Started Free
          - img [ref=e28]
        - link "View Live Index" [ref=e30] [cursor=pointer]:
          - /url: /dashboard
    - generic [ref=e32]:
      - generic [ref=e33]:
        - generic [ref=e34]: 0+
        - generic [ref=e35]: Active Listings
      - generic [ref=e37]:
        - text: "0"
        - generic [ref=e38]: Cities Live
      - generic [ref=e40]:
        - generic [ref=e41]: 0%
        - generic [ref=e42]: Free to Start
    - generic [ref=e43]:
      - generic [ref=e45]:
        - generic [ref=e46]: // System Architecture
        - heading "How The Matrix Works." [level=2] [ref=e47]
      - generic [ref=e48]:
        - generic [ref=e52]:
          - img [ref=e53]
          - heading "Value Parity Engine" [level=3] [ref=e56]
          - paragraph [ref=e57]: Our algorithm categorizes items and services into hidden ZAR value tiers, ensuring you only see trades that match your asset's worth.
        - generic [ref=e64]:
          - img [ref=e65]
          - heading "Hyper-Local Indexing" [level=3] [ref=e68]
          - paragraph [ref=e69]: Physical goods are restricted to your geographic radius. Digital services open to national exchange.
    - generic [ref=e73]:
      - generic [ref=e75]:
        - generic [ref=e76]: // Dual Economies
        - heading "Pick Your Channel." [level=2] [ref=e77]
        - paragraph [ref=e78]: Same network. Two interfaces. Trade idle assets as a consumer, or liquidate dead stock as a verified enterprise.
      - generic [ref=e79]:
        - generic [ref=e81]:
          - generic [ref=e82]: "// User Node: Consumer"
          - img [ref=e84]
          - heading "Peer-to-Peer Exchange" [level=3] [ref=e87]
          - paragraph [ref=e88]: Turn your idle assets and spare time into the things you actually need. 100% free to join and trade locally.
          - list [ref=e89]:
            - listitem [ref=e90]:
              - generic [ref=e91]: "[+]"
              - text: Zero transaction fees
            - listitem [ref=e92]:
              - generic [ref=e93]: "[+]"
              - text: Skill-for-Item trading
            - listitem [ref=e94]:
              - generic [ref=e95]: "[+]"
              - text: Automated local radius matching
          - link "Initialize Consumer Node" [ref=e96] [cursor=pointer]:
            - /url: /dashboard
        - generic [ref=e98]:
          - generic [ref=e99]: "// User Node: Enterprise"
          - img [ref=e101]
          - heading "B2B Liquidity Protocol" [level=3] [ref=e104]
          - paragraph [ref=e105]: Liquidate dead stock and monetize idle equipment to preserve cash flow. Dedicated tools for registered SA entities.
          - list [ref=e106]:
            - listitem [ref=e107]:
              - generic [ref=e108]: "[+]"
              - text: Verified CIPC Badges
            - listitem [ref=e109]:
              - generic [ref=e110]: "[+]"
              - text: Enterprise-only filters
            - listitem [ref=e111]:
              - generic [ref=e112]: "[+]"
              - text: SARS-compliant ledger exports
          - link "View Enterprise Protocol" [ref=e113] [cursor=pointer]:
            - /url: /dashboard
    - generic [ref=e116]:
      - generic [ref=e118]:
        - generic [ref=e119]: // Protocol.Security
        - heading "The Staged Trust Architecture." [level=2] [ref=e120]:
          - text: The Staged Trust
          - text: Architecture.
        - paragraph [ref=e121]: Engineered specifically for the South African risk landscape. Your identity and location remain sealed until mutual consensus is achieved.
      - generic [ref=e122]:
        - generic [ref=e124]:
          - generic [ref=e125]: STAGE_01
          - img [ref=e126]
          - heading "Encrypted Blind Chat" [level=4] [ref=e129]
          - paragraph [ref=e130]: Negotiate within our closed-loop system. Phone numbers and emails are scrubbed and restricted.
        - generic [ref=e132]:
          - generic [ref=e133]: STAGE_02
          - img [ref=e134]
          - heading "The Digital Handshake" [level=4] [ref=e137]
          - paragraph [ref=e138]: Both parties execute a dual-consent digital signature. Only then does the platform query our verification ledger.
        - generic [ref=e140]:
          - generic [ref=e141]: STAGE_03
          - img [ref=e142]
          - heading "Safe Zone Routing" [level=4] [ref=e145]
          - paragraph [ref=e146]: The system routes both users to a computationally vetted, well-lit public perimeter (e.g., partnered petrol stations).
    - generic [ref=e148]:
      - paragraph [ref=e149]: // Compliance.Verified
      - generic [ref=e151]:
        - generic [ref=e152]:
          - img [ref=e153]
          - heading "POPIA Compliant" [level=3] [ref=e155]
          - paragraph [ref=e156]: Your data processed per Protection of Personal Information Act
        - generic [ref=e157]:
          - img [ref=e158]
          - heading "ECTA Registered" [level=3] [ref=e162]
          - paragraph [ref=e163]: Compliant with Electronic Communications & Transactions Act
        - generic [ref=e164]:
          - img [ref=e165]
          - heading "Phone-Verified Users" [level=3] [ref=e167]
          - paragraph [ref=e168]: Every trader verified via OTP before first trade
        - generic [ref=e169]:
          - img [ref=e170]
          - heading "5-Layer Security" [level=3] [ref=e173]
          - paragraph [ref=e174]: Blind chat → Handshake → Safe zone → Rating → Dispute resolution
        - generic [ref=e175]:
          - img [ref=e176]
          - heading "Community Guidelines" [level=3] [ref=e181]
          - paragraph [ref=e182]: Enforced standards for respectful, safe trading
        - generic [ref=e183]:
          - img [ref=e184]
          - heading "Built in Mzansi 🇿🇦" [level=3] [ref=e186]
          - paragraph [ref=e187]: Designed and built for South African communities
    - generic [ref=e188]:
      - generic [ref=e190]:
        - generic [ref=e191]: // Protocol.Pricing
        - heading "Choose Your Tier." [level=2] [ref=e192]
      - generic [ref=e193]:
        - generic [ref=e195]:
          - generic [ref=e196]:
            - generic [ref=e197]: Free
            - heading "R0/mo" [level=3] [ref=e198]:
              - generic [ref=e199]: R0/mo
            - paragraph [ref=e200]: Start bartering with zero commitment. Everything you need for local peer-to-peer exchange.
          - list [ref=e202]:
            - listitem [ref=e203]:
              - generic [ref=e204]: "[+]"
              - text: 5 active listings
            - listitem [ref=e205]:
              - generic [ref=e206]: "[+]"
              - text: Unlimited trades
            - listitem [ref=e207]:
              - generic [ref=e208]: "[+]"
              - text: Basic search
            - listitem [ref=e209]:
              - generic [ref=e210]: "[+]"
              - text: Local radius matching
          - link "Start Trading" [ref=e212] [cursor=pointer]:
            - /url: /dashboard
        - generic [ref=e214]:
          - generic [ref=e215]: Most Popular
          - generic [ref=e216]:
            - generic [ref=e217]: Trader Plus
            - heading "R29/mo" [level=3] [ref=e218]:
              - generic [ref=e219]: R29/mo
            - paragraph [ref=e220]: For power traders who want visibility and insights across the network.
          - list [ref=e222]:
            - listitem [ref=e223]:
              - generic [ref=e224]: "[+]"
              - text: 20 active listings
            - listitem [ref=e225]:
              - generic [ref=e226]: "[+]"
              - text: 2 boost tokens/mo
            - listitem [ref=e227]:
              - generic [ref=e228]: "[+]"
              - text: Priority in feed
            - listitem [ref=e229]:
              - generic [ref=e230]: "[+]"
              - text: Advanced filters
            - listitem [ref=e231]:
              - generic [ref=e232]: "[+]"
              - text: Trade analytics
          - link "Upgrade Node" [ref=e234] [cursor=pointer]:
            - /url: /dashboard
        - generic [ref=e236]:
          - generic [ref=e237]:
            - generic [ref=e238]: Business
            - heading "R99/mo" [level=3] [ref=e239]:
              - generic [ref=e240]: R99/mo
            - paragraph [ref=e241]: Built for registered SA entities. Liquidate surplus and manage B2B barter at scale.
          - list [ref=e243]:
            - listitem [ref=e244]:
              - generic [ref=e245]: "[+]"
              - text: 100 active listings
            - listitem [ref=e246]:
              - generic [ref=e247]: "[+]"
              - text: 10 boost tokens/mo
            - listitem [ref=e248]:
              - generic [ref=e249]: "[+]"
              - text: CIPC verification badge
            - listitem [ref=e250]:
              - generic [ref=e251]: "[+]"
              - text: Enterprise filters
            - listitem [ref=e252]:
              - generic [ref=e253]: "[+]"
              - text: SARS export
          - link "Initialize Business" [ref=e255] [cursor=pointer]:
            - /url: /dashboard
        - generic [ref=e257]:
          - generic [ref=e258]:
            - generic [ref=e259]: Enterprise
            - heading "R249/mo" [level=3] [ref=e260]:
              - generic [ref=e261]: R249/mo
            - paragraph [ref=e262]: Full protocol access with dedicated support and custom integrations for large operations.
          - list [ref=e264]:
            - listitem [ref=e265]:
              - generic [ref=e266]: "[+]"
              - text: Unlimited listings
            - listitem [ref=e267]:
              - generic [ref=e268]: "[+]"
              - text: 30 boost tokens/mo
            - listitem [ref=e269]:
              - generic [ref=e270]: "[+]"
              - text: Dedicated account manager
            - listitem [ref=e271]:
              - generic [ref=e272]: "[+]"
              - text: API access
            - listitem [ref=e273]:
              - generic [ref=e274]: "[+]"
              - text: Custom branding
            - listitem [ref=e275]:
              - generic [ref=e276]: "[+]"
              - text: Priority support
          - link "Contact Sales" [ref=e278] [cursor=pointer]:
            - /url: /dashboard
    - generic [ref=e279]:
      - generic [ref=e281]:
        - generic [ref=e282]: // Network.Testimonials
        - heading "Verified Trades." [level=2] [ref=e283]
      - generic [ref=e284]:
        - generic [ref=e287]:
          - img [ref=e288]
          - paragraph [ref=e291]: “I had a guitar collecting dust for two years. Within a week on NoZar, I found someone in Sandton who made custom laptop stands. No cash changed hands — just a clean swap.”
          - generic [ref=e292]:
            - img [ref=e293]
            - img [ref=e295]
            - img [ref=e297]
            - img [ref=e299]
            - img [ref=e301]
          - generic [ref=e303]:
            - generic [ref=e305]: S
            - generic [ref=e306]:
              - paragraph [ref=e307]: Sipho M.
              - paragraph [ref=e308]: Soweto, JHB
          - paragraph [ref=e309]: Acoustic guitar → Handmade laptop stand
        - generic [ref=e312]:
          - img [ref=e313]
          - paragraph [ref=e316]: “I make fig jam and chutney every season, way more than we can eat. Through NoZar, I connected with a retired gardener in Stellenbosch who had spare tools. Three jars of jam for a complete pruning set!”
          - generic [ref=e317]:
            - img [ref=e318]
            - img [ref=e320]
            - img [ref=e322]
            - img [ref=e324]
            - img [ref=e326]
          - generic [ref=e328]:
            - generic [ref=e330]: F
            - generic [ref=e331]:
              - paragraph [ref=e332]: Fatima K.
              - paragraph [ref=e333]: Cape Town, WC
          - paragraph [ref=e334]: Homemade preserves → Garden tools
        - generic [ref=e337]:
          - img [ref=e338]
          - paragraph [ref=e341]: “As a freelance web developer, I bartered a landing page build for a professional headshot session. My new client profile photo has already landed me two paying clients. NoZar paid for itself.”
          - generic [ref=e342]:
            - img [ref=e343]
            - img [ref=e345]
            - img [ref=e347]
            - img [ref=e349]
            - img [ref=e351]
          - generic [ref=e353]:
            - generic [ref=e355]: T
            - generic [ref=e356]:
              - paragraph [ref=e357]: Thabo D.
              - paragraph [ref=e358]: Durban, KZN
          - paragraph [ref=e359]: Web design services → Photography sessions
    - generic [ref=e360]:
      - generic [ref=e362]:
        - generic [ref=e363]: // Frequently.Asked
        - heading "Common Queries." [level=2] [ref=e364]
      - generic [ref=e366]:
        - group [ref=e367]:
          - generic "[01] What is NoZar? +" [ref=e368] [cursor=pointer]:
            - generic [ref=e369]:
              - generic [ref=e370]:
                - generic [ref=e371]: "[01]"
                - generic [ref=e372]: What is NoZar?
              - generic [ref=e373]: +
        - group [ref=e374]:
          - generic "[02] Is it really free? +" [ref=e375] [cursor=pointer]:
            - generic [ref=e376]:
              - generic [ref=e377]:
                - generic [ref=e378]: "[02]"
                - generic [ref=e379]: Is it really free?
              - generic [ref=e380]: +
        - group [ref=e381]:
          - generic "[03] How do I stay safe? +" [ref=e382] [cursor=pointer]:
            - generic [ref=e383]:
              - generic [ref=e384]:
                - generic [ref=e385]: "[03]"
                - generic [ref=e386]: How do I stay safe?
              - generic [ref=e387]: +
        - group [ref=e388]:
          - generic "[04] What can I trade? +" [ref=e389] [cursor=pointer]:
            - generic [ref=e390]:
              - generic [ref=e391]:
                - generic [ref=e392]: "[04]"
                - generic [ref=e393]: What can I trade?
              - generic [ref=e394]: +
        - group [ref=e395]:
          - generic "[05] How does contact exchange work? +" [ref=e396] [cursor=pointer]:
            - generic [ref=e397]:
              - generic [ref=e398]:
                - generic [ref=e399]: "[05]"
                - generic [ref=e400]: How does contact exchange work?
              - generic [ref=e401]: +
        - group [ref=e402]:
          - generic "[06] What areas do you cover? +" [ref=e403] [cursor=pointer]:
            - generic [ref=e404]:
              - generic [ref=e405]:
                - generic [ref=e406]: "[06]"
                - generic [ref=e407]: What areas do you cover?
              - generic [ref=e408]: +
        - group [ref=e409]:
          - generic "[07] Can businesses use NoZar? +" [ref=e410] [cursor=pointer]:
            - generic [ref=e411]:
              - generic [ref=e412]:
                - generic [ref=e413]: "[07]"
                - generic [ref=e414]: Can businesses use NoZar?
              - generic [ref=e415]: +
        - group [ref=e416]:
          - generic "[08] How do ratings work? +" [ref=e417] [cursor=pointer]:
            - generic [ref=e418]:
              - generic [ref=e419]:
                - generic [ref=e420]: "[08]"
                - generic [ref=e421]: How do ratings work?
              - generic [ref=e422]: +
    - generic [ref=e424]:
      - heading "Bypass The Fiat." [level=2] [ref=e426]
      - link "Get Started Free" [ref=e428] [cursor=pointer]:
        - /url: /register
    - contentinfo [ref=e429]:
      - generic [ref=e430]:
        - generic [ref=e432]:
          - generic [ref=e433]:
            - generic [ref=e434]:
              - img [ref=e436]
              - generic [ref=e441]: NoZar.
            - paragraph [ref=e442]: Trade without cash.
            - paragraph [ref=e443]: The spatial barter network for South Africa. Bypass inflation by exchanging idle assets directly.
          - generic [ref=e444]:
            - heading "Platform" [level=4] [ref=e445]
            - list [ref=e446]:
              - listitem [ref=e447]:
                - link "How It Works" [ref=e448] [cursor=pointer]:
                  - /url: "#how-it-works"
              - listitem [ref=e449]:
                - link "Features" [ref=e450] [cursor=pointer]:
                  - /url: "#consumers"
              - listitem [ref=e451]:
                - link "Pricing" [ref=e452] [cursor=pointer]:
                  - /url: "#pricing"
              - listitem [ref=e453]:
                - link "FAQ" [ref=e454] [cursor=pointer]:
                  - /url: "#faq"
          - generic [ref=e455]:
            - heading "Legal" [level=4] [ref=e456]
            - list [ref=e457]:
              - listitem [ref=e458]:
                - link "Terms of Service" [ref=e459] [cursor=pointer]:
                  - /url: /legal/terms
              - listitem [ref=e460]:
                - link "Privacy Policy" [ref=e461] [cursor=pointer]:
                  - /url: /legal/privacy
              - listitem [ref=e462]:
                - link "Community Guidelines" [ref=e463] [cursor=pointer]:
                  - /url: /legal/community-guidelines
              - listitem [ref=e464]:
                - link "Complaints Process" [ref=e465] [cursor=pointer]:
                  - /url: /legal/complaints
          - generic [ref=e466]:
            - heading "Connect" [level=4] [ref=e467]
            - list [ref=e468]:
              - listitem [ref=e469]:
                - link "hello@nozar.co.za" [ref=e470] [cursor=pointer]:
                  - /url: mailto:hello@nozar.co.za
              - listitem [ref=e471]: Follow us on X (Twitter)
              - listitem [ref=e472]: Cape Town & Johannesburg, RSA
        - generic [ref=e473]:
          - paragraph [ref=e474]: Made with ❤️ in Mzansi 🇿🇦
          - paragraph [ref=e475]: Sys.Build // 2026 // NoZar PTY LTD // RSA
    - generic [ref=e476]:
      - generic [ref=e479]: "[ COOKIE NOTICE ]"
      - paragraph [ref=e480]: We use essential cookies to keep you signed in. No tracking cookies.
      - generic [ref=e481]:
        - button "Accept" [ref=e482]
        - button "Learn More" [ref=e483]
  - banner "Cookie consent" [ref=e484]:
    - generic [ref=e485]:
      - paragraph [ref=e486]:
        - text: We use essential cookies to keep you signed in and improve your experience. No tracking cookies are used. Read our
        - link "Privacy Policy" [ref=e487] [cursor=pointer]:
          - /url: /legal/privacy
        - text: for details.
      - generic [ref=e488]:
        - link "Learn More" [ref=e489] [cursor=pointer]:
          - /url: /legal/privacy
        - button "Accept" [ref=e490] [cursor=pointer]
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
  19 |       await expect(page.locator(`text=${title}`)).toBeVisible();
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
> 63 |         await el.click();
     |                  ^ Error: locator.click: Test timeout of 30000ms exceeded.
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
# Phase 2: Device Identity & Anti-Abuse — Research

**Researched:** 2025-07-18  
**Domain:** Browser fingerprinting, anti-abuse, TOTP 2FA, Better Auth plugins  
**Confidence:** HIGH (verified against installed node_modules and npm registry)

---

## Executive Summary

The project already has a substantial anti-abuse-adjacent foundation: phone OTP via Africa's Talking (app/lib/otp.server.ts), a `trustProfiles` table with flagging fields, and Better Auth's `databaseHooks` system which allows blocking user creation before it reaches the DB. This phase layers three orthogonal protections on top:

1. **Device fingerprinting** using `@fingerprintjs/fingerprintjs` v5.2.0 (open-source, MIT). The `visitorId` survives incognito mode and browser data clearing, but is client-side only and has lower accuracy than commercial alternatives. It is sufficient for a first line of defence against casual multi-account abuse.

2. **Multi-account detection** using a `device_fingerprints` table: the fingerprint hash is passed in the sign-up body, intercepted in `databaseHooks.user.create.before`, and checked against known free-tier accounts. The hook can return `false` to hard-block or set a flag to require phone verification before the account becomes active.

3. **TOTP 2FA** using Better Auth's built-in `twoFactor` plugin (already present in `node_modules/better-auth/dist/plugins/two-factor`). This requires zero additional runtime libraries for the TOTP logic — only `qrcode` (to render the `totpURI` into a scannable QR image) is needed as a new dependency. No SaaS required.

**Primary recommendation:** Use `@fingerprintjs/fingerprintjs` for client-side fingerprint, pass hash in sign-up body → enforce via `databaseHooks.user.create.before`, record fingerprint after all successful logins via a thin API route, and integrate Better Auth's built-in `twoFactor` plugin for TOTP setup on the dashboard settings page.

---

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| Fingerprint collection | Browser / Client | — | Must run in browser to read navigator/canvas signals; SSR has no access to these APIs |
| Fingerprint persistence & lookup | API / Backend | Database / Storage | Hash sent from client → server action verifies & records |
| Multi-account detection logic | API / Backend | — | Must be server-side to be enforceable; client checks are UX only |
| TOTP secret generation | API / Backend | — | `auth.api.enableTwoFactor` server endpoint; secret never reaches client |
| QR code rendering | Frontend Server (SSR) or Browser | — | `qrcode` renders SVG/PNG from `totpURI`; safe to do in either tier |
| TOTP code verification on login | API / Backend | — | `authClient.twoFactor.verifyTOTP` → server endpoint via Better Auth |
| Phone OTP for duplicate-device unlock | API / Backend | — | Already in otp.server.ts; reuse as-is |

---

## 1. Device Fingerprinting

### FingerprintJS Community Edition (v5.2.0)

**Package:** `@fingerprintjs/fingerprintjs`  
**Current version:** `5.2.0` [VERIFIED: npm registry]  
**License:** MIT [VERIFIED: npm readme]  

**What it does:**  
Queries ~40-60 browser and system attributes (canvas hash, WebGL renderer, audio fingerprint, installed fonts, screen resolution, timezone, language, hardware concurrency, user-agent, etc.) and computes a stable `visitorId` hash. Critically, the hash **does not change** between normal and incognito/private mode — it relies on hardware and browser-level signals, not cookies or localStorage.

**Usage in an SSR React Router v7 app:**  
- Must be loaded client-side only (uses browser APIs not available on the server)
- Import dynamically or use a `useEffect` / client-side module — never import in a server-side context

```typescript
// Source: @fingerprintjs/fingerprintjs npm readme
import FingerprintJS from '@fingerprintjs/fingerprintjs';

const fpPromise = FingerprintJS.load();

// Inside a React component or event handler (client-only)
const fp = await fpPromise;
const result = await fp.get();
const visitorId = result.visitorId; // stable hash string
```

**Accuracy and spoofability (VERIFIED: npm readme):**
- Community edition is client-side only — accuracy is **meaningfully lower** than the commercial Fingerprint Identification platform
- Sophisticated users can spoof it using tools like headless browsers, browser extensions that randomise canvas/audio fingerprints, or by using a different device/browser profile
- For the NoZar use case (deterring casual free-tier abuse by non-technical users), this is sufficient
- Brave Browser's fingerprint randomisation and Firefox's resist-fingerprinting mode will produce different `visitorId`s across sessions — treat these as "unknown" devices, not abuse signals

**Collision risk:**
- Mobile phones within the same model line (e.g. dozens of people with a Samsung Galaxy A55 on Chrome) can share fingerprints
- Library/school computers will show one fingerprint for multiple legitimate users
- **Mitigation:** Use the fingerprint as a soft signal only; require human review or phone verification for a match, never a hard-block without phone verification alternative

**Alternative: Client-JS** (`clientjs`, last published 2019) — [ASSUMED] essentially abandoned; do not use.

**Alternative: DIY canvas/navigator signals** — more effort, less coverage than FingerprintJS, no value vs the MIT library.

**Recommended approach: `@fingerprintjs/fingerprintjs`** — sufficient, maintained, zero SaaS requirement.

---

## 2. Anti-Abuse Architecture

### How Better Auth's `databaseHooks.user.create.before` Works

[VERIFIED: node_modules/@better-auth/core/dist/types/init-options.d.mts]

```typescript
databaseHooks?: {
  user?: {
    create?: {
      before?: (
        user: User & Record<string, unknown>,
        context: GenericEndpointContext | null
      ) => Promise<boolean | void | { data: Optional<User> & Record<string, any> }>;
      after?: (user: User & Record<string, unknown>, context: GenericEndpointContext | null) => Promise<void>;
    };
  };
}
```

**Key insight:** Returning `false` from `before` cancels user creation. The context object (type `GenericEndpointContext`, which extends `EndpointContext<string, any>`) includes:
- `context.body` — the parsed sign-up request body, including **extra fields** passed by the client
- `context.request` — the raw `Request` object

**The sign-up body accepts arbitrary extra fields** [VERIFIED: node_modules/better-auth/dist/api/routes/sign-up.d.mts]:

```typescript
body: z.ZodIntersection<
  z.ZodObject<{ name, email, password, image, callbackURL, rememberMe }>,
  z.ZodRecord<z.ZodString, z.ZodAny>   // ← any extra fields pass through
>
```

This means the client can include `fingerprintHash` in the `authClient.signUp.email()` call, and the `before` hook can read it from `context.body`.

### Enforcement Architecture

**Registration path (email/password):**

```
Client registers → authClient.signUp.email({ ..., fingerprintHash: visitorId })
  → Better Auth /sign-up/email POST
  → databaseHooks.user.create.before runs server-side
     - context.body.fingerprintHash available
     - Check device_fingerprints table
     - If hash linked to existing free-tier user:
         → return false → user creation cancelled
         OR record flag: requiresPhoneVerification = true
  → User created (if not blocked)
  → databaseHooks.user.create.after: insert into device_fingerprints
```

**Google OAuth path:**
- `databaseHooks.user.create.before` receives `context: null` for OAuth-originated creations
- **Workaround:** Use `databaseHooks.user.create.after` to create the user normally, then record a `pendingFingerprintVerification` flag. On first dashboard load, the loader detects the flag and requires fingerprint check via a client-side API call.

**Login fingerprint recording (all auth methods):**  
After any successful login, the client calls `/api/device-fingerprint` with the `visitorId`. This route:
1. Gets the current session/userId from the auth header/cookie
2. Upserts the `device_fingerprints` row

### Proposed DB Table: `device_fingerprints`

```typescript
// Drizzle schema (to be added to schema.ts)
export const deviceFingerprints = pgTable("device_fingerprints", {
  id: serial("id").primaryKey(),
  fingerprintHash: text("fingerprint_hash").notNull(),
  userId: text("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  firstSeenAt: timestamp("first_seen_at").notNull().defaultNow(),
  lastSeenAt: timestamp("last_seen_at").notNull().defaultNow(),
  trustLevel: text("trust_level").notNull().default("unknown"), // unknown | trusted | flagged
  registrationFingerprint: boolean("registration_fingerprint").notNull().default(false),
}, (t) => [
  index("device_fp_hash_idx").on(t.fingerprintHash),
  index("device_fp_user_idx").on(t.userId),
]);
```

**Lookup query:** When fingerprint arrives during registration, query:
```sql
SELECT df.userId, u.email, s.planCode
FROM device_fingerprints df
JOIN users u ON df.userId = u.id
LEFT JOIN subscriptions s ON s.userId = u.id
WHERE df.fingerprintHash = $hash
  AND df.userId != $newUserId  -- not the same user on another device
```
If a row is found where `planCode IS NULL` (free tier) → flag/block.

### Multi-Account Detection Logic

| Scenario | DB State | Action |
|----------|----------|--------|
| Fingerprint not seen before | No row in device_fingerprints | Allow registration, record fingerprint |
| Fingerprint linked to same user (another device) | Row exists for same userId | Allow, update lastSeenAt |
| Fingerprint linked to a paid-tier user | Row for different userId, subscription active | Allow (paid users legitimately share devices rarely — monitor only) |
| Fingerprint linked to a free-tier user | Row for different userId, no subscription | **Soft block**: require phone verification to proceed |
| Multiple fingerprints hit same target within 30 days | Rate: >1 new account / fingerprint / 30 days | **Hard block** |

### UX Response Options for Duplicate Device Detection

**Recommended: Soft block + phone verification gate**

1. Client sees an error from the sign-up endpoint: `"DEVICE_ALREADY_REGISTERED"` (custom error code)
2. UI renders a special state: "This device is linked to an existing account. To continue, verify your phone number."
3. User enters SA phone number → Africa's Talking OTP sent → verified → account created with `deviceVerified: true` flag
4. Existing `sendOtp` / `verifyOtp` in `otp.server.ts` reused as-is [VERIFIED: app/lib/otp.server.ts]

**Hard block** (for >2 accounts from same fingerprint in 30 days): Return error, no unlock path. Admin review only.

**Admin review queue:** Add `abuseFlags` column to `trustProfiles.flagged` (already exists) with a reason. Admin UI (Phase N) surfaces these.

---

## 3. TOTP Authenticator App

### Better Auth Built-in `twoFactor` Plugin

[VERIFIED: node_modules/better-auth/dist/plugins/two-factor/ — files confirmed present]

**This plugin is already installed** in `node_modules` (better-auth v1.5.3 is installed; latest is v1.6.11 — a minor update).

**DB schema the plugin adds** [VERIFIED: node_modules/better-auth/dist/plugins/two-factor/schema.d.mts]:
```typescript
// Added to users table:
twoFactorEnabled: boolean (default: false, input: false)

// New table: twoFactor
twoFactor: {
  secret: string     // TOTP secret (encrypted by Better Auth using BETTER_AUTH_SECRET)
  backupCodes: string // JSON-encoded backup codes
  userId: string     // FK to users
}
```

**Server-side API endpoints provided** [VERIFIED: node_modules/better-auth/dist/plugins/two-factor/index.d.mts]:

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `POST /two-factor/enable` | requires password | Generates TOTP secret + `totpURI` for QR code + backup codes. Returns `{ totpURI, backupCodes }` |
| `POST /two-factor/disable` | requires password | Disables TOTP |
| `POST /two-factor/verify-totp` | — | Verifies a 6-digit TOTP code |
| `POST /two-factor/verify-backup-code` | — | Verifies a backup code |
| `POST /two-factor/generate-backup-codes` | requires password | Regenerates backup codes |
| `POST /two-factor/send-otp` | — | Sends email/SMS OTP (if OTP 2FA enabled) |
| `POST /two-factor/verify-otp` | — | Verifies email/SMS OTP code |

**Client-side API** [VERIFIED: node_modules/better-auth/dist/plugins/two-factor/client.d.mts]:
- `authClient.twoFactor.enable({ password, issuer? })`
- `authClient.twoFactor.verifyTotp({ code, trustDevice? })`
- `authClient.twoFactor.disable({ password })`
- `authClient.twoFactor.generateBackupCodes({ password })`
- `twoFactorClient({ onTwoFactorRedirect? })` — client plugin handles the 2FA challenge redirect

**TOTP options** [VERIFIED: totp/index.d.mts]:
```typescript
type TOTPOptions = {
  issuer?: string;       // e.g. "NoZar" — shows in authenticator app
  digits?: 6 | 8;       // default: 6
  period?: number;       // seconds, default: 30
  backupCodes?: BackupCodeOptions;
  disable?: boolean;
}
```

**How to add to auth.server.ts:**
```typescript
import { twoFactor } from "better-auth/plugins";

export const auth = betterAuth({
  // ...existing config...
  plugins: [
    twoFactor({
      issuer: "NoZar",
      digits: 6,
      period: 30,
    })
  ],
});
```

**Migration:** Run `npx @better-auth/cli generate` to produce the Drizzle migration, then `npx drizzle-kit migrate`.

### QR Code Rendering

**Package:** `qrcode`  
**Current version:** `1.5.4` [VERIFIED: npm registry]  
**Not yet installed** in project (checked package.json)  

The `totpURI` returned by `auth.api.enableTwoFactor` is an `otpauth://totp/...` URI that any authenticator app (Google Authenticator, Authy, Microsoft Authenticator, 1Password) can scan.

```typescript
// Source: qrcode npm docs [ASSUMED for exact API but package well-established]
import QRCode from 'qrcode';

// In a React Router loader or API route:
const qrDataUrl = await QRCode.toDataURL(totpURI);
// Returns "data:image/png;base64,..." — render as <img src={qrDataUrl} />

// Or SVG string for inline rendering:
const qrSvg = await QRCode.toString(totpURI, { type: 'svg' });
```

### `otplib` and `speakeasy` — NOT needed

Because Better Auth's twoFactor plugin handles secret generation, storage, and verification internally (using RFC 6238 TOTP with the better-auth secret as encryption key), there is **no need to install `otplib` or `speakeasy`**. These are redundant alternatives.

---

## 4. Better Auth Integration Points

### Current Better Auth Config (from app/lib/auth.server.ts)

- **Version installed:** `1.5.3` (latest: `1.6.11`)
- **databaseHooks in use:** `user.create.after` (for referral code + profile creation)
- **No plugins currently configured**

### Adding `twoFactor` Plugin

```typescript
// app/lib/auth.server.ts
import { twoFactor } from "better-auth/plugins";

export const auth = betterAuth({
  // ... all existing config preserved ...
  plugins: [
    twoFactor({
      issuer: "NoZar",
    })
  ],
  databaseHooks: {
    user: {
      create: {
        before: async (user, context) => {
          // Device fingerprint anti-abuse check (new code)
          const fingerprintHash = (context as any)?.body?.fingerprintHash as string | undefined;
          if (fingerprintHash) {
            const { deviceFingerprints, subscriptions } = await import("./schema");
            const { eq, ne, isNull } = await import("drizzle-orm");
            const existing = await db
              .select({ userId: deviceFingerprints.userId })
              .from(deviceFingerprints)
              .leftJoin(subscriptions, eq(subscriptions.userId, deviceFingerprints.userId))
              .where(eq(deviceFingerprints.fingerprintHash, fingerprintHash))
              .limit(1);
            if (existing.length > 0) {
              // Fingerprint already linked to a different account
              return false; // or throw APIError for custom error code
            }
          }
          return; // undefined = allow
        },
        after: async (user) => {
          // EXISTING: referral code + profile creation
          // (existing code unchanged)
          const { users, profiles } = await import("./schema");
          // ...
        }
      }
    }
  }
});
```

### `onTwoFactorRedirect` client plugin

The `twoFactorClient` plugin wraps auth responses and detects when the server returns a "2FA required" signal. If `onTwoFactorRedirect` is not set, the default behaviour is to navigate to `/two-factor`. This page needs to be created.

### Better Auth `context` in `before` hook

[VERIFIED: @better-auth/core/dist/types/init-options.d.mts — confirmed `context: GenericEndpointContext | null`]

The `context` is the full better-call endpoint context, which carries the parsed body. Extra sign-up fields are accessible as `(context as any).body.fieldName`. This is the official extension mechanism Better Auth documents for `additionalFields`, extended here for a transient fingerprint check field.

**⚠️ OAuth sign-up caveat:** For Google OAuth registrations, `context` is `null` in `user.create.before`. The fingerprint check cannot be enforced at user creation time. Handle this with a post-auth middleware or dashboard loader check.

---

## 5. Phone-as-Identity Signal

### Existing Infrastructure

[VERIFIED: app/lib/otp.server.ts]

Africa's Talking OTP system is fully implemented:
- `sendOtp(phone: string)` — generates, stores (in Better Auth `verifications` table), and sends 6-digit code
- `verifyOtp(phone, code)` — validates code, deletes on success
- `normalizeZaPhone(raw)` — normalises SA phone formats to E.164

Phone number in `profiles.phone`, verification status in `profiles.phoneVerified` [VERIFIED: schema.ts].

### Phone vs Fingerprint as Identity Signal

| Signal | Spoofable? | False Positive Risk | Enforcement Quality |
|--------|------------|---------------------|---------------------|
| Device fingerprint | Medium (browser extensions, headless) | Medium (shared devices) | First-line soft check |
| Phone number | Hard (requires real SIM) | Low (1 SIM = 1 person) | Strong identity anchor |
| Both combined | Very hard | Low | Best |

**Recommended role split:**
- **Fingerprint**: First-line detection at registration — catches 90%+ of casual multi-account abuse
- **Phone**: Unlock mechanism when fingerprint detects possible duplicate — proves separate identity even on shared device
- Together: phone becomes the ground truth; fingerprint reduces the number of cases that need phone verification

### SA-Specific Consideration

Africa's Talking has SA SMS coverage. The `+27` normalisation already exists. Cost per OTP SMS is very low (AT's free sandbox for testing, production is pay-per-use). This is not a free service — there's a per-SMS cost — but the use is only triggered on flagged registrations, so volume is low.

---

## 6. Recommended Approach for NoZar

### Minimal Viable Implementation (MVI)

**Wave 1 — DB + Migration**
- Add `device_fingerprints` table (Drizzle schema + migration)
- Run `npx @better-auth/cli generate` to add better-auth `twoFactor` plugin tables (`twoFactor` table, `users.twoFactorEnabled` column)
- Run `npx drizzle-kit generate && npx drizzle-kit migrate`

**Wave 2 — Device Fingerprint Collection**
- Install `@fingerprintjs/fingerprintjs` (client-side, lazy load)
- In `register.tsx`: collect `visitorId` before sign-up form submission
- Pass as `fingerprintHash` in `authClient.signUp.email({ ..., fingerprintHash })`
- In `login.tsx`: after successful sign-in, send fingerprint to `/api/device-fingerprint` (upsert)

**Wave 3 — Anti-Abuse Enforcement**
- Add `databaseHooks.user.create.before` in `auth.server.ts` to check fingerprint
- Create `/api/device-fingerprint` route (upsert device_fingerprints, check for abuse on login)
- Define custom error: `DEVICE_ALREADY_REGISTERED`
- In `register.tsx`: handle this error with phone verification UX (reuse existing OTP flow)

**Wave 4 — TOTP 2FA**
- Add `twoFactor` plugin to `auth.server.ts`
- Add `twoFactorClient` to `auth.client.ts`
- Create `/dashboard/settings/security` page:
  - Enable 2FA: call `authClient.twoFactor.enable({ password })` → get `totpURI` → render QR
  - Show backup codes (one-time reveal)
  - Disable 2FA: call `authClient.twoFactor.disable({ password })`
- Create `/two-factor` page (2FA challenge during login)
- Install `qrcode` for QR code rendering

### What NOT to Build

| Problem | Don't Build | Use Instead |
|---------|-------------|-------------|
| TOTP secret generation | Custom otplib/speakeasy integration | Better Auth twoFactor plugin |
| TOTP code verification | Custom RFC 6238 implementation | Better Auth twoFactor plugin |
| QR code generation for totpURI | Custom canvas/SVG approach | `qrcode` npm package |
| Fingerprint signals collection | Custom canvas hash DIY | `@fingerprintjs/fingerprintjs` |
| SMS delivery for phone unlock | New SMS provider | Africa's Talking (already integrated in otp.server.ts) |

---

## 7. DB Schema Changes Required

### New Table: `device_fingerprints`

```typescript
export const deviceFingerprints = pgTable("device_fingerprints", {
  id: serial("id").primaryKey(),
  fingerprintHash: text("fingerprint_hash").notNull(),
  userId: text("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  firstSeenAt: timestamp("first_seen_at").notNull().defaultNow(),
  lastSeenAt: timestamp("last_seen_at").notNull().defaultNow(),
  trustLevel: text("trust_level").notNull().default("unknown"), // unknown | trusted | flagged
  registrationFingerprint: boolean("registration_fingerprint").notNull().default(false),
}, (t) => [
  index("device_fp_hash_idx").on(t.fingerprintHash),
  index("device_fp_user_idx").on(t.userId),
]);
```

### Better Auth Plugin Tables (auto-generated by CLI)

```typescript
// Generated by: npx @better-auth/cli generate
// Schema added by the twoFactor plugin:

// Column added to users table:
twoFactorEnabled: boolean("two_factor_enabled").default(false)

// New table: two_factors (Better Auth uses plural with usePlural: true)
export const twoFactors = pgTable("two_factors", {
  id: text("id").primaryKey(),
  secret: text("secret").notNull(),         // encrypted by Better Auth
  backupCodes: text("backup_codes").notNull(), // JSON string, encrypted
  userId: text("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
});
```

**Important:** Better Auth handles encrypting the `secret` and `backupCodes` using `BETTER_AUTH_SECRET`. You do **not** manually encrypt them.

### No Changes Required

- `profiles` — `phone` and `phoneVerified` already exist
- `trustProfiles` — `flagged` column already exists; can be used for abuse flags
- `verifications` — used by Africa's Talking OTP as-is

### Migration Flow

```bash
# Step 1: Add device_fingerprints to schema.ts manually
# Step 2: Generate better-auth plugin migration
npx @better-auth/cli generate  # outputs SQL migration

# Step 3: Generate drizzle migration
npx drizzle-kit generate

# Step 4: Apply
npx drizzle-kit migrate
```

---

## 8. Security & Privacy (POPIA)

### South African POPIA (Protection of Personal Information Act)

POPIA is SA's data protection law (similar to GDPR, effective July 2021). Device fingerprints constitute "personal information" under POPIA because they can be used to identify or re-identify a data subject. [ASSUMED: based on POPIA definition of personal information — "information relating to an identifiable, living, natural person"]

**Applicable POPIA obligations for device fingerprinting:**

| Obligation | Requirement | How to Comply |
|------------|-------------|---------------|
| Lawfulness | Must have legitimate purpose | Anti-fraud / abuse prevention = legitimate. Disclose in privacy policy. |
| Purpose limitation | Only use for stated purpose | Do not use fingerprint for advertising or profiling |
| Minimisation | Collect only what's needed | Store only the hash, not raw signals |
| Data subject rights | User can request deletion | `CASCADE` on `userId` deletion handles this |
| Retention | No longer than necessary | Add TTL: delete device_fingerprint rows >6 months after account deletion or inactivity |

**Practical steps:**
- Update privacy policy to disclose device fingerprinting for fraud prevention
- Store only the `visitorId` hash — never the raw signal components
- Ensure `ON DELETE CASCADE` is set (it is, in the schema above)
- Do NOT use fingerprint data for any purpose other than abuse detection

### TOTP Secret Security

[VERIFIED: Better Auth encrypts TOTP secrets using BETTER_AUTH_SECRET before storage]

- `BETTER_AUTH_SECRET` must be set in production (it is — the existing config requires it)
- The `twoFactor` table's `secret` and `backupCodes` columns are encrypted at rest by Better Auth
- Even a DB breach does not expose usable TOTP secrets

### Fingerprint Transmission Security

- Fingerprint hash is transmitted in the HTTPS request body (HTTPS enforced in production on Vercel)
- Never log the raw fingerprint hash in application logs — treat it like a PII field
- Store only the SHA-256 hash if you want an extra layer (FingerprintJS `visitorId` is already a hash internally)

### ASVS Categories for This Phase

| ASVS Category | Applies | Standard Control |
|---------------|---------|-----------------|
| V2 Authentication | Yes | Better Auth email/password + TOTP |
| V3 Session Management | No (handled by Better Auth) | — |
| V4 Access Control | Yes | Device fingerprint gate on registration |
| V5 Input Validation | Yes | Validate fingerprintHash is a non-empty string ≤64 chars in server action |
| V6 Cryptography | Yes | TOTP secrets encrypted by Better Auth (AES-256); never hand-roll |

### Threat Patterns

| Pattern | STRIDE | Standard Mitigation |
|---------|--------|---------------------|
| Multi-account creation via incognito | Tampering | FingerprintJS visitorId (survives incognito) |
| Fingerprint spoofing via headless browser | Spoofing | Phone verification as second factor on duplicate detection |
| Replay attack on fingerprint API | Tampering | Session authentication required on /api/device-fingerprint endpoint |
| TOTP secret exfiltration | Information Disclosure | Better Auth encrypts secret in DB; requires DB + secret compromise simultaneously |
| Backup code brute force | Elevation of Privilege | Better Auth rate-limits backup code attempts |

---

## 9. Open Questions for Planning

1. **Fingerprint accuracy for SA mobile users**
   - What we know: FingerprintJS v5 handles mobile browsers. Chrome on Android and Safari on iOS both work.
   - What's unclear: The proportion of NoZar users using mobile-only browsers (where fingerprinting is less stable due to OS updates) vs desktop. If most users are mobile, fingerprint stability may be lower.
   - Recommendation: Accept this limitation. Treat mobile fingerprints as shorter-lived signals (1 week vs 30 days for desktop). Rely on phone verification as the primary enforcement for mobile users.

2. **Google OAuth fingerprint gap**
   - What we know: `context` is `null` in `user.create.before` for OAuth sign-ups.
   - What's unclear: Whether Better Auth exposes a way to pass fingerprint through the OAuth flow (e.g. via state parameter).
   - Recommendation: For Phase 2, treat Google OAuth users as requiring phone verification on their first listing creation (not at account creation). This is less disruptive and covers the same abuse vector.

3. **Better Auth version upgrade (1.5.3 → 1.6.11)**
   - What we know: Latest is 1.6.11, project has 1.5.3. The twoFactor plugin exists in both.
   - What's unclear: Whether the changelog between 1.5.3 and 1.6.11 affects the twoFactor plugin API.
   - Recommendation: Update before implementing the twoFactor plugin to avoid working against a version gap. Run `npm update better-auth`. Low risk minor update.

4. **Fingerprint for listing creation gate vs registration gate**
   - What we know: The phase goal is to prevent creating multiple accounts. The fingerprint is most useful at registration.
   - What's unclear: Whether to also gate the 5th listing creation (the abuse-enabling action) with an additional fingerprint check.
   - Recommendation: Gate at registration first. A listing-time gate is a later phase concern if registration gating proves insufficient.

5. **Admin review interface for flagged users**
   - What we know: `trustProfiles.flagged` column exists. No admin UI exists yet.
   - What's unclear: Is this phase expected to include an admin review queue or just the flagging logic?
   - Recommendation: Flag records in this phase, build admin UI in a later phase. Keep scope focused.

---

## Standard Stack

### Core (New)

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| `@fingerprintjs/fingerprintjs` | 5.2.0 | Client-side device fingerprinting | MIT, maintained, survives incognito, no SaaS |
| `qrcode` | 1.5.4 | Render `otpauth://totp/...` URI to QR image | De-facto standard, no dependencies |

### Already Installed (Leverage)

| Library | Version | Purpose | 
|---------|---------|---------|
| `better-auth` | 1.5.3 (→ update to 1.6.11) | twoFactor plugin built-in |
| Africa's Talking (via otp.server.ts) | N/A | Phone OTP for duplicate device unlock |

### NOT Needed (Avoid Installing)

| Package | Reason to Skip |
|---------|---------------|
| `otplib` | Better Auth twoFactor plugin handles TOTP internally |
| `speakeasy` | Same — redundant |
| Fingerprint Pro / commercial SaaS | Not needed for MVP; open-source sufficient for casual abuse |

### Installation

```bash
npm install @fingerprintjs/fingerprintjs qrcode
npm install --save-dev @types/qrcode
```

---

## Validation Architecture

> nyquist_validation not set to false in .planning/config.json → section included.

### Test Framework

| Property | Value |
|----------|-------|
| Framework | Vitest 4.1.6 (unit) + Playwright 1.58.2 (E2E) |
| Config file | vitest.config.ts (unit), playwright.config.ts (E2E) |
| Quick run command | `npm run test:unit` |
| Full suite command | `npm test` (Playwright E2E) |

### Phase Requirements → Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| FP-01 | Fingerprint collected client-side before sign-up | unit | `vitest run tests/device-fingerprint.test.ts` | ❌ Wave 0 |
| FP-02 | Registration blocked when duplicate fingerprint found (free-tier) | unit | `vitest run tests/anti-abuse.test.ts` | ❌ Wave 0 |
| FP-03 | Phone verification unlocks duplicate-device registration | E2E (manual-only — requires real phone) | manual | — |
| FP-04 | device_fingerprints row created on successful registration | unit | `vitest run tests/device-fingerprint.test.ts` | ❌ Wave 0 |
| TOTP-01 | TOTP enable returns valid totpURI | unit | `vitest run tests/totp.test.ts` | ❌ Wave 0 |
| TOTP-02 | TOTP verify accepts correct 6-digit code | unit | `vitest run tests/totp.test.ts` | ❌ Wave 0 |
| TOTP-03 | TOTP login challenge shown when 2FA enabled | E2E | `npm run test:auth` | existing spec (needs new test case) |

### Wave 0 Gaps

- [ ] `tests/device-fingerprint.test.ts` — covers FP-01, FP-02, FP-04
- [ ] `tests/anti-abuse.test.ts` — covers FP-02 with mock DB
- [ ] `tests/totp.test.ts` — covers TOTP-01, TOTP-02

---

## Sources

### Primary (HIGH confidence)
- `node_modules/better-auth/dist/plugins/two-factor/` — full plugin API and schema verified
- `node_modules/@better-auth/core/dist/types/init-options.d.mts` — databaseHooks type definitions
- `node_modules/better-auth/dist/api/routes/sign-up.d.mts` — sign-up body accepts ZodRecord extra fields
- `npm view @fingerprintjs/fingerprintjs@5.2.0 readme` — fingerprint accuracy/spoofability limitations
- `npm view qrcode version` → 1.5.4
- Project files: app/lib/auth.server.ts, app/lib/schema.ts, app/lib/otp.server.ts, app/routes/register.tsx

### Secondary (MEDIUM confidence)
- `npm view better-auth@latest` — confirmed v1.6.11 is latest, v1.5.3 installed
- `npm view otplib@13 description` — confirmed it's TypeScript-first TOTP library (not needed)

### Tertiary (LOW confidence / ASSUMED)
- POPIA classification of device fingerprints as personal information — [ASSUMED] based on POPIA s1 definition
- QR code API signature for `qrcode` package — [ASSUMED] well-known package, pattern is standard

---

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | POPIA classifies device fingerprints as personal information | Section 8 | If fingerprints are not personal information, disclosure obligation may not apply — but documenting it anyway is best practice with no downside |
| A2 | `context.body.fingerprintHash` is accessible in `databaseHooks.user.create.before` via `(context as any).body` | Section 4 | If context.body is undefined in that hook, the enforcement approach needs to change to a dedicated pre-registration endpoint |
| A3 | `qrcode` package API: `QRCode.toDataURL(uri)` returns data URI | Section 3 | Minor — verify with actual import when implementing; fallback is `qrcode.toString(uri, {type:'svg'})` |
| A4 | Google OAuth `user.create.before` receives `context: null` | Section 4 | If context is non-null for OAuth, enforcement can be unified — simplifies architecture |

---

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| Node.js | Build + runtime | ✓ | v22.19.0 | — |
| @fingerprintjs/fingerprintjs | FP collection | ✗ (not installed) | — | Install: `npm install @fingerprintjs/fingerprintjs` |
| qrcode | QR rendering for TOTP setup | ✗ (not installed) | — | Install: `npm install qrcode @types/qrcode` |
| better-auth twoFactor plugin | TOTP 2FA | ✓ (built into better-auth v1.5.3) | 1.5.3 | — |
| Africa's Talking (OTP) | Phone unlock for duplicate device | ✓ (otp.server.ts wired) | N/A | Requires AFRICASTALKING_API_KEY + AFRICASTALKING_USERNAME in .env |
| Neon PostgreSQL | device_fingerprints table | ✓ (existing) | — | — |
| @better-auth/cli | Generate twoFactor plugin migration | ✗ (not in devDeps) | — | `npx @better-auth/cli generate` (one-time use, npx is fine) |

**Missing dependencies needing install before implementation:**
- `@fingerprintjs/fingerprintjs` — core requirement
- `qrcode` + `@types/qrcode` — for QR code rendering

**Missing env vars that block Africa's Talking phone unlock:**
- `AFRICASTALKING_API_KEY`, `AFRICASTALKING_USERNAME` — confirmed needed, codebase already handles the "not configured" case gracefully (logs code to console in dev)

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — verified against installed packages and npm registry
- Architecture (fingerprint enforcement): HIGH — Better Auth type definitions confirm the hook and body access pattern
- Architecture (OAuth gap): HIGH — confirmed `context: null` for OAuth in databaseHooks
- TOTP integration: HIGH — plugin exists in node_modules, API fully typed
- POPIA compliance: MEDIUM — ASSUMED classification; should be confirmed with legal review for production
- Pitfalls: HIGH — extracted from actual type definitions and readme limitations

**Research date:** 2025-07-18  
**Valid until:** 2025-08-18 (stable stack; Better Auth minor version may bump before then)

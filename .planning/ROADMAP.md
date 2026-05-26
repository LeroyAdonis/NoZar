# Roadmap: Nozar

## Overview

Nozar is a South African barter/swap platform ("No ZAR"). This roadmap tracks feature phases from the existing MVP foundation through device anti-abuse, 2FA, and future enhancements.

## Phases

- [x] **Phase 1: Interactive Tutorial** — Onboarding tutorial (completed before this roadmap)
- [ ] **Phase 2: Device Identity & Anti-Abuse** — Browser fingerprinting + multi-account detection + TOTP 2FA

## Phase Details

### Phase 1: Interactive Tutorial
**Goal**: User onboarding tutorial
**Status**: Complete (prior to this roadmap)

### Phase 2: Device Identity & Anti-Abuse
**Goal**: Prevent free-tier abuse via device fingerprinting; add TOTP 2FA authenticator support
**Depends on**: Phase 1
**Requirements**: REQ-DEVICE-001, REQ-DEVICE-002, REQ-TOTP-001, REQ-ABUSE-001
**Success Criteria** (what must be TRUE):
  1. New registrations are checked against known device fingerprints; duplicate free-tier devices trigger phone verification
  2. Google OAuth users with unverified devices see DeviceVerificationPrompt on first dashboard load
  3. Users can enable/disable TOTP 2FA from /dashboard/settings/security
  4. Login flow redirects to /two-factor challenge when 2FA is enabled
**Plans**: 4 plans

Plans:
- [x] 02-01: DB Schema & Migration (device_fingerprints, two_factors tables + packages)
- [x] 02-02: Device Fingerprint Collection (client-side) — FingerprintJS in register+login, duplicate-device inline UI
- [ ] 02-03: Auth Server Plugin Integration (twoFactor plugin + databaseHooks + /api/device-fingerprint + /api/device-verify routes)
- [ ] 02-04: 2FA UI (settings page, /two-factor challenge page)

## Progress

| Phase | Plans Complete | Status | Completed |
|-------|----------------|--------|-----------|
| 1. Interactive Tutorial | - | Complete | - |
| 2. Device Identity & Anti-Abuse | 2/4 | In progress | - |

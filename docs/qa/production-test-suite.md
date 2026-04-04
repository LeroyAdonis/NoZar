# NoZar Production Test Suite
**Date:** 2026-04-02  
**Purpose:** Comprehensive test checklist for MVP verification of NoZar platform  
**Environment:** Production URL: https://no-zar-r66j.vercel.app  
**Testing Framework:** Playwright E2E Tests  

---

## Test Priority Definitions
- **P0 (Blocking MVP):** Must pass for launch - core functionality
- **P1 (Should Fix):** Important for usability - should be fixed before launch
- **P2 (Nice to Have):** Enhancements - can be addressed post-launch

---

## Test Case Checklist

### 1. Landing Page Tests

| Test ID | Test Case | Priority | Step-by-Step Instructions | Expected Result | Actual Result | Screenshot Evidence |
|---------|-----------|----------|---------------------------|-----------------|---------------|---------------------|
| LP-001 | Landing page loads and all sections render | P0 | 1. Navigate to https://no-zar-r66j.vercel.app<br>2. Wait for network idle<br>3. Verify all sections are present | Hero section, Features, Pricing (placeholder), FAQ (placeholder), Testimonials (placeholder), Trust signals, Stats bar, Cookie consent, Complete footer all visible |  |  |
| LP-002 | Network status indicator shows correct region | P0 | 1. On landing page<br>2. Locate network status indicator<br>3. Verify it shows either "Western Cape" or "Gauteng" | Network status shows active region filtering |  |  |
| LP-003 | Get Started Free button navigates to login | P0 | 1. On landing page<br>2. Click "Get Started Free" button<br>3. Wait for navigation | URL changes to /login and login form is visible |  |  |
| LP-004 | Mobile responsive layout | P1 | 1. Set viewport to mobile (375x812)<br>2. Navigate to landing page<br>3. Verify all sections stack correctly | All content visible without horizontal scrolling, touch targets appropriately sized |  |  |
| LP-005 | Cookie consent banner appears on first visit | P1 | 1. Clear browser cookies/storage<br>2. Navigate to landing page<br>3. Check for cookie consent banner | Cookie consent banner appears at bottom of screen |  |  |
| LP-006 | Footer links are functional | P1 | 1. On landing page<br>2. Click each footer link (About, Terms, Privacy, etc.)<br>3. Verify navigation or external link behavior | Each link navigates to correct page or opens external URL in new tab |  |  |

### 2. Authentication Tests

| Test ID | Test Case | Priority | Step-by-Step Instructions | Expected Result | Actual Result | Screenshot Evidence |
|---------|-----------|----------|---------------------------|-----------------|---------------|---------------------|
| AUTH-001 | Google OAuth authentication flow initiation | P0 | 1. Navigate to landing page<br>2. Click "Get Started Free"<br>3. Click "Continue with Google" button<br>4. Wait for Google accounts page | Redirects to Google OAuth accounts.google.com domain |  |  |
| AUTH-002 | Protected routes redirect unauthenticated users | P0 | 1. Clear all cookies<br>2. Attempt to access /dashboard<br>3. Attempt to access /dashboard/pings<br>4. Attempt to access /dashboard/profile | All attempts redirect to /login page |  |  |
| AUTH-003 | Login page loads with correct form elements | P0 | 1. Navigate to /login<br>2. Wait for page load | Email input, password input, "Sign in with Google" button, "Sign In" button all visible |  |  |
| AUTH-004 | Sign out functionality works | P0 | 1. Authenticate user (via test credentials or mock)<br>2. Navigate to /dashboard<br>3. Click user avatar/menu<br>4. Click "Sign Out"<br>5. Verify redirect | User redirected to landing page, session cleared |  |  |
| AUTH-005 | Session persistence after refresh | P0 | 1. Authenticate user<br>2. Navigate to /dashboard<br>3. Refresh page<br>4. Verify authentication state | User remains authenticated on dashboard after refresh |  |  |
| AUTH-006 | Login form validation | P1 | 1. Navigate to /login<br>2. Click "Sign In" with empty fields<br>3. Attempt to submit invalid email | Appropriate validation errors displayed for empty/invalid fields |  |  |
| AUTH-007 | Mobile login experience | P1 | 1. Set viewport to mobile<br>2. Navigate to /login<br>3. Attempt login flow | Form elements properly sized for touch, keyboard navigable |  |  |

### 3. Dashboard Tests

| Test ID | Test Case | Priority | Step-by-Step Instructions | Expected Result | Actual Result | Screenshot Evidence |
|---------|-----------|----------|---------------------------|-----------------|---------------|---------------------|
| DB-001 | Dashboard loads for authenticated user | P0 | 1. Authenticate user<br>2. Navigate to /dashboard<br>3. Wait for content load | Dashboard header visible, feed section loads, navigation sidebar present |  |  |
| DB-002 | Region toggle functions correctly | P0 | 1. On dashboard<br>2. Locate region toggle (Western Cape/Gauteng)<br>3. Toggle between regions<br>4. Observe feed changes | Feed updates to show listings relevant to selected region |  |  |
| DB-003 | Asset cards display correctly in feed | P0 | 1. On dashboard feed<br>2. Locate asset cards<br>3. Verify each card shows title, image, location, price/type | Each asset card displays complete information with proper formatting |  |  |
| DB-004 | Add asset button navigates to creation flow | P1 | 1. On dashboard<br>2. Click "Add Asset" button<br>3. Verify navigation | Navigates to /dashboard/add route |  |  |
| DB-005 | Notification bell functional | P1 | 1. On dashboard<br>2. Click notification bell<br>3. Verify dropdown/menu appears | Notification dropdown shows recent notifications or empty state message |  |  |
| DB-006 | Map page loads (placeholder) | P2 | 1. On dashboard<br>2. Click map icon/link<br>3. Verify map page loads | Map interface loads (even if placeholder) |  |  |
| DB-007 | Dashboard mobile responsiveness | P1 | 1. Set viewport to mobile<br>2. Authenticate and navigate to dashboard<br>3. Verify layout adapts | Sidebar collapses to hamburger menu, feed remains readable |  |  |

### 4. Asset Detail Tests

| Test ID | Test Case | Priority | Step-by-Step Instructions | Expected Result | Actual Result | Screenshot Evidence |
|---------|-----------|----------|---------------------------|-----------------|---------------|---------------------|
| AD-001 | Asset detail page loads for valid asset | P0 | 1. On dashboard feed<br>2. Click on an asset card<br>3. Wait for detail page load | Asset detail page loads with full asset information |  |  |
| AD-002 | Edit flow for own assets | P0 | 1. On own asset detail page<br>2. Click "Edit" button<br>3. Verify edit form loads<br>4. Make changes and submit | Edit form loads with asset pre-filled, changes persist after submission |  |  |
| AD-003 | Edit button not visible for others' assets | P0 | 1. On another user's asset detail page<br>2. Verify UI | No edit button visible, only contact/propose trade options |  |  |
| AD-004 | Asset image gallery displays | P1 | 1. On asset detail with multiple images<br>2. Verify image carousel/gallery | All images visible, able to navigate between them |  |  |
| AD-005 | Asset detail mobile layout | P1 | 1. Set viewport to mobile<br>2. Navigate to asset detail<br>3. Verify layout | Information stacks vertically, images full width, touch targets adequate |  |  |

### 5. Chat/Pings Tests

| Test ID | Test Case | Priority | Step-by-Step Instructions | Expected Result | Actual Result | Screenshot Evidence |
|---------|-----------|----------|---------------------------|-----------------|---------------|---------------------|
| CHAT-001 | Thread list loads for authenticated user | P0 | 1. Authenticate user<br>2. Navigate to /dashboard/pings<br>3. Wait for thread list load | List of conversation threads visible (or empty state if no chats) |  |  |
| CHAT-002 | Create new chat thread | P0 | 1. On asset detail page<br>2. Click "Propose Trade" or "Contact"<br>3. Verify chat thread opens | New chat thread opens with pre-filled context about the asset |  |  |
| CHAT-003 | Send and receive messages | P0 | 1. In an open chat thread<br>2. Type message in input box<br>3. Press Enter or click send<br>4. Verify message appears | Message sent successfully and visible in chat thread |  |  |
| CHAT-004 | Message persistence | P0 | 1. Send a message in chat<br>2. Refresh page or navigate away and back<br>3. Verify message still present | Previously sent messages persist after refresh/navigation |  |  |
| CHAT-005 | Thread read/unread indicators | P1 | 1. Have unread messages in a thread<br>2. View thread list<br>3. Mark thread as read<br>4. Verify indicator updates | Unread indicator shows correctly, disappears when marked read |  |  |
| CHAT-006 | Mobile chat interface | P1 | 1. Set viewport to mobile<br>2. Open chat thread<br>3. Verify usability | Input box accessible, messages readable, send button reachable |  |  |

### 6. Profile Page Tests

| Test ID | Test Case | Priority | Step-by-Step Instructions | Expected Result | Actual Result | Screenshot Evidence |
|---------|-----------|----------|---------------------------|-----------------|---------------|---------------------|
| PROF-001 | Profile page loads with user data | P0 | 1. Authenticate user<br>2. Navigate to /dashboard/profile<br>3. Wait for profile load | User's name, email, avatar, and profile information visible |  |  |
| PROF-002 | Edit profile functionality | P1 | 1. On profile page<br>2. Click "Edit Profile"<br>3. Modify information (display name, bio, etc.)<br>4. Save changes | Changes saved and reflected in profile view |  |  |
| PROF-003 | Trust score/badges visible | P1 | 1. On profile page<br>2. Locate trust indicators | Trust level/badge visible based on user's verification status |  |  |
| PROF-004 | Profile mobile layout | P1 | 1. Set viewport to mobile<br>2. Navigate to profile<br>3. Verify layout | Information readable, edit controls accessible |  |  |

### 7. Legal Pages Tests

| Test ID | Test Case | Priority | Step-by-Step Instructions | Expected Result | Actual Result | Screenshot Evidence |
|---------|-----------|----------|---------------------------|-----------------|---------------|---------------------|
| LEGAL-001 | Terms of Service page loads | P0 | 1. Navigate to /terms<br>2. Wait for content load | Terms of Service content visible and readable |  |  |
| LEGAL-002 | Privacy Policy page loads | P0 | 1. Navigate to /privacy<br>2. Wait for content load | Privacy Policy content visible and readable |  |  |
| LEGAL-003 | Cookie Policy page loads | P0 | 1. Navigate to /cookie-policy<br>2. Wait for content load | Cookie Policy content visible and readable |  |  |
| LEGAL-004 | Legal pages accessible from footer | P1 | 1. On any page<br>2. Scroll to footer<br>3. Click each legal link (Terms, Privacy, etc.)<br>4. Verify navigation | Each link navigates to corresponding legal page |  |  |
| LEGAL-005 | Legal pages mobile readable | P1 | 1. Set viewport to mobile<br>2. Navigate to each legal page<br>3. Verify readability | Text readable without zooming, proper line lengths |  |  |

### 8. Auth Guard Tests

| Test ID | Test Case | Priority | Step-by-Step Instructions | Expected Result | Actual Result | Screenshot Evidence |
|---------|-----------|----------|---------------------------|-----------------|---------------|---------------------|
| GUARD-001 | Unauthenticated access to dashboard redirects | P0 | 1. Clear cookies<br>2. Navigate to /dashboard<br>3. Wait for redirect | Redirected to /login page |  |  |
| GUARD-002 | Unauthenticated access to pings redirects | P0 | 1. Clear cookies<br>2. Navigate to /dashboard/pings<br>3. Wait for redirect | Redirected to /login page |  |  |
| GUARD-003 | Unauthenticated access to profile redirects | P0 | 1. Clear cookies<br>2. Navigate to /dashboard/profile<br>3. Wait for redirect | Redirected to /login page |  |  |
| GUARD-004 | Unauthenticated access to asset creation redirects | P0 | 1. Clear cookies<br>2. Navigate to /dashboard/add<br>3. Wait for redirect | Redirected to /login page |  |  |
| GUARD-005 | Authenticated access allows entry | P0 | 1. Authenticate user<br>2. Navigate to protected routes<br>3. Verify access granted | User can access /dashboard, /dashboard/pings, etc. without redirect |  |  |
| GUARD-006 | Redirect preserves intended destination | P1 | 1. Clear cookies<br>2. Navigate to /dashboard/pings/123<br>3. After login, verify redirect | After login, user redirected to originally requested /dashboard/pings/123 |  |  |

### 9. Trust Profiles Tests

| Test ID | Test Case | Priority | Step-by-Step Instructions | Expected Result | Actual Result | Screenshot Evidence |
|---------|-----------|----------|---------------------------|-----------------|---------------|---------------------|
| TRUST-001 | Trust profiles table query works | P0 | 1. Authenticate user<br>2. Navigate to any page requiring trust data (profile, chat)<br>3. Verify trust data loads without error | Trust profile data loads successfully, no 500 errors |  |  |
| TRUST-002 | Trust badge displays correctly | P1 | 1. On user profile or asset card<br>2. Locate trust verification badge/trust level indicator<br>3. Verify accuracy | Trust badge reflects user's actual trust status/level |  |  |
| TRUST-003 | Trust flow initiation | P1 | 1. Start trade conversation<br>2. Verify trust/safety information presented<br>3. Check for SafeZone AI meetup routing info | Trust/safety information visible in chat interface |  |  |

---

## Test Execution Instructions

### Prerequisites
1. Playwright installed: `npm install -D @playwright/test`
2. Browsers installed: `npx playwright install`
3. Test credentials configured (for authenticated tests)

### Running Tests
```bash
# Run all tests
npm test

# Run specific test suites
npm run test:auth
npm run test:landing
npm run test:dashboard
npm run test:chat
npm run test:profile
npm run test:legal

# Run headed (visible browser) for debugging
npm run test:headed

# Generate HTML report
npm run test:report
```

### Environment Variables
Set these in `.env.test` or CI environment:
```
TEST_USER_EMAIL=test@example.com
TEST_USER_PASSWORD=securepassword123
# For Google OAuth tests, either:
# 1. Configure test Google account credentials, or
# 2. Mock the OAuth flow for CI
```

### Screenshot Storage
Screenshots are saved to `e2e/screenshots/` directory with test-specific names.

---

## Pass/Fail Criteria
- **P0 Tests:** All must pass for MVP release consideration
- **P1 Tests:** Should pass; failures acceptable with documented workarounds
- **P2 Tests:** Failures acceptable for MVP; track for post-launch improvements

---

## Revision History
| Date | Version | Changes | Author |
|------|---------|---------|--------|
| 2026-04-02 | 1.0 | Initial test suite creation based on MVP gap analysis | OpenClaw Agent |

---
*This test suite should be executed against the production URL: https://no-zar-r66j.vercel.app*
*Results should be documented with actual outcomes and screenshot evidence for visual verification.*
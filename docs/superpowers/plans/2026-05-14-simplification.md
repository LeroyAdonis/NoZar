# NoZar Simplification Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Simplify UI language, navigation, and flows across all NoZar screens — rename jargon labels, add a welcome overlay, convert the add-item form to a 2-step wizard, wire the "Offer a swap" bottom sheet, improve chat status badges, gate the safe meetup confirmation, and restructure the profile into two tabs.

**Architecture:** Pure UI/presentation changes across 7 areas. No schema changes. SafeZonePicker is already built; work is wiring it as a required gate and updating labels throughout. The SSE endpoint gains one extra poll check (vote count) to trigger real-time meetup confirmations.

**Tech Stack:** React Router v7, TypeScript, Tailwind CSS, Framer Motion (already in asset.$id.tsx), Drizzle ORM (SSE extension only), lucide-react icons

---

## File Map

| File | Action |
|------|--------|
| `app/components/ui/bottom-nav.tsx` | Rename labels, conditional unread dot |
| `app/routes/dashboard.tsx` | Rename sidebar labels, remove monospace section headers, add welcome overlay |
| `app/components/ui/welcome-overlay.tsx` | **CREATE** — one-time first-login overlay |
| `app/routes/dashboard/home.tsx` | Section header copy, category chips, Local/National scope toggle |
| `app/components/ui/asset-card.tsx` | Row 1 (distance + username), Row 2 (time-ago), badge copy |
| `app/routes/dashboard/add.tsx` | 2-step wizard with "More details" collapsible |
| `app/routes/dashboard/asset.$id.tsx` | Replace "Initialize Ping" with "Offer a swap" bottom sheet |
| `app/routes/dashboard/pings.tsx` | Remove jargon header, plain thread count |
| `app/components/ui/ping-thread.tsx` | Plain-language status badges, "About:" label |
| `app/routes/dashboard/pings.$id.tsx` | Add `votes` to destructure, gate "I'm Ready" behind both-voted, fix `isConfirmed` |
| `app/routes/api.chat-stream.$tradeId.ts` | Add meetup vote count check to SSE poll |
| `app/components/ui/MeetupPlanner.tsx` | **DELETE** — unused stub, SafeZonePicker is already wired |
| `app/routes/dashboard/profile.tsx` | Two tabs (My listings / Account), Archive→Hide, renamed stats, slide-in edit sheet |

---

## Task 1: Navigation Labels

**Files:**
- Modify: `app/components/ui/bottom-nav.tsx`
- Modify: `app/routes/dashboard.tsx`

- [ ] **Step 1: Update bottom-nav.tsx label strings and add `hasUnread` prop**

Replace the `NAV_TABS` array and `BottomNavProps` in `app/components/ui/bottom-nav.tsx`:

```tsx
type BottomNavProps = {
  activeTab: string;
  isPending?: boolean;
  hasUnread?: boolean;
};

const NAV_TABS: NavTab[] = [
  {
    id: "home",
    label: "Home",
    href: "/dashboard",
    icon: Home,
    activeColor: "text-emerald-400",
    activeFill: "fill-emerald-400/20",
  },
  {
    id: "map",
    label: "Explore",
    href: "/dashboard/map",
    icon: MapIcon,
    activeColor: "text-cyan-400",
    activeFill: "fill-cyan-400/20",
  },
  {
    id: "add",
    label: "",
    href: "/dashboard/add",
    icon: Plus,
    activeColor: "",
    activeFill: "",
  },
  {
    id: "messages",
    label: "Chats",
    href: "/dashboard/pings",
    icon: MessageSquare,
    activeColor: "text-emerald-400",
    activeFill: "fill-emerald-400/20",
  },
  {
    id: "profile",
    label: "Profile",
    href: "/dashboard/profile",
    icon: User,
    activeColor: "text-emerald-400",
    activeFill: "fill-emerald-400/20",
  },
];
```

Update the function signature:
```tsx
export function BottomNav({ activeTab, isPending = false, hasUnread = false }: BottomNavProps) {
```

Change the notification dot (was always-on) to conditional:
```tsx
{/* Notification dot for Chats tab */}
{tab.id === "messages" && hasUnread && (
  <span className="absolute top-1 right-2 w-2 h-2 rounded-full bg-emerald-500 border border-[#030712]" />
)}
```

- [ ] **Step 2: Update dashboard.tsx sidebar links and pass hasUnread to BottomNav**

In `app/routes/dashboard.tsx`, update `SIDEBAR_LINKS` (lines 119–124):

```tsx
const SIDEBAR_LINKS = [
  { id: "home",     label: "Home",     href: "/dashboard",          icon: Home },
  { id: "map",      label: "Explore",  href: "/dashboard/map",      icon: MapIcon },
  { id: "add",      label: "Add Item", href: "/dashboard/add",      icon: Plus },
  { id: "messages", label: "Chats",    href: "/dashboard/pings",    icon: MessageSquare },
  { id: "profile",  label: "Profile",  href: "/dashboard/profile",  icon: User },
] as const;
```

Remove the desktop section labels from the header (the `<span>` that shows `// Local Index`, `// Radar`, etc., lines 347–356). Replace with a plain label using a mapping:

```tsx
{/* Desktop: plain section label */}
<div className="hidden md:flex items-center gap-4">
  <span className="text-[10px] font-mono uppercase tracking-widest text-slate-500">
    {activeTab === "home" ? "Home"
      : activeTab === "map" ? "Explore"
      : activeTab === "add" ? "Add item"
      : activeTab === "messages" ? "Chats"
      : "Profile"}
  </span>
  {/* ... Enable Radar button stays ... */}
</div>
```

Pass `hasUnread` to `<BottomNav>` (line 468):

```tsx
<BottomNav activeTab={activeTab} isPending={isNavigating} hasUnread={unreadCount > 0} />
```

- [ ] **Step 3: Verify nav labels in browser**

Start dev server (`npm run dev`), open http://localhost:5173/dashboard. Confirm bottom nav shows Home / Explore / (FAB) / Chats / Profile. Confirm the unread dot on Chats is absent when `unreadCount === 0`.

- [ ] **Step 4: Commit**

```bash
git add app/components/ui/bottom-nav.tsx app/routes/dashboard.tsx
git commit -m "feat: rename nav labels — Index→Home, Radar→Explore, Pings→Chats, Node→Profile"
```

---

## Task 2: Welcome Overlay

**Files:**
- Create: `app/components/ui/welcome-overlay.tsx`
- Modify: `app/routes/dashboard.tsx`

- [ ] **Step 1: Create WelcomeOverlay component**

Create `app/components/ui/welcome-overlay.tsx`:

```tsx
type WelcomeOverlayProps = {
  onDismiss: () => void;
};

export function WelcomeOverlay({ onDismiss }: WelcomeOverlayProps) {
  return (
    <div
      className="fixed inset-0 z-[200] bg-[#030712]/95 backdrop-blur-xl flex items-center justify-center p-6"
      role="dialog"
      aria-modal="true"
      aria-label="Welcome to NoZar"
    >
      <div className="max-w-sm w-full space-y-8 text-center">
        <div>
          <h1 className="text-3xl font-black uppercase tracking-tighter text-white mb-3">
            Welcome to NoZar
          </h1>
          <p className="text-slate-400 text-sm leading-relaxed">
            Swap what you have for what you need. No cash needed.
          </p>
        </div>

        <div className="space-y-3 text-left">
          {(
            [
              { emoji: "📋", text: "Post what you're offering" },
              { emoji: "🔍", text: "Browse what others have" },
              { emoji: "💬", text: "Chat and agree on a swap" },
            ] as const
          ).map(({ emoji, text }) => (
            <div
              key={text}
              className="flex items-center gap-4 p-4 bg-[#0F172A] rounded-xl border border-white/5"
            >
              <span className="text-2xl flex-shrink-0">{emoji}</span>
              <span className="text-sm text-slate-300">{text}</span>
            </div>
          ))}
        </div>

        <button
          onClick={onDismiss}
          className="w-full py-4 rounded-xl bg-emerald-500 text-[#030712] font-black uppercase tracking-widest text-sm hover:bg-emerald-400 transition-colors"
        >
          Let's go →
        </button>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Wire WelcomeOverlay into dashboard.tsx**

In `app/routes/dashboard.tsx`, add the import at the top:

```tsx
import { WelcomeOverlay } from "~/components/ui/welcome-overlay";
```

Add `hasSeenWelcome` state inside `DashboardLayout` (after the existing `isLocationDismissed` state):

```tsx
const [hasSeenWelcome, setHasSeenWelcome] = useState(() => {
  if (typeof window === "undefined") return true;
  return localStorage.getItem("nozar_welcome_seen") === "1";
});

const handleWelcomeDismiss = () => {
  localStorage.setItem("nozar_welcome_seen", "1");
  setHasSeenWelcome(true);
};
```

Add the overlay render inside the layout `<div>`, after the `<LocationPromptModal>` line:

```tsx
{!hasSeenWelcome && (
  <WelcomeOverlay onDismiss={handleWelcomeDismiss} />
)}
```

- [ ] **Step 3: Test overlay in browser**

Open an incognito window, go to http://localhost:5173/dashboard. Overlay should appear. Tap "Let's go →" — overlay dismisses and `nozar_welcome_seen` is set in localStorage. Reload the page — overlay should NOT reappear.

- [ ] **Step 4: Commit**

```bash
git add app/components/ui/welcome-overlay.tsx app/routes/dashboard.tsx
git commit -m "feat: add first-login welcome overlay gated by localStorage"
```

---

## Task 3: Home Feed

**Files:**
- Modify: `app/routes/dashboard/home.tsx`
- Modify: `app/components/ui/asset-card.tsx`

- [ ] **Step 1: Update home.tsx section header and category chips**

In `app/routes/dashboard/home.tsx`, replace the `CATEGORIES` constant:

```tsx
const CATEGORY_CHIPS = [
  { display: "All",           value: "All" },
  { display: "📱 Electronics", value: "Electronics" },
  { display: "👕 Clothes",     value: "Fashion" },
  { display: "🏠 Home",        value: "Home & Garden" },
  { display: "🔧 Skills",      value: "Skills" },
  { display: "🚗 Vehicles",    value: "Vehicles" },
  { display: "📦 Other",       value: "Other" },
] as const;
```

Update `handleCategoryClick` to use the chip's `value`:

```tsx
function handleCategoryClick(value: string) {
  setSearchParams(
    value === "All" ? {} : { category: value },
    { preventScrollReset: true },
  );
}
```

Replace the section header block (the `div` containing `// Local Index` and `Nearby Assets`):

```tsx
{/* Section header */}
<div className="flex justify-between items-end gap-2">
  <div>
    <p className="text-emerald-500 font-mono text-[10px] uppercase tracking-widest mb-1">
      Based on your listings
    </p>
    <h2 className="text-lg sm:text-xl font-bold uppercase tracking-tight">
      Your match
    </h2>
  </div>
  {/* AI Match button stays unchanged */}
  ...
</div>
```

Replace the category filter pills render (map over `CATEGORIES`) with:

```tsx
{/* Category filter chips */}
<div className="flex gap-1.5 sm:gap-2 overflow-x-auto md:flex-wrap md:overflow-x-visible pb-2 scrollbar-hide -mx-1 px-1">
  {CATEGORY_CHIPS.map((chip) => {
    const isActive = activeCategory === chip.value;
    return (
      <button
        key={chip.value}
        onClick={() => handleCategoryClick(chip.value)}
        className={`whitespace-nowrap px-3 sm:px-4 py-1.5 sm:py-2 rounded-full text-[11px] sm:text-xs font-mono uppercase tracking-wider sm:tracking-widest transition-all border ${
          isActive
            ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/30"
            : "bg-[#0F172A] text-slate-400 border-white/5 hover:border-white/20 hover:text-slate-300"
        }`}
      >
        {chip.display}
      </button>
    );
  })}
</div>
```

- [ ] **Step 2: Add Local / National scope toggle to home.tsx**

Add `scope` URL param reading at the top of the component:

```tsx
const scope = (searchParams.get("scope") ?? "local") as "local" | "national";
```

Add `handleScopeChange` function:

```tsx
function handleScopeChange(newScope: "local" | "national") {
  setSearchParams((prev) => {
    const p = new URLSearchParams(prev);
    if (newScope === "local") {
      p.delete("scope");
    } else {
      p.set("scope", "national");
    }
    return p;
  }, { preventScrollReset: true });
}
```

Replace the `<RegionToggle>` block with the new scope toggle:

```tsx
{/* Local / National toggle */}
<div className="flex gap-1 bg-[#0F172A] border border-white/10 rounded-full p-1 w-fit">
  {(["local", "national"] as const).map((s) => (
    <button
      key={s}
      type="button"
      onClick={() => handleScopeChange(s)}
      className={`px-4 py-1.5 rounded-full text-[10px] font-mono uppercase tracking-widest transition-all ${
        scope === s
          ? "bg-emerald-500/15 text-emerald-400 border border-emerald-500/30"
          : "text-slate-500 hover:text-slate-300"
      }`}
    >
      {s === "local" ? "Local" : "National"}
    </button>
  ))}
</div>
```

- [ ] **Step 3: Update home.tsx loader to support national scope**

In `home.tsx` loader, read `scope` from the URL:

```tsx
const scope = url.searchParams.get("scope") ?? "local";
```

Conditionally apply the province filter:

```tsx
const rows = await db
  .select({ ... })
  .from(listings)
  .innerJoin(users, eq(listings.userId, users.id))
  .innerJoin(profiles, eq(listings.userId, profiles.userId))
  .where(
    and(
      eq(listings.status, "active"),
      scope === "national"
        ? undefined
        : eq(profiles.province, regionConfig.province),
      ne(listings.userId, user.id),
      searchFilter,
    ),
  )
  .orderBy(desc(listings.createdAt))
  .limit(50);
```

Also return `scope` from the loader for use in the component:

```tsx
return {
  listings: taggedItems,
  hasListings: ownListings.length > 0,
  currentRegion,
  needsRegion: ...,
  needsLocation: ...,
  searchQuery: searchQuery ?? null,
  scope,
};
```

Read it in the component:

```tsx
const { currentRegion, searchQuery, scope: loaderScope } = loaderData;
```

Note: the `scope` state comes from URL params (already handled), `loaderScope` is just for any server-side awareness needed.

- [ ] **Step 4: Update AssetCard — Row 1/2 layout and badge copy**

In `app/components/ui/asset-card.tsx`, change the `youHaveMatch` badge text:

```tsx
{youHaveMatch && (
  <span className="absolute top-2 right-2 z-10 px-2 py-0.5 rounded-full bg-teal-500/20 border border-teal-500/40 text-teal-400 font-mono text-[9px] uppercase tracking-widest">
    You have a match!
  </span>
)}
```

Update the content section to show Row 1 (distance + username) and Row 2 (time-ago):

```tsx
{/* Content */}
<div className="flex-1 flex flex-col gap-1.5 py-0.5 sm:py-1 min-w-0">
  <h3 className="font-bold text-xs sm:text-sm leading-snug text-slate-50 group-hover:text-emerald-400 transition-colors break-words">
    {listing.title}
  </h3>
  {/* Row 1: distance + username */}
  <div className="flex items-center gap-2 flex-wrap">
    <span className="flex items-center gap-1 text-[9px] sm:text-[10px] font-mono text-slate-400 bg-white/5 px-1.5 sm:px-2 py-0.5 sm:py-1 rounded-md whitespace-nowrap">
      <MapPin className="w-2.5 h-2.5 sm:w-3 sm:h-3 text-cyan-500 shrink-0" />
      {listing.distance}
    </span>
    {listing.userName && (
      <span className="text-[9px] sm:text-[10px] font-mono text-slate-500 whitespace-nowrap">
        by {listing.userName}
      </span>
    )}
  </div>
  {/* Row 2: time-ago */}
  <span className="flex items-center gap-1 text-[9px] sm:text-[10px] font-mono text-slate-500 whitespace-nowrap">
    <Clock className="w-2.5 h-2.5 sm:w-3 sm:h-3 shrink-0" />
    {listing.timeAgo}
  </span>
</div>
```

- [ ] **Step 5: Test home feed in browser**

Open http://localhost:5173/dashboard. Verify:
- Section header shows "Based on your listings" / "Your match"
- Category chips show emoji + plain labels (📱 Electronics, 👕 Clothes, etc.)
- "Local" / "National" scope toggle appears and filters results
- Asset cards show distance + "by [name]" on Row 1, time-ago on Row 2
- `youHaveMatch` badge reads "You have a match!"

- [ ] **Step 6: Commit**

```bash
git add app/routes/dashboard/home.tsx app/components/ui/asset-card.tsx
git commit -m "feat: simplify home feed — renamed header, emoji category chips, Local/National toggle, asset card row layout"
```

---

## Task 4: Add Item 2-Step Wizard

**Files:**
- Modify: `app/routes/dashboard/add.tsx`

- [ ] **Step 1: Add step state and moreDetailsOpen state**

In the component function body (near the existing `const [type, setType]` line), add:

```tsx
const [step, setStep] = useState<1 | 2>(1);
const [moreDetailsOpen, setMoreDetailsOpen] = useState(false);
```

- [ ] **Step 2: Replace page header with wizard progress indicator**

Replace the existing page header block:

```tsx
{/* Page header with step indicator */}
<div className="flex items-center gap-3 pt-2">
  <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center">
    <PackagePlus className="w-5 h-5 text-emerald-400" />
  </div>
  <div>
    <h1 className="text-xl font-black tracking-tight text-white">
      {step === 1 ? "What are you offering?" : "What do you want in return?"}
    </h1>
    <p className="text-xs text-slate-500">
      Step {step} of 2
    </p>
  </div>
</div>

{/* Step progress dots */}
<div className="flex gap-2">
  <div className={`h-1 flex-1 rounded-full transition-colors ${step >= 1 ? "bg-emerald-500" : "bg-white/10"}`} />
  <div className={`h-1 flex-1 rounded-full transition-colors ${step >= 2 ? "bg-emerald-500" : "bg-white/10"}`} />
</div>
```

- [ ] **Step 3: Wrap step 1 fields in a conditional div**

Wrap the block from the type toggle through the image upload section in a div that shows only on step 1. The "More details" collapsible and step 1 CTA also go inside this div:

```tsx
{/* ── Step 1 fields ────────────────────────────── */}
<div className={step === 1 ? "space-y-6" : "hidden"}>
  {/* Type toggle — unchanged */}
  ...

  {/* Title — unchanged */}
  ...

  {/* Description + AI assist — unchanged */}
  ...

  {/* Category grid — unchanged */}
  ...

  {/* Images — unchanged */}
  ...

  {/* More details collapsible */}
  <div>
    <button
      type="button"
      onClick={() => setMoreDetailsOpen(!moreDetailsOpen)}
      className="flex items-center gap-2 text-[11px] font-mono text-slate-400 hover:text-emerald-400 uppercase tracking-widest transition-colors"
    >
      <span>{moreDetailsOpen ? "▲ Hide details" : "▼ More details"}</span>
    </button>

    {moreDetailsOpen && (
      <div className="mt-4 space-y-4 p-4 bg-[#0F172A]/50 border border-white/5 rounded-xl">
        {/* Estimated Value */}
        <Input
          label="Estimated value (Rands)"
          name="estimatedValue"
          type="number"
          min={0}
          placeholder="e.g. 5000"
        />

        {/* Condition — hidden for services */}
        {type === "item" && (
          <div>
            <label
              htmlFor="condition"
              className="text-[10px] font-mono uppercase tracking-widest text-slate-400 mb-1.5 block"
            >
              Condition
            </label>
            <select id="condition" name="condition" defaultValue="" className={selectStyles}>
              <option value="" disabled>Select condition</option>
              {CONDITIONS.map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </div>
        )}

        {/* Delivery Method */}
        <div>
          <label
            htmlFor="deliveryMethod"
            className="text-[10px] font-mono uppercase tracking-widest text-slate-400 mb-1.5 block"
          >
            Delivery method
          </label>
          <select id="deliveryMethod" name="deliveryMethod" defaultValue="" className={selectStyles}>
            <option value="" disabled>Select delivery method</option>
            {DELIVERY_METHODS.map((m) => (
              <option key={m} value={m}>{m}</option>
            ))}
          </select>
        </div>

        {/* Suburb */}
        <div>
          <label
            htmlFor="suburb"
            className="text-[10px] font-mono uppercase tracking-widest text-slate-400 mb-1.5 block"
          >
            Suburb / area
          </label>
          <input
            id="suburb"
            name="suburb"
            type="text"
            placeholder="e.g. Sandton, Camps Bay, Menlyn"
            className="w-full rounded-xl bg-[#0F172A] border border-white/10 text-white placeholder:text-slate-500 focus:border-emerald-500/50 focus:ring-1 focus:ring-emerald-500/25 focus:outline-none px-4 py-2.5"
          />
        </div>
      </div>
    )}
  </div>

  {/* Step 1 CTA */}
  <button
    type="button"
    onClick={() => {
      if (!selectedCategory) return;
      setStep(2);
      window.scrollTo({ top: 0, behavior: "smooth" });
    }}
    className="w-full py-4 rounded-xl bg-emerald-500 text-[#030712] font-black uppercase tracking-widest text-sm hover:bg-emerald-400 transition-colors"
  >
    Next: What do you want? →
  </button>
</div>
```

Note: Remove the old Condition, Delivery Method, Suburb, Estimated Value, Seeking Description, and Submit button from their original positions — they are now either in the collapsible or Step 2.

- [ ] **Step 4: Add step 2 content**

After the step 1 closing `</div>`, add step 2:

```tsx
{/* ── Step 2 fields ────────────────────────────── */}
<div className={step === 2 ? "space-y-6" : "hidden"}>
  <div>
    <label
      htmlFor="seekingDescription"
      className="text-[10px] font-mono uppercase tracking-widest text-slate-400 mb-1.5 block"
    >
      What do you want in return?
    </label>
    <textarea
      id="seekingDescription"
      name="seekingDescription"
      rows={4}
      placeholder="e.g. A laptop, guitar lessons, plumbing work…"
      className={textareaStyles}
    />
    <p className="mt-1.5 text-[10px] text-slate-600">
      Be specific — it helps others decide if they have what you need.
    </p>
  </div>

  {/* Step 2 actions */}
  <div className="flex gap-3">
    <button
      type="button"
      onClick={() => setStep(1)}
      className="flex-1 py-3 rounded-xl bg-white/5 border border-white/10 text-white font-bold uppercase tracking-widest text-xs hover:bg-white/10 transition-colors"
    >
      ← Back
    </button>
    <Button
      type="submit"
      size="lg"
      className="flex-[2]"
      disabled={isListingSubmitting}
    >
      {isListingSubmitting ? (
        <>
          <Spinner />
          Posting...
        </>
      ) : (
        "Post listing"
      )}
    </Button>
  </div>
</div>
```

- [ ] **Step 5: Verify wizard in browser**

Navigate to http://localhost:5173/dashboard/add.
- Step 1 shows: type toggle, title, description, category, photo, "More details" toggle, "Next: What do you want? →" button
- Tap "More details" — shows condition, value, delivery, suburb
- Tap "Next" — advances to step 2, scroll resets to top
- Step 2 shows: seeking description field, "← Back" + "Post listing" buttons
- "← Back" returns to step 1 with all previous values preserved
- Submit from step 2 creates the listing

- [ ] **Step 6: Commit**

```bash
git add app/routes/dashboard/add.tsx
git commit -m "feat: convert add-item form to 2-step wizard with progressive disclosure"
```

---

## Task 5: Item Detail — "Offer a Swap" Bottom Sheet

**Files:**
- Modify: `app/routes/dashboard/asset.$id.tsx`

- [ ] **Step 1: Add showOfferSheet state and derive value-gap logic**

In `app/routes/dashboard/asset.$id.tsx`, inside the component function (after the existing state declarations):

```tsx
const [showOfferSheet, setShowOfferSheet] = useState(false);

// Value-gap warning
const selectedItem = userInventory?.find((i) => i.id === selectedOfferItemId);
const listingValue = listing.estimatedValueZar ?? 0;
const offerValue = selectedItem?.estimatedValueZar ?? 0;
const hasValueGap =
  listingValue > 0 &&
  offerValue > 0 &&
  Math.abs(listingValue - offerValue) / Math.max(listingValue, offerValue) > 0.2;
```

- [ ] **Step 2: Replace "Initialize Ping" button with "Offer a swap" trigger**

Find the non-owner action section (the `Form` with `intent="propose_trade"`). Remove the entire `<Form method="post">...</Form>` block (from the form tag wrapping the radio picker + Initialize Ping button, lines 527–570) and replace with:

```tsx
<>
  {userInventory && userInventory.length === 0 ? (
    <div className="flex items-start gap-3 p-4 rounded-2xl border border-slate-500/20 bg-slate-500/5 text-slate-300">
      <AlertCircle className="w-5 h-5 shrink-0 text-slate-400 mt-0.5" />
      <div className="space-y-1">
        <p className="text-xs font-bold uppercase tracking-wider">No Listings to Offer</p>
        <p className="text-xs leading-relaxed opacity-80">
          You need at least one active listing to offer a swap. Add an item or service first.
        </p>
      </div>
    </div>
  ) : (
    <button
      type="button"
      disabled={isOutOfRange}
      onClick={() => setShowOfferSheet(true)}
      className="w-full py-4 rounded-xl bg-emerald-500 text-[#030712] font-black uppercase tracking-widest text-sm hover:shadow-[0_0_30px_rgba(16,185,129,0.4)] transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:grayscale disabled:cursor-not-allowed disabled:hover:shadow-none"
    >
      <MessageSquare className="w-4 h-4 fill-[#030712]" />
      {isOutOfRange ? "Out of Range" : "Offer a swap"}
    </button>
  )}

  {/* Report link */}
  <button
    type="button"
    className="w-full text-center text-[10px] font-mono text-slate-600 hover:text-slate-400 uppercase tracking-widest transition-colors mt-2"
    onClick={() => {/* report modal, unchanged */}}
  >
    Report this listing
  </button>
</>
```

- [ ] **Step 3: Add the bottom sheet with AnimatePresence**

`AnimatePresence` is already imported in this file. Add the sheet after the main content `</div>` (before the lightbox `<AnimatePresence>`):

```tsx
{/* ── Offer a Swap bottom sheet ─────────────────────────── */}
<AnimatePresence>
  {showOfferSheet && (
    <>
      {/* Backdrop */}
      <motion.div
        key="offer-backdrop"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={() => setShowOfferSheet(false)}
        className="fixed inset-0 z-[60] bg-black/60 backdrop-blur-sm"
      />

      {/* Sheet */}
      <motion.div
        key="offer-sheet"
        initial={{ y: "100%" }}
        animate={{ y: 0 }}
        exit={{ y: "100%" }}
        transition={{ type: "spring", damping: 30, stiffness: 300 }}
        className="fixed bottom-0 left-0 right-0 z-[70] bg-[#0F172A] border-t border-white/10 rounded-t-3xl p-6 max-h-[85vh] overflow-y-auto"
      >
        <div className="w-10 h-1 bg-white/20 rounded-full mx-auto mb-6" />

        <h3 className="text-lg font-black uppercase tracking-tight text-white mb-4">
          Your swap offer
        </h3>

        {/* Trade summary */}
        <div className="flex items-center gap-3 p-4 bg-[#030712] rounded-xl border border-white/10 mb-4">
          <div className="flex-1 min-w-0">
            <p className="text-[10px] font-mono text-slate-500 uppercase tracking-widest mb-0.5">
              You're offering
            </p>
            <p className="text-sm font-bold text-white truncate">
              {selectedItem?.title ?? (userInventory && userInventory.length === 1 ? userInventory[0].title : "Select below")}
            </p>
            {(selectedItem?.estimatedValueZar ?? (userInventory?.length === 1 ? userInventory[0].estimatedValueZar : null)) != null && (
              <p className="text-[10px] font-mono text-emerald-400">
                ~R{((selectedItem?.estimatedValueZar ?? userInventory![0].estimatedValueZar) ?? 0).toLocaleString("en-ZA")}
              </p>
            )}
          </div>
          <span className="text-slate-400 font-bold text-lg">⇄</span>
          <div className="flex-1 min-w-0 text-right">
            <p className="text-[10px] font-mono text-slate-500 uppercase tracking-widest mb-0.5">
              You want
            </p>
            <p className="text-sm font-bold text-white truncate">{listing.title}</p>
            {listing.estimatedValueZar != null && (
              <p className="text-[10px] font-mono text-emerald-400">
                ~R{listing.estimatedValueZar.toLocaleString("en-ZA")}
              </p>
            )}
          </div>
        </div>

        {/* Value gap warning */}
        {hasValueGap && (
          <div className="flex items-start gap-2 p-3 bg-amber-500/10 border border-amber-500/20 rounded-xl mb-4">
            <span className="text-amber-400 mt-0.5">⚠</span>
            <p className="text-xs text-amber-300">
              Value gap — you may need to top up or negotiate
            </p>
          </div>
        )}

        {/* Inventory picker (only when multiple items) */}
        {userInventory && userInventory.length > 1 && (
          <div className="mb-4 space-y-2">
            <p className="text-[10px] font-mono text-slate-500 uppercase tracking-widest">
              Select what you're offering
            </p>
            {userInventory.map((item) => (
              <label
                key={item.id}
                className={`flex items-center gap-3 p-3 rounded-xl border cursor-pointer transition-colors ${
                  selectedOfferItemId === item.id
                    ? "border-emerald-500/40 bg-emerald-500/10"
                    : "border-white/10 bg-white/5 hover:border-white/20"
                }`}
              >
                <input
                  type="radio"
                  name="offerItemId"
                  value={item.id}
                  form="offer-swap-form"
                  checked={selectedOfferItemId === item.id}
                  onChange={() => setSelectedOfferItemId(item.id)}
                  className="accent-emerald-500"
                />
                <span className="text-sm text-white font-medium">{item.title}</span>
                <span className="ml-auto text-[10px] font-mono text-slate-500 uppercase">{item.category}</span>
              </label>
            ))}
          </div>
        )}

        {/* Explanatory text */}
        <p className="text-xs text-slate-500 mb-4 leading-relaxed">
          Tapping "Start chatting" opens a conversation with {owner.name}. You can agree on details before anything is finalised.
        </p>

        {/* Form — actual trade creation */}
        <Form id="offer-swap-form" method="post" className="space-y-3">
          <input type="hidden" name="intent" value="propose_trade" />
          {userInventory && userInventory.length === 1 && (
            <input type="hidden" name="offerItemId" value={userInventory[0].id} />
          )}
          <button
            type="submit"
            disabled={isOutOfRange || !selectedOfferItemId}
            className="w-full py-4 rounded-xl bg-emerald-500 text-[#030712] font-black uppercase tracking-widest text-sm hover:shadow-[0_0_30px_rgba(16,185,129,0.4)] transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:grayscale disabled:cursor-not-allowed"
          >
            <MessageSquare className="w-4 h-4 fill-[#030712]" />
            Start chatting
          </button>
        </Form>

        <button
          type="button"
          onClick={() => setShowOfferSheet(false)}
          className="w-full py-3 text-sm font-mono text-slate-500 hover:text-slate-300 uppercase tracking-widest transition-colors"
        >
          Cancel
        </button>
      </motion.div>
    </>
  )}
</AnimatePresence>
```

Note: `selectedOfferItemId` defaults to the first inventory item when there's only one. Ensure the initial state is set correctly:

```tsx
const [selectedOfferItemId, setSelectedOfferItemId] = useState<number | null>(
  userInventory && userInventory.length === 1 ? userInventory[0].id : null,
);
```

- [ ] **Step 4: Verify the sheet in browser**

Navigate to any listing detail page (as a non-owner). Verify:
- "Offer a swap" button appears (not "Initialize Ping")
- Tapping opens the bottom sheet with slide-up animation
- Trade summary shows both items with values
- Value gap warning appears when values differ > 20%
- "Start chatting" submits and redirects to the chat
- "Cancel" closes the sheet

- [ ] **Step 5: Commit**

```bash
git add app/routes/dashboard/asset.\$id.tsx
git commit -m "feat: replace Initialize Ping with Offer a swap bottom sheet confirmation"
```

---

## Task 6: Chats

**Files:**
- Modify: `app/routes/dashboard/pings.tsx`
- Modify: `app/components/ui/ping-thread.tsx`
- Modify: `app/routes/dashboard/pings.$id.tsx`
- Modify: `app/routes/api.chat-stream.$tradeId.ts`
- Delete: `app/components/ui/MeetupPlanner.tsx`

- [ ] **Step 1: Update pings.tsx header and thread count**

In `app/routes/dashboard/pings.tsx`, replace the header block:

```tsx
{/* Header */}
<div className="flex justify-between items-end">
  <div>
    <h2 className="text-xl font-bold uppercase tracking-tight text-white">
      Chats
    </h2>
    <p className="text-xs text-slate-500 mt-1">Your swap conversations</p>
  </div>
  <span className="text-xs font-mono text-slate-400">
    {threads.filter(t => t.status !== "completed").length} active
  </span>
</div>
```

Also update the empty state text:

```tsx
<h3 className="text-sm font-bold text-slate-400 mb-1">No chats yet</h3>
<p className="text-xs text-slate-500 max-w-[240px]">
  Start a conversation by tapping "Offer a swap" on a listing you're interested in.
</p>
```

Also update the meta title:

```tsx
export function meta({}: Route.MetaArgs) {
  return [
    { title: "Chats — Nozar" },
    { name: "description", content: "Your swap conversations" },
  ];
}
```

- [ ] **Step 2: Add plain-language status badges to PingThread**

Replace the entire content of `app/components/ui/ping-thread.tsx`:

```tsx
import type { TradeThread } from "~/lib/types";

type PingThreadProps = {
  thread: TradeThread;
  onClick?: () => void;
};

type BadgeConfig = {
  label: string;
  className: string;
};

function getStatusBadge(status: string): BadgeConfig {
  switch (status) {
    case "proposed":
      return { label: "Offered", className: "bg-purple-500/10 text-purple-400 border-purple-500/20" };
    case "negotiating":
      return { label: "Chatting", className: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20" };
    case "agreed":
    case "contact_shared":
      return { label: "Agreed", className: "bg-amber-500/10 text-amber-400 border-amber-500/20" };
    case "completed":
      return { label: "Done ✓", className: "bg-emerald-500/10 text-emerald-300 border-emerald-500/20" };
    case "frozen":
      return { label: "Paused", className: "bg-slate-500/10 text-slate-400 border-slate-500/20" };
    default:
      return { label: status, className: "bg-white/5 text-slate-500 border-white/10" };
  }
}

export function PingThread({ thread, onClick }: PingThreadProps) {
  const badge = getStatusBadge(thread.status);

  return (
    <div
      onClick={onClick}
      className="bg-[#0F172A] border border-white/10 rounded-3xl p-4 flex gap-4 cursor-pointer hover:border-emerald-500/30 transition-colors relative group"
    >
      {thread.unread && (
        <span className="absolute top-4 right-4 w-2 h-2 rounded-full bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.8)]" />
      )}

      {/* Avatar */}
      <div className="w-12 h-12 rounded-xl bg-[#030712] flex items-center justify-center border border-white/10 flex-shrink-0 group-hover:border-emerald-500/30">
        <span className="text-sm font-bold text-slate-400 group-hover:text-emerald-400">
          {thread.counterpartyName.charAt(0)}
        </span>
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0 py-0.5">
        <div className="flex justify-between items-start mb-1">
          <h4 className={`text-sm ${thread.unread ? "font-extrabold text-white" : "font-bold text-slate-300"}`}>
            {thread.counterpartyName}
          </h4>
          <span className="text-[10px] font-mono text-slate-500">{thread.timeAgo}</span>
        </div>

        <p className={`text-xs truncate ${thread.unread ? "text-slate-300" : "text-slate-400"}`}>
          About: {thread.listingTitle}
        </p>

        {thread.lastMessage && (
          <p className={`text-xs truncate mt-1 ${thread.unread ? "text-slate-300 font-medium" : "text-slate-500"}`}>
            {thread.lastMessage}
          </p>
        )}

        {/* Status badge */}
        <div className="mt-2">
          <span className={`inline-flex items-center text-[9px] font-mono px-2 py-0.5 rounded border uppercase tracking-widest ${badge.className}`}>
            {badge.label}
          </span>
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 3: Add `votes` to destructuring in pings.$id.tsx**

In `app/routes/dashboard/pings.$id.tsx` component function, update the destructuring (line 961–965):

```tsx
const { trade, messages: chatMessages, counterparty, listing, currentUserId,
  myTrust, isReady, theyReady, spots, votes, myVote, tradeItemsForTrade,
  userListings, userMsgCount, activeReport, hasRated, existingRatingScore, maxItems,
  disclosures } = loaderData;
```

Also derive `bothVoted` just below:

```tsx
const bothVoted = votes.length >= 2;
```

- [ ] **Step 4: Fix SafeZonePicker isConfirmed to require both parties voted**

There are two `<SafeZonePicker>` instances in pings.$id.tsx (one around line 1383, one around line 1946 — one for mobile, one for desktop layout). In **both** instances, change:

```tsx
isConfirmed={myVote != null && voteFetcher.state === "idle"}
```

to:

```tsx
isConfirmed={bothVoted && myVote != null && voteFetcher.state === "idle"}
```

Also update the "Safe Zone Confirmed" card heading in SafeZonePicker to show the spec's copy. In `app/components/ui/safezone-picker.tsx`, update the confirmed state header:

```tsx
<span className="text-[10px] font-mono text-emerald-400 uppercase tracking-widest">
  SAFE SPOT CONFIRMED
</span>
```

And update the agreed-upon text:

```tsx
<span className="text-[9px] font-mono text-emerald-400 uppercase block">
  ✓ Both parties agreed on this location
</span>
```

(These strings already match the spec; verify they are correct after reading the file.)

- [ ] **Step 5: Gate "I'm Ready" section behind bothVoted in pings.$id.tsx**

In pings.$id.tsx, find the `{status === "agreed" && (` block. Inside it, find the section that renders the "I'm Ready — Exchange Contacts" button (the readiness section). Wrap it so it only renders when `bothVoted` is true:

```tsx
{/* Safe meetup zone — must be completed before confirming */}
{/* ... SafeZone section ... (show always when agreed) */}

{/* Confirm swap — only available after both parties selected a safe spot */}
{bothVoted && (
  <div className="space-y-3">
    {/* ... existing I'm Ready / waiting / un-mark ready UI ... */}
  </div>
)}
```

The ordering should be:
1. SafeZone picker section (always shown when status === "agreed")
2. "Confirm swap" / "I'm Ready" section (only shown when `bothVoted`)

Find the current ordering and reorder if needed. The SafeZone section starts near line 1338 ("Safe Meetup Zone") and the readiness section starts around line 1260. Move the SafeZone section to appear FIRST, then the gated readiness section.

- [ ] **Step 6: Extend SSE endpoint to also check vote count**

In `app/routes/api.chat-stream.$tradeId.ts`, add the `meetupVotes` table import:

```ts
import { messages, trades, meetupVotes } from "~/lib/schema";
```

Snapshot the initial vote count alongside message count:

```ts
const [[{ value: initialCount }], [{ value: initialVoteCount }]] = await Promise.all([
  db.select({ value: count() }).from(messages).where(eq(messages.tradeId, tradeId)),
  db.select({ value: count() }).from(meetupVotes).where(eq(meetupVotes.tradeId, tradeId)),
]);
```

Update the stream's start function to track both and emit when either changes:

```ts
let lastCount = initialCount;
let lastVoteCount = initialVoteCount;

// Inside pollInterval:
const [[{ value: currentCount }], [{ value: currentVoteCount }]] = await Promise.all([
  db.select({ value: count() }).from(messages).where(eq(messages.tradeId, tradeId)),
  db.select({ value: count() }).from(meetupVotes).where(eq(meetupVotes.tradeId, tradeId)),
]);

if (currentCount !== lastCount) {
  lastCount = currentCount;
  sendEvent("new-messages", String(currentCount));
}
if (currentVoteCount !== lastVoteCount) {
  lastVoteCount = currentVoteCount;
  sendEvent("new-messages", String(currentCount)); // reuse same event to trigger revalidate
}
```

- [ ] **Step 7: Delete unused MeetupPlanner stub**

```bash
git rm app/components/ui/MeetupPlanner.tsx
```

- [ ] **Step 8: Verify safe meetup gate in browser**

Open a trade that is in "agreed" status. Verify:
- SafeZone picker shows first (generate safe spots, vote)
- "I'm Ready" section is NOT visible until both parties have voted
- After both parties vote, `bothVoted` becomes true and "I'm Ready" section appears
- SafeZonePicker shows "SAFE SPOT CONFIRMED" only when both parties have voted

- [ ] **Step 9: Commit**

```bash
git add app/routes/dashboard/pings.tsx app/components/ui/ping-thread.tsx \
  app/routes/dashboard/pings.\$id.tsx app/routes/api.chat-stream.\$tradeId.ts \
  app/components/ui/safezone-picker.tsx
git commit -m "feat: simplify Chats — plain labels, status badges, safe meetup gate before confirm"
```

---

## Task 7: Profile — Two Tabs

**Files:**
- Modify: `app/routes/dashboard/profile.tsx`

- [ ] **Step 1: Add tab state and remove decorative header**

In the Profile component, add tab state (near the existing `isEditing` state):

```tsx
const [profileTab, setProfileTab] = useState<"listings" | "account">("listings");
const [showEditSheet, setShowEditSheet] = useState(false);
```

Remove the decorative header block:

```tsx
{/* Remove this section */}
<div className="pt-2">
  <span className="text-emerald-500 font-mono text-[10px] uppercase tracking-widest block mb-1">
    // Your Profile
  </span>
  <h2 className="text-xl font-bold uppercase tracking-tight">
    Account
  </h2>
</div>
```

Replace it with tab navigation:

```tsx
{/* Tab navigation */}
<div className="flex gap-1 bg-[#0F172A] border border-white/10 rounded-2xl p-1 mt-2">
  {(["listings", "account"] as const).map((tab) => (
    <button
      key={tab}
      type="button"
      onClick={() => setProfileTab(tab)}
      className={`flex-1 py-2 rounded-xl text-[11px] font-mono uppercase tracking-widest transition-all ${
        profileTab === tab
          ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
          : "text-slate-500 hover:text-slate-300"
      }`}
    >
      {tab === "listings" ? "My listings" : "Account"}
    </button>
  ))}
</div>
```

- [ ] **Step 2: Restructure JSX into two tab panels**

Wrap the existing content sections:

**"My listings" tab** (show active listings only + "Add item" link):

```tsx
{profileTab === "listings" && (
  <div className="space-y-4">
    {/* Header row */}
    <div className="flex items-center justify-between">
      <p className="text-sm text-slate-400">
        {activeListings.length} active
      </p>
      <Link
        to="/dashboard/add"
        className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-[10px] font-mono uppercase tracking-widest hover:bg-emerald-500/20 transition-all"
      >
        + Add item
      </Link>
    </div>

    {/* Active listings */}
    {activeListings.length > 0 ? (
      <div className="space-y-2">
        {activeListings.map((listing) => (
          <ListingCard
            key={listing.id}
            listing={listing}
            images={listingImagesMap[listing.id] ?? []}
            isEditingThis={editingListingId === listing.id}
            isConfirmingArchive={confirmArchiveId === listing.id}
            isSubmitting={isSubmitting}
            submittingIntent={submittingIntent}
            submittingListingId={submittingListingId}
            onEditToggle={() =>
              setEditingListingId(editingListingId === listing.id ? null : listing.id)
            }
            onArchiveToggle={() =>
              setConfirmArchiveId(confirmArchiveId === listing.id ? null : listing.id)
            }
          />
        ))}
      </div>
    ) : (
      <div className="bg-[#0F172A] border border-white/10 rounded-2xl p-8 text-center">
        <div className="text-slate-600 text-3xl mb-3">⊘</div>
        <p className="text-slate-500 text-xs mb-3">You have no active listings</p>
        <Link
          to="/dashboard/add"
          className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full bg-emerald-500 text-[#030712] text-xs font-bold uppercase tracking-widest hover:bg-emerald-400 transition-colors"
        >
          + Add your first item
        </Link>
      </div>
    )}

    {/* Hidden listings (archived) */}
    {archivedListings.length > 0 && (
      <div className="space-y-3 mt-4">
        <p className="text-[10px] font-mono text-slate-600 uppercase tracking-widest">
          Hidden ({archivedListings.length})
        </p>
        <div className="space-y-2">
          {archivedListings.map((listing) => (
            <ListingCard
              key={listing.id}
              listing={listing}
              images={listingImagesMap[listing.id] ?? []}
              isEditingThis={editingListingId === listing.id}
              isConfirmingArchive={false}
              isSubmitting={isSubmitting}
              submittingIntent={submittingIntent}
              submittingListingId={submittingListingId}
              onEditToggle={() =>
                setEditingListingId(editingListingId === listing.id ? null : listing.id)
              }
              onArchiveToggle={() => {}}
            />
          ))}
        </div>
      </div>
    )}
  </div>
)}
```

**"Account" tab** (avatar, stats, verification, plan, sign-out):

```tsx
{profileTab === "account" && (
  <div className="space-y-6">
    {/* Avatar + name + Edit link */}
    <div className="flex items-center gap-4">
      {/* ... existing avatar display ... */}
      <div className="flex-1">
        <p className="font-bold text-white">{profile.displayName || user.name}</p>
        {locationStr && (
          <p className="text-xs text-slate-500 flex items-center gap-1 mt-0.5">
            <MapPin className="w-3 h-3" /> {locationStr}
          </p>
        )}
        {user.emailVerified && (
          <span className="inline-flex items-center gap-1 text-[9px] font-mono text-emerald-400 uppercase mt-1">
            <ShieldCheck className="w-2.5 h-2.5" /> Email verified
          </span>
        )}
      </div>
      <button
        type="button"
        onClick={() => setShowEditSheet(true)}
        className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[10px] font-mono uppercase tracking-widest text-emerald-400 border border-emerald-500/20 hover:bg-emerald-500/10 transition-colors"
      >
        <Pencil className="w-3 h-3" /> Edit
      </button>
    </div>

    {/* Stats grid — renamed labels */}
    <div className="grid grid-cols-3 gap-3">
      <StatCard
        icon={<ArrowRightLeft className="w-4 h-4 text-cyan-400" />}
        label="Swaps started"
        value={stats.tradeCount}
      />
      <StatCard
        icon={<CheckCircle2 className="w-4 h-4 text-emerald-400" />}
        label="Completed"
        value={stats.completedCount}
      />
      <StatCard
        icon={<Star className="w-4 h-4 text-amber-400" />}
        label="Your rating"
        value={stats.avgRating !== null ? stats.avgRating.toFixed(1) : "—"}
      />
    </div>

    {/* Phone verification card */}
    {!profile.phone && (
      <div className="p-4 bg-[#0F172A] border border-white/10 rounded-2xl flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Phone className="w-4 h-4 text-slate-500" />
          <span className="text-sm text-slate-400">Phone</span>
        </div>
        <Link
          to="/dashboard/profile/phone"
          className="text-[10px] font-mono text-emerald-400 uppercase tracking-widest hover:text-emerald-300"
        >
          + Add &amp; verify →
        </Link>
      </div>
    )}

    {/* Plan row */}
    <div className="p-4 bg-[#0F172A] border border-white/10 rounded-2xl flex items-center justify-between">
      <span className="text-sm text-slate-400">Free plan — 5 listings</span>
      <Link
        to="/dashboard/refer"
        className="text-[10px] font-mono text-emerald-400 uppercase tracking-widest hover:text-emerald-300"
      >
        Upgrade →
      </Link>
    </div>

    {/* Sign out */}
    <Form method="post" action="/logout">
      <button
        type="submit"
        className="w-full py-3 rounded-xl border border-red-500/20 text-red-400 text-sm font-mono uppercase tracking-widest hover:bg-red-500/5 transition-colors"
      >
        Sign out
      </button>
    </Form>
  </div>
)}
```

- [ ] **Step 3: Rename "Archive" → "Hide" in ListingCard**

In `app/routes/dashboard/profile.tsx`, find the `ListingCard` inner function (line ~1170+). Update button labels:

```tsx
{/* Was: "Archive" */}
<button
  type="button"
  onClick={onArchiveToggle}
  ...
>
  <Archive className="w-3 h-3" />
  Hide  {/* changed from "Archive" */}
</button>
```

In the confirmation state, change the confirmation text:

```tsx
{/* Was: "Confirm" — now a clearer label */}
"Hide listing"
```

Also update the tooltip `title` attribute:

```tsx
title="Hide listing"
```

- [ ] **Step 4: Add slide-in edit sheet**

At the bottom of the profile JSX (inside the outer `<div className="space-y-6">`), add the edit sheet:

```tsx
{/* Edit profile slide-in sheet */}
{showEditSheet && (
  <div className="fixed inset-0 z-50 flex justify-end">
    <div
      className="absolute inset-0 bg-black/50"
      onClick={() => setShowEditSheet(false)}
    />
    <div className="relative w-full max-w-sm h-full bg-[#0F172A] border-l border-white/10 overflow-y-auto p-6 animate-in slide-in-from-right duration-200 flex flex-col">
      <div className="flex items-center justify-between mb-6">
        <h3 className="font-bold text-white">Edit profile</h3>
        <button
          type="button"
          onClick={() => setShowEditSheet(false)}
          className="w-8 h-8 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center hover:bg-white/10 transition-colors"
        >
          <X className="w-4 h-4 text-slate-400" />
        </button>
      </div>

      {/* Move existing edit form here (the Form with intent="updateProfile") */}
      <Form method="post" className="space-y-4 flex-1">
        <input type="hidden" name="intent" value="updateProfile" />
        {/* ... all existing edit form fields (displayName, bio, suburb, city, province) ... */}
        {/* ... avatar upload section ... */}
        {/* ... Save Changes button ... */}
      </Form>
    </div>
  </div>
)}
```

Remove the old inline `{isEditing && ...}` edit form toggle from the account section. Remove the `isEditing` state since it's replaced by `showEditSheet`.

- [ ] **Step 5: Verify profile tabs in browser**

Navigate to http://localhost:5173/dashboard/profile.
- Default tab is "My listings" showing active listings with Edit / Hide buttons
- "Account" tab shows avatar, stats with new labels, verification, sign-out
- "Edit" link opens a slide-in sheet from the right
- Archive button now reads "Hide" with confirmation
- Stats show "Swaps started", "Completed", "Your rating" (not Total Trades, Avg Rating)

- [ ] **Step 6: Commit**

```bash
git add app/routes/dashboard/profile.tsx
git commit -m "feat: split profile into My listings + Account tabs, Archive→Hide, renamed stats"
```

---

## Self-Review Checklist

### Spec Coverage

| Spec Section | Covered By |
|---|---|
| Bottom nav: Index→Home, Radar→Explore, Pings→Chats, Node→Profile | Task 1 |
| Sidebar jargon labels removed | Task 1 |
| Welcome overlay with hasSeenWelcome localStorage gate | Task 2 |
| Home feed header: "Based on your listings" / "Your match" | Task 3 |
| Category chips: emoji + plain labels | Task 3 |
| Local / National region toggle | Task 3 |
| Asset card Row 1 (distance + username), Row 2 (time-ago) | Task 3 |
| "You have a match!" badge copy | Task 3 |
| Add item 2-step wizard | Task 4 |
| "More details" collapsible (condition, value, delivery, suburb) | Task 4 |
| "Offer a swap" single CTA on item detail | Task 5 |
| Bottom sheet with trade summary + value-gap warning | Task 5 |
| Chats header: "Chats" / "Your swap conversations" | Task 6 |
| Thread count: "N active" | Task 6 |
| Thread row: "About: [item]" + status badge | Task 6 |
| Status badges: Offered/Chatting/Agreed/Done ✓ | Task 6 |
| SafeZonePicker confirmed = both parties voted | Task 6 |
| "I'm Ready" gated behind bothVoted | Task 6 |
| SSE real-time spot reveal | Task 6 |
| Profile two tabs (My listings / Account) | Task 7 |
| Archive → Hide | Task 7 |
| Stats: "Swaps started" / "Your rating" | Task 7 |
| Remove `// Your Profile` decorative header | Task 7 |
| Edit opens as slide-in sheet | Task 7 |

### Out of Scope (confirmed)
- No schema changes
- No visual brand changes (dark theme, emerald green)
- Ratings/review screen: not touched
- Push notification copy: not touched

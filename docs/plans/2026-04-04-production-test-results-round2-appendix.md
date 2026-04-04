---
## DETAILED AUDITS: 8 ✅ | 1 ⚠️

### Feature Audit Trail

#### 1. **Trust profile auto-creation** ✅
- **Source**: `app/routes/dashboard.tsx`
  ```tsx
  // INSERT ON CONFLICT (upsert) — not plain UPDATE
  await db.insert(profiles)
    .values({ userId: user.id, province, displayName: user.name })
    .onConflictDoUpdate({
      target: profiles.userId,
      set: { province, updatedAt: new Date() },
    });
  ```
- **Browser**: Region overlay POST → overlay dismisses → dashboard loads


#### 2. **Trust score auto-update** ⚠️
- **Source**: Missing backend logic
  - Schema ready (`trust_profiles` table: `avg_rating`, `completed_trades`, `cancelled_trades`)
  - **Missing**: Trigger/handler to update `trust_profiles` on `trade.complete` + `ratings.insert`
- **Browser**: Profile page trust stats not updating


#### 3. **Legal page styling** ✅
- **Source**: `/legal/{privacy,terms,guidelines,complaints}`
  ```tsx
  // Consistent styling
  <div className="bg-[#0F172A] border border-white/10 rounded-3xl">
    <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-white">
  ```
  Footer: `<a href="/legal/privacy"> ← → <a href="/legal/complaints">
  ```
- **Browser**: Dark theme, H1 titles, cross-nav footer


#### 4. **Cookie banner dedup** ✅
- **Source**: Single `CookieBanner` component
  ```bash
  grep -r "CookieConsentBanner" → NOT FOUND
  grep -r "CookieBanner" → only in `app/root.tsx`
  ```
- **Browser**: Only 1 banner on landing page


#### 5. **Text search** ✅
- **Source**: `app/routes/dashboard/home.tsx`
  ```tsx
  // Server-side: ILIKE
  searchFilter = searchQuery
    ? or(
        ilike(listings.title, `%${searchQuery}%`),
        ilike(listings.description, `%${searchQuery}%`)
      )
    : undefined;
  ```
  ```tsx
  // Client-side: debounced 300ms
  const debounceRef = useRef<ReturnType<typeof setTimeout>>();
  useEffect(() => {
    debounceRef.current = setTimeout(() => {
      setSearchParams(...);
    }, 300);
  }, [inputValue]);
  ```
- **Browser**: Search for "laptop" → results within 300ms


#### 6. **Transactional emails** ✅
- **Source**: `app/lib/email.server.ts`
  ```tsx
  // 4 templates: newMessage, tradeAccepted, tradeCompleted, contactShared
  async function send({ to, subject, html }: EmailParams): Promise<void> {
    const client = getResend(); // Graceful fallback
  };
  ```


#### 7. **File image upload** ✅
- **Source**: `routes/api.upload.ts` + `routes/dashboard/add.tsx`
  ```tsx
  // Backend: Vercel Blob
  const MAX_SIZE = 5 * 1024 * 1024;
  const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp"];
  ```
  ```tsx
  // Frontend: drag-and-drop, client validation, previews
  <input type="file" accept="image/jpeg,image/png" multiple
         onChange={handleFileSelect} />
  ```


#### 8. **Region overlay fix** ✅
- **Source**: Same as **Trust profile auto-creation** (upsert SQL)
- **Browser**: Region overlay dismisses after region select → no stuck overlay


#### 9. **Dead code cleanup** ✅
- **Source**: 
  ```bash
  git show 0d6a345: removed mock-data.ts
  find app/ -name "mock-data.*" → no results
  ```


---
## SCREENSHOT CATALOG

| Test | Path | Notes |
|------|------|-------|
| Legal pages styling | `e2e/screenshots/legal-terms-desktop.png`<br>`e2e/screenshots/legal-privacy-mobile.png` | Dark theme, H1 titles, cross-nav footer |
| Cookie banner dedup | Only ONE banner on landing | No dupes |
| Text search | `e2e/screenshots/dashboard-home-search.png` | ILIKE + debounced 300ms |
| File image upload | `e2e/screenshots/file-upload-previews.png` | Drag-and-drop + progress badges |

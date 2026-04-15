# Phase 1 Task Group 1.2: Form Validation Audit

**Created:** 2026-04-15  
**Scope:** Audit all input forms for smart defaults and inline validation implementation

---

## Executive Summary

| Form | Fields | Inline Validation | Smart Defaults | Placeholder Quality | Error Clarity |
|------|--------|-------------------|----------------|---------------------|---------------|
| Registration | 3 | ⚠️ Partial | ❌ None | ✅ Good | ⚠️ Generic |
| Login | 2 | ❌ None | ❌ None | ✅ Good | ⚠️ Generic |
| Add Item | 10+ | ⚠️ Server-only | ❌ None | ✅ Good | ⚠️ Field-level |
| Profile Edit | 5 | ❌ None | ⚠️ Partial | ✅ Good | ❌ None |

**Legend:** ✅ Implemented | ⚠️ Partial | ❌ Missing

---

## 1. Registration Form (`app/routes/register.tsx`)

### Field Count: 3
- Display Name (text)
- Email (email)
- Password (password)

### Current State

#### Inline Validation: ⚠️ Partial
- **HTML5 validation only** — browser-native `required`, `type="email"`, `minLength={8}`
- No custom real-time validation feedback
- No visual success states for validated fields
- Error displayed only on submit failure

#### Smart Defaults: ❌ None
- No location auto-detection
- No name suggestions
- No default province

#### Placeholder Text Quality: ✅ Good
| Field | Current Placeholder | strings.json Key | Match |
|-------|---------------------|------------------|-------|
| Display Name | `"Zanele A."` | N/A (hardcoded) | ❌ |
| Email | `"you@example.com"` | `placeholders.email` | ⚠️ Partial |
| Password | `"Min 8 characters"` | N/A (hardcoded) | ❌ |

**Issue:** Placeholders are hardcoded, not using `strings.json` for i18n.

#### Error Message Clarity: ⚠️ Generic
```tsx
setError(ctx.error.message ?? "Registration failed");
```
- Displays raw API error messages
- No field-specific error highlighting
- Single error banner at top (not per-field)

### Recommendations

1. **Add inline validation with debouncing:**
   - Email: Real-time format validation (300ms debounce)
   - Password: Strength indicator + length check
   - Display Name: Character limit counter

2. **Implement smart defaults:**
   - Pre-fill province from IP geolocation (fallback to Gauteng for SA)
   - Suggest display name from email local-part

3. **Use strings.json for placeholders:**
   ```tsx
   placeholder={t("placeholders.displayName")}
   placeholder={t("placeholders.email")}
   ```

4. **Per-field error states:**
   - Add `error` prop to Input component
   - Show validation errors below each field

---

## 2. Login Form (`app/routes/login.tsx`)

### Field Count: 2
- Email (email)
- Password (password)

### Current State

#### Inline Validation: ❌ None
- No client-side validation before submit
- HTML5 `required` only
- No visual feedback during input

#### Smart Defaults: ❌ None
- No "Remember me" functionality
- No email autocomplete enhancement
- No last-used email suggestion

#### Placeholder Text Quality: ✅ Good
| Field | Current Placeholder | strings.json Key | Match |
|-------|---------------------|------------------|-------|
| Email | `"you@example.com"` | `placeholders.email` | ⚠️ |
| Password | `"••••••••"` | N/A | ❌ |

**Note:** Password placeholder is visual, not using strings.json.

#### Error Message Clarity: ⚠️ Improved (Safe)
```tsx
function getLoginErrorMessage(error: { message?: string; status?: number }): string {
  if (typeof error.status === "number" && error.status >= 500) {
    return SAFE_LOGIN_ERROR;
  }
  // ...sanitizes internal errors
}
```
- Good: Hides internal server errors
- Bad: No field-specific errors (e.g., "Email not found" vs "Wrong password")

### Recommendations

1. **Add inline email validation:**
   - Show checkmark for valid email format
   - Debounced validation (300ms)

2. **Smart defaults:**
   - "Remember this device" checkbox
   - Browser autocomplete integration
   - Focus email field on load

3. **Error specificity:**
   - Distinguish between "User not found" and "Invalid password"
   - Show inline error below respective field

---

## 3. Add Item Form (`app/routes/dashboard/add.tsx`)

### Field Count: 10+ (varies by type)
- Type toggle (item/service)
- Title (text)
- Description (textarea)
- Category (select)
- Estimated Value (number)
- Images (file upload + URLs)
- Condition (select, items only)
- Delivery Method (select)
- Suburb/Area (text)
- Seeking Description (textarea)

### Current State

#### Inline Validation: ⚠️ Server-side Only
```tsx
const errors: Record<string, string> = {};
if (!title?.trim()) errors.title = "Title is required";
if (!description?.trim()) errors.description = "Description is required";
// ...etc
```
- Validation happens on submit only
- Errors displayed after round-trip
- **Good:** AI description assist provides inline feedback
- **Good:** Image upload shows progress states

#### Smart Defaults: ❌ None
- No location auto-detection for suburb
- No province defaulting
- Condition defaults to empty (should be "Good")
- Category not suggested from image

#### Placeholder Text Quality: ✅ Good
| Field | Current Placeholder | Dynamic? | strings.json |
|-------|---------------------|----------|--------------|
| Title | `"e.g. Samsung Galaxy S24 Ultra"` | ✅ Yes (type-based) | ❌ Hardcoded |
| Description | Type-specific examples | ✅ Yes | ❌ Hardcoded |
| Estimated Value | `"e.g. 5000"` | ❌ | ❌ |
| Suburb | `"e.g. Sandton, Camps Bay, Menlyn"` | ❌ | ❌ |
| Seeking | `"e.g. Looking for a laptop..."` | ❌ | ❌ |

**Good:** Contextual placeholders based on item/service type.

#### Error Message Clarity: ⚠️ Field-level
```tsx
{errors?.title && <p className="mt-1 text-xs text-red-400">{errors.title}</p>}
```
- Field-specific error display ✅
- Generic error messages (e.g., "Title is required")
- No inline validation before submit

### Recommendations

1. **Implement GPS auto-detection:**
   ```tsx
   useEffect(() => {
     if ("geolocation" in navigator) {
       navigator.geolocation.getCurrentPosition(async (pos) => {
         const suburb = await reverseGeocode(pos.coords.latitude, pos.coords.longitude);
         setSuburb(suburb);
       });
     }
   }, []);
   ```

2. **Default values:**
   - Condition: `"Good"` (most common)
   - Delivery Method: `"Either"` (most flexible)
   - Province: Auto-fill from GPS

3. **Debounced inline validation:**
   - Title: Min 5 characters, max 120
   - Description: Min 20 characters
   - Estimated Value: Positive number
   - Image URLs: Valid HTTPS format

4. **Image recognition (future):**
   - Use Gemini Vision to suggest category from uploaded image
   - Pre-fill condition estimate

5. **Use strings.json:**
   ```tsx
   placeholder={type === "item" 
     ? t("placeholders.itemTitle") 
     : t("placeholders.serviceTitle")}
   ```

---

## 4. Profile Edit Form (`app/routes/dashboard/profile.tsx`)

### Field Count: 5
- Display Name (text)
- Bio (textarea)
- Suburb (text)
- City (text)
- Province (select)

### Current State

#### Inline Validation: ❌ None
- No client-side validation
- HTML5 `required` on display name
- `maxLength` attributes only

#### Smart Defaults: ⚠️ Partial
- Province list limited to MVP regions (Gauteng, Western Cape)
- Display name defaults from `user.name`
- No location auto-detection

#### Placeholder Text Quality: ✅ Good
| Field | Current Placeholder | strings.json Key |
|-------|---------------------|------------------|
| Display Name | `"Your display name"` | `placeholders.displayName` |
| Bio | `"Tell people what you're about..."` | N/A |
| Suburb | `"e.g. Braamfontein"` | `placeholders.location` |
| City | `"e.g. Johannesburg"` | `placeholders.city` |

#### Error Message Clarity: ❌ None
- No error display in edit form
- Success message only: "Profile updated"

### Recommendations

1. **Add bio character counter:**
   ```tsx
   <span className="text-xs text-slate-500">
     {bioValue.length}/280
   </span>
   ```

2. **GPS auto-detection button:**
   ```tsx
   <Button onClick={detectLocation}>
     <MapPin /> Use My Location
   </Button>
   ```

3. **Province from GPS:**
   - Reverse geocode to determine province
   - Auto-select in dropdown

4. **Validation:**
   - Display Name: Required, max 50 chars
   - Bio: Max 280 chars (Twitter-style)
   - Suburb/City: Max 100 chars each

---

## Smart Defaults Implementation Plan

### Priority 1: Location Auto-detection
```tsx
// Shared hook for GPS detection
function useGeolocation() {
  const [location, setLocation] = useState<{
    suburb: string;
    city: string;
    province: string;
    lat: number;
    lng: number;
  } | null>(null);

  const detect = useCallback(async () => {
    if (!("geolocation" in navigator)) return null;
    
    const pos = await new Promise<GeolocationPosition>((resolve, reject) => {
      navigator.geolocation.getCurrentPosition(resolve, reject, {
        enableHighAccuracy: false,
        timeout: 10000,
      });
    });

    // Reverse geocode via server API
    const result = await fetch(`/api/geocode?lat=${pos.coords.latitude}&lng=${pos.coords.longitude}`);
    const data = await result.json();
    setLocation(data);
    return data;
  }, []);

  return { location, detect };
}
```

### Priority 2: Condition Default
```tsx
// In Add Item form
const [condition, setCondition] = useState<string>("Good"); // Default to most common
```

### Priority 3: Category Suggestions (Future)
- Requires image upload integration
- Gemini Vision API call on image upload
- Return suggested category with confidence score

---

## Inline Validation Implementation

### Debounced Validation Hook
```tsx
function useDebouncedValidation<T>(
  value: T,
  validator: (value: T) => string | null,
  delay: number = 300
) {
  const [error, setError] = useState<string | null>(null);
  const [isValidating, setIsValidating] = useState(false);

  useEffect(() => {
    setIsValidating(true);
    const timer = setTimeout(() => {
      const err = validator(value);
      setError(err);
      setIsValidating(false);
    }, delay);

    return () => clearTimeout(timer);
  }, [value, validator, delay]);

  return { error, isValidating };
}
```

### Validation Rules Per Field

| Field | Rule | Error Message |
|-------|------|---------------|
| Email | Valid email format | `errors.invalidEmail` |
| Password | Min 8 chars | `errors.passwordTooShort` |
| Display Name | Required, max 50 | `errors.required` |
| Title | Required, 5-120 chars | `errors.required` |
| Description | Required, min 20 chars | `errors.required` |
| Estimated Value | Positive number | `errors.validation` |
| Image URL | HTTPS, valid extension | `errors.uploadFailed` |

### Visual States
```tsx
// Input component states
type InputState = "idle" | "validating" | "valid" | "invalid";

// CSS classes per state
const stateClasses = {
  idle: "border-white/10",
  validating: "border-amber-500/50 animate-pulse",
  valid: "border-emerald-500/50",
  invalid: "border-red-500/50",
};
```

---

## strings.json Gaps

The following placeholders should be added to `app/strings.json`:

```json
{
  "placeholders": {
    "itemTitle": "What are you offering?",
    "serviceTitle": "What service do you offer?",
    "itemDescription": "Describe the item — brand, model, age, included accessories…",
    "serviceDescription": "Describe the service you offer — scope, duration, experience…",
    "estimatedValue": "e.g. 5000",
    "suburb": "e.g. Sandton, Camps Bay, Menlyn",
    "seekingDescription": "e.g. Looking for a laptop, guitar lessons…",
    "bio": "Tell people what you're about…",
    "passwordMin": "Min 8 characters",
    "passwordConfirm": "Confirm your password"
  }
}
```

---

## Error Message Improvements

### Current vs. Recommended

| Current | Recommended | strings.json Key |
|---------|-------------|------------------|
| "Title is required" | "Please add a title for your listing" | `errors.required` |
| "Description is required" | "Tell others about what you're offering" | `errors.required` |
| "Registration failed" | "Couldn't create account. Please try again." | `errors.generic` |
| "Unable to sign in" | "Email or password doesn't match our records" | `errors.unauthorized` |

---

## Summary of Findings

### Critical Issues
1. **No client-side inline validation** — all validation is server-side
2. **No smart defaults** — users must fill every field manually
3. **Hardcoded placeholders** — not using strings.json for i18n
4. **Generic error messages** — not user-friendly

### Quick Wins
1. Default condition to "Good" in Add Item form
2. Add GPS "Detect my location" button
3. Use strings.json for all placeholders
4. Add debounced inline validation for email fields

### Medium Effort
1. Implement `useGeolocation` hook
2. Create `useDebouncedValidation` hook
3. Add character counters for textarea fields
4. Per-field error state styling

### Future Enhancements
1. Image recognition for category suggestions
2. Password strength meter
3. Form auto-save to localStorage
4. Progressive form completion indicators

---

## Next Steps

1. **Task 1.2.1:** Create `useGeolocation` hook
2. **Task 1.2.2:** Create `useDebouncedValidation` hook
3. **Task 1.2.3:** Update Input component with validation states
4. **Task 1.2.4:** Add smart defaults to Add Item form
5. **Task 1.2.5:** Migrate hardcoded placeholders to strings.json

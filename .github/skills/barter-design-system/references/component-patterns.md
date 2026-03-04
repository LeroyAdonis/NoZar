# Component Patterns

Component library patterns for the Barter SA marketplace. All components use TypeScript strict mode, Tailwind v4, named exports, and dark mode support.

## Table of Contents

- [Button](#button)
- [Input](#input)
- [Select](#select)
- [Textarea](#textarea)
- [Card](#card)
- [Badge](#badge)
- [Avatar](#avatar)
- [Skeleton](#skeleton)
- [Error Banner](#error-banner)
- [Bottom Navigation](#bottom-navigation)

## Button

### Variants

| Variant | Classes | Usage |
|---------|---------|-------|
| Primary (sa-black) | `bg-[#0F172A] text-white hover:bg-[#1e293b] dark:bg-white dark:text-[#0F172A] dark:hover:bg-gray-200` | Main actions: Submit, Save, Apply |
| Primary (sa-green) | `bg-sa-green text-white hover:shadow-[0_0_20px_4px_rgba(0,151,57,0.35)]` | CTA buttons, hero actions |
| Secondary | `bg-transparent text-sa-green border border-sa-green/40 hover:border-sa-green` | Alternative actions |
| Ghost | `text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-200` | Tertiary, filter toggles |
| Danger | `bg-red-600 text-white hover:bg-red-700` | Destructive actions |

### Sizes

```tsx
// Small — inline, tight spaces
<button className="rounded-md px-3 py-1.5 text-xs font-medium">
  Small
</button>

// Medium (default) — forms, cards
<button className="rounded-lg px-4 py-2 text-sm font-medium">
  Medium
</button>

// Large — hero, full-width submit
<button className="rounded-lg px-4 py-3 text-sm font-medium">
  Large
</button>

// Full width — form submit
<button className="w-full rounded-lg px-4 py-3 text-sm font-medium">
  Full Width
</button>
```

### States

```tsx
// Disabled
<button disabled className="... disabled:opacity-50">

// Loading (with spinner)
<button disabled className="... disabled:opacity-50">
  {isPending ? 'Saving…' : 'Submit'}
</button>

// Loading with spinner icon
<button disabled className="inline-flex items-center gap-2 disabled:opacity-50">
  <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none">
    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
  </svg>
  Saving…
</button>
```

### Primary Button Pattern (complete)

```tsx
interface ButtonProps {
  children: React.ReactNode;
  type?: 'button' | 'submit';
  disabled?: boolean;
  onClick?: () => void;
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger';
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

const VARIANT_CLASSES: Record<string, string> = {
  primary: 'bg-[#0F172A] text-white hover:bg-[#1e293b] dark:bg-white dark:text-[#0F172A] dark:hover:bg-gray-200',
  secondary: 'border border-gray-300 text-gray-600 hover:bg-gray-50 dark:border-gray-700 dark:text-gray-400',
  ghost: 'text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-200',
  danger: 'bg-red-600 text-white hover:bg-red-700',
};

const SIZE_CLASSES: Record<string, string> = {
  sm: 'rounded-md px-3 py-1.5 text-xs',
  md: 'rounded-lg px-4 py-2 text-sm',
  lg: 'rounded-lg px-4 py-3 text-sm',
};

export function Button({
  children,
  type = 'button',
  disabled = false,
  onClick,
  variant = 'primary',
  size = 'md',
  className,
}: ButtonProps) {
  return (
    <button
      type={type}
      disabled={disabled}
      onClick={onClick}
      className={`font-medium transition-colors disabled:opacity-50 ${SIZE_CLASSES[size]} ${VARIANT_CLASSES[variant]} ${className ?? ''}`}
    >
      {children}
    </button>
  );
}
```

## Input

### Standard Input

```tsx
<div>
  <label
    htmlFor="field-id"
    className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300"
  >
    Label <span className="text-red-500">*</span>
  </label>
  <input
    id="field-id"
    name="fieldName"
    type="text"
    required
    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-sa-green focus:ring-1 focus:ring-sa-green dark:border-gray-700 dark:bg-gray-800 dark:text-white"
    placeholder="Placeholder text"
  />
  <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
    Helper text goes here
  </p>
</div>
```

### With Prefix (currency)

```tsx
<div className="relative">
  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-gray-500">R</span>
  <input
    type="number"
    min={0}
    className="w-full rounded-lg border border-gray-300 py-2 pl-8 pr-3 text-sm focus:border-sa-green focus:ring-1 focus:ring-sa-green dark:border-gray-700 dark:bg-gray-800 dark:text-white"
    placeholder="0"
  />
</div>
```

### With Search Icon

```tsx
<div className="relative">
  <svg className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
  </svg>
  <input
    type="text"
    className="w-full rounded-lg border border-gray-300 py-2.5 pl-10 pr-3 text-sm focus:border-sa-green focus:ring-1 focus:ring-sa-green dark:border-gray-700 dark:bg-gray-800 dark:text-white"
    placeholder="Search..."
  />
</div>
```

### Error State

```tsx
<input
  className="w-full rounded-lg border border-red-300 px-3 py-2 text-sm focus:border-red-500 focus:ring-1 focus:ring-red-500 dark:border-red-700 dark:bg-gray-800 dark:text-white"
  aria-invalid="true"
  aria-describedby="field-error"
/>
<p id="field-error" className="mt-1 text-xs text-red-600 dark:text-red-400">
  This field is required
</p>
```

## Select

```tsx
<div>
  <label htmlFor="select-id" className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
    Category
  </label>
  <select
    id="select-id"
    name="categoryId"
    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-sa-green focus:ring-1 focus:ring-sa-green dark:border-gray-700 dark:bg-gray-800 dark:text-white"
  >
    <option value="">Select a category</option>
    <option value="electronics">📱 Electronics</option>
  </select>
</div>
```

### Filter Select (compact)

```tsx
<select className="w-full rounded-md border border-gray-300 px-2 py-1.5 text-sm dark:border-gray-700 dark:bg-gray-800 dark:text-white">
```

## Textarea

```tsx
<textarea
  id="description"
  name="description"
  rows={4}
  maxLength={2000}
  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-sa-green focus:ring-1 focus:ring-sa-green dark:border-gray-700 dark:bg-gray-800 dark:text-white"
  placeholder="Describe your item..."
/>
```

## Card

### Standard Card

```tsx
<div className="rounded-xl border border-gray-200 bg-white p-4 transition-shadow hover:shadow-md dark:border-gray-800 dark:bg-gray-900">
  {/* Header */}
  <div className="mb-3 flex items-center justify-between">
    <h3 className="text-base font-semibold text-gray-900 dark:text-white">Title</h3>
    <Badge status="proposed" />
  </div>

  {/* Body */}
  <div className="mb-2 text-sm text-gray-600 dark:text-gray-400">
    Content
  </div>

  {/* Footer */}
  <div className="border-t border-gray-100 pt-2 dark:border-gray-800">
    <p className="text-xs text-gray-500">Footer info</p>
  </div>
</div>
```

### Linkable Card

```tsx
<Link
  href={`/listings/${id}`}
  className="block rounded-xl border border-gray-200 bg-white p-4 transition-shadow hover:shadow-md dark:border-gray-800 dark:bg-gray-900"
>
  {/* content */}
</Link>
```

### Glass Card

```tsx
<div className="glass rounded-2xl px-6 py-5">
  {/* content on blurred background */}
</div>
```

### Filter Panel Card

```tsx
<div className="grid gap-3 rounded-lg border border-gray-200 p-4 sm:grid-cols-2 lg:grid-cols-3 dark:border-gray-700">
  {/* filter controls */}
</div>
```

## Badge

### Status Badge

```tsx
interface StatusConfig {
  label: string;
  bg: string;
  text: string;
}

const STATUS_CONFIG: Record<string, StatusConfig> = {
  proposed:       { label: 'Proposed',       bg: 'bg-yellow-100 dark:bg-yellow-900/30', text: 'text-yellow-700 dark:text-yellow-300' },
  negotiating:    { label: 'Negotiating',    bg: 'bg-blue-100 dark:bg-blue-900/30',     text: 'text-blue-700 dark:text-blue-300' },
  agreed:         { label: 'Agreed',         bg: 'bg-indigo-100 dark:bg-indigo-900/30', text: 'text-indigo-700 dark:text-indigo-300' },
  contact_shared: { label: 'Contact Shared', bg: 'bg-purple-100 dark:bg-purple-900/30', text: 'text-purple-700 dark:text-purple-300' },
  completed:      { label: 'Completed',      bg: 'bg-green-100 dark:bg-green-900/30',   text: 'text-green-700 dark:text-green-300' },
  cancelled:      { label: 'Cancelled',      bg: 'bg-gray-100 dark:bg-gray-800',        text: 'text-gray-500 dark:text-gray-400' },
  disputed:       { label: 'Disputed',       bg: 'bg-red-100 dark:bg-red-900/30',       text: 'text-red-700 dark:text-red-300' },
};

export function StatusBadge({ status }: { status: string }) {
  const config = STATUS_CONFIG[status] ?? STATUS_CONFIG.proposed;
  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${config.bg} ${config.text}`}>
      {config.label}
    </span>
  );
}
```

### Type Badge (listing type)

```tsx
<span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${
  type === 'service'
    ? 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300'
    : 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300'
}`}>
  {type === 'service' ? 'Service' : 'Item'}
</span>
```

## Avatar

### Sizes

```tsx
// Small (24px) — inline, compact lists
<div className="flex h-6 w-6 items-center justify-center rounded-full bg-sa-green text-[10px] font-medium text-white">
  JD
</div>

// Medium (32px) — card headers, trade cards (default)
<div className="flex h-8 w-8 items-center justify-center rounded-full bg-blue-600 text-xs font-medium text-white">
  J
</div>

// Large (40px) — profile previews
<div className="flex h-10 w-10 items-center justify-center rounded-full bg-sa-green text-sm font-bold text-white">
  JD
</div>

// XL (48px) — profile page
<div className="flex h-12 w-12 items-center justify-center rounded-full bg-sa-green text-base font-bold text-white">
  JD
</div>
```

### With Online Indicator

```tsx
<div className="relative">
  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-sa-green text-sm font-bold text-white">
    JD
  </div>
  <span className="absolute bottom-0 right-0 h-3 w-3 rounded-full border-2 border-white bg-green-500 dark:border-gray-900" />
</div>
```

### Fallback Initials Helper

```typescript
function getInitials(name: string): string {
  return name
    .split(' ')
    .map((part) => part.charAt(0).toUpperCase())
    .slice(0, 2)
    .join('');
}
```

## Skeleton

### Line Skeleton

```tsx
<div className="h-4 w-3/4 animate-pulse rounded bg-gray-200 dark:bg-gray-700" />
<div className="h-4 w-1/2 animate-pulse rounded bg-gray-200 dark:bg-gray-700" />
```

### Circle Skeleton (avatar)

```tsx
<div className="h-10 w-10 animate-pulse rounded-full bg-gray-200 dark:bg-gray-700" />
```

### Card Skeleton

```tsx
function CardSkeleton() {
  return (
    <div className="rounded-xl border border-gray-200 bg-white p-4 dark:border-gray-800 dark:bg-gray-900">
      {/* Header */}
      <div className="mb-3 flex items-center justify-between">
        <div className="h-5 w-20 animate-pulse rounded-full bg-gray-200 dark:bg-gray-700" />
        <div className="h-4 w-12 animate-pulse rounded bg-gray-200 dark:bg-gray-700" />
      </div>
      {/* Title */}
      <div className="mb-2 h-5 w-3/4 animate-pulse rounded bg-gray-200 dark:bg-gray-700" />
      {/* Content lines */}
      <div className="space-y-2">
        <div className="h-4 w-full animate-pulse rounded bg-gray-200 dark:bg-gray-700" />
        <div className="h-4 w-2/3 animate-pulse rounded bg-gray-200 dark:bg-gray-700" />
      </div>
    </div>
  );
}
```

### Custom Shimmer Skeleton (CSS keyframe)

For richer shimmer effects, use the `shimmer` keyframe from globals.css:

```tsx
function ShimmerSkeleton({ className }: { className?: string }) {
  return (
    <div className={`relative overflow-hidden rounded bg-gray-200 dark:bg-gray-700 ${className ?? ''}`}>
      <div
        className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent"
        style={{ animation: 'shimmer 1.5s infinite' }}
      />
    </div>
  );
}
```

## Error Banner

```tsx
<div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700 dark:border-red-800 dark:bg-red-900/20 dark:text-red-400">
  {errorMessage}
</div>
```

## Bottom Navigation

Fixed bottom nav with safe area padding for mobile PWA:

```tsx
<nav className="fixed bottom-0 inset-x-0 z-50 border-t border-gray-200 bg-white dark:border-gray-800 dark:bg-[#0a0a0a]">
  <div className="mx-auto flex max-w-5xl items-center justify-around">
    {/* Nav items */}
  </div>
  {/* iOS safe area */}
  <div className="h-[env(safe-area-inset-bottom)]" />
</nav>
```

### Active Nav Item

```tsx
// Active state
className="text-[#0F172A] dark:text-white"

// Inactive state
className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"

// Highlighted (center action)
<span className="flex h-10 w-10 items-center justify-center rounded-full bg-[#0F172A] text-white dark:bg-white dark:text-[#0F172A]">
  {icon}
</span>
```

## Radio Toggle (Type Selector)

```tsx
<div className="flex gap-2">
  {(['item', 'service'] as const).map((t) => (
    <label
      key={t}
      className={`flex-1 cursor-pointer rounded-lg border px-4 py-2.5 text-center text-sm font-medium transition-colors ${
        selected === t
          ? 'border-blue-600 bg-blue-50 text-blue-700 dark:border-blue-500 dark:bg-blue-900/20 dark:text-blue-300'
          : 'border-gray-200 text-gray-600 hover:bg-gray-50 dark:border-gray-700 dark:text-gray-400 dark:hover:bg-gray-800'
      }`}
    >
      <input type="radio" name="type" value={t} className="sr-only" />
      {t === 'item' ? '📦 Item' : '🛠️ Service'}
    </label>
  ))}
</div>
```

## File Upload Placeholder

```tsx
<div className="flex items-center justify-center rounded-lg border-2 border-dashed border-gray-300 px-6 py-8 dark:border-gray-700">
  <div className="text-center">
    <svg className="mx-auto h-10 w-10 text-gray-400" fill="none" viewBox="0 0 24 24" strokeWidth={1} stroke="currentColor">
      {/* camera/image icon */}
    </svg>
    <p className="mt-2 text-sm text-gray-500">Photo upload coming soon</p>
  </div>
</div>
```

## Star Rating

Interactive star selector pattern used in rating forms:

```tsx
<div className="flex gap-1">
  {[1, 2, 3, 4, 5].map((s) => (
    <button
      key={s}
      type="button"
      onClick={() => setScore(s)}
      className="p-0.5 transition-transform hover:scale-110"
      aria-label={`${s} star${s > 1 ? 's' : ''}`}
    >
      <svg
        className={`h-7 w-7 ${
          s <= score
            ? 'fill-yellow-400 text-yellow-400'
            : 'fill-none text-gray-300 dark:text-gray-600'
        }`}
        viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor"
      >
        {/* star path */}
      </svg>
    </button>
  ))}
</div>
```

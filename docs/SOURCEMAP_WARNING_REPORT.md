Issue: Vite/esbuild sourcemap warning during build

Summary:
- Running `npm run build` emits warnings: "Error when using sourcemap for reporting an error: Can't resolve original location of error." for these client components:
  - app/components/ui/region-prompt.tsx
  - app/components/ui/location-picker.tsx
  - app/components/map/nozar-map.tsx
- Build completes successfully but logs are noisy.

What was tried:
1. Removed an accidental top-level "use client" from app/routes/dashboard/profile.tsx.
2. Disabled production sourcemaps in vite.config.ts (build.sourcemap = false).
3. Converted static imports to dynamic client-only imports for RegionPrompt, NozarMap, and LocationPicker.
4. Cleared Vite cache (node_modules/.vite) and rebuilt.
5. Upgraded vite and esbuild to latest minor releases and rebuilt.

Result:
- The build succeeds, but the sourcemap warnings persist during both client and SSR builds.
- Dynamic imports and cache clear did not remove the warnings.

Likely cause:
- Upstream Vite/esbuild/plugin interaction where error reporting attempts to map to original source but fails (Windows-path-related or plugin-specific "react-router" SSR handling).

Next recommended steps:
- Create a minimal reproduction (small project that imports a client-only component and runs the same React Router build) and open an upstream issue with Vite or esbuild including the repro and build logs.
- Alternatively, silence warnings by setting vite logLevel to "error" (not recommended long-term).

Suggested issue template (copy to GitHub):
- Steps to reproduce
  1. Checkout repo / run `npm ci`
  2. Run `npm run build`
  3. Observe warnings in build logs for the components above
- Attach trimmed build logs and package.json
- Note: dynamic-importing the components and disabling Vite sourcemaps did not resolve the warnings

If you want, I can prepare the minimal repro and draft the upstream issue text.

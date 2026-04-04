# NoZar Routes

## Auth Pages
### `/login.tsx`
- Sign-in form: email/password + Google OAuth.
- `GET /login`: redirects to `/dashboard` if already signed in.
- Exported `meta`: title="Login — Nozar", description="Sign in to your Nozar account"

### `/register.tsx`
- Sign-up form: name + email/password + Google OAuth.
- `GET /register`: redirects to `/dashboard` if already signed in.
- Exported `meta`: title="Register — Nozar", description="Create your Nozar account"

### `/reset-password.tsx` **(missing)**
- **Trigger**: Click link (e.g., `/forgot-password` CTA) or direct `.resetPassword({ email })` call.

- **UI**: Single email input.
- Submits `POST /auth/reset-password` → sends time-limited reset link via email.

- **Reset link format**: `/reset-password/{token}`
  - Route: `reset-password.$token.tsx`
  - UI: Password field + confirmation field.
  - `POST /auth/reset-password/{token}` → redirects to `/dashboard` on success.

- **Security**:
  - Token expires in 15 minutes.
  - Rate limited: 3 attempts/email/hour.
  - `GET /reset-password/{token}` throws `redirect("/login")` if session exists.

- **Metadata**:
```tsx
export function meta({}: Route.MetaArgs) {
  return [
    { title: "Reset Password — NoZar" },
    { name: "description", content: "Reset your NoZar password" }
  ];
}
```
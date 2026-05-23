# Architecture Report — Kakao-Only Login

## Summary
Replaces the existing Magic Link `/login` UI with a single Kakao OAuth button. No new infrastructure, no DB migration, no route changes — only the `/login` page body and a new design-system button. `/auth/callback` already handles `?code=` OAuth exchange, no change needed.

## Existing Surfaces Affected
- `src/app/login/page.tsx` — full rewrite (Magic Link UI removed).
- `src/design-system/KakaoLoginButton.tsx` — NEW. Reusable button with brand styling.
- `src/app/login/__tests__/page.test.tsx` (existing or new) — adjust/add tests.

## Existing Surfaces NOT Affected
- `src/app/auth/callback/route.ts` — `supabase.auth.exchangeCodeForSession` works for OAuth and OTP both. Confirmed.
- `src/middleware.ts` + `src/lib/supabase/middleware.ts` — unchanged.
- `src/lib/supabase/client.ts` + `server.ts` — unchanged.
- `supabase/schema.sql` — unchanged.
- `src/app/settings/page.tsx` (signout button) — unchanged.

## External Config Changes (out of code)
- Supabase Auth → Providers → Kakao: enable + paste REST API Key (client_id) + Client Secret. Done via Management API.
- Kakao Developers Console: register app, set Redirect URI to Supabase `https://vrkkqnmooynogditnquu.supabase.co/auth/v1/callback`, generate Client Secret. User responsibility.

## Tooling / Tests
- Existing test fw: vitest + RTL + Playwright. No new deps needed.
- Mock `createSupabaseBrowserClient` returning `{ auth: { signInWithOAuth: vi.fn() } }`.

## Verdict
PASS

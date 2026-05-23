# Test Plan — Kakao-Only Login

## Unit tests (vitest + RTL)
`src/app/__tests__/login-page.test.tsx`:
1. Renders Kakao button with Korean label "카카오로 시작하기".
2. Click invokes `supabase.auth.signInWithOAuth({ provider: 'kakao', options: { redirectTo: ... } })`.
3. Email input from prior implementation is NOT present (regression guard).
4. On mount with `window.location.hash = '#error=access_denied&error_code=otp_expired'`, page shows "링크가 만료됐어요. 다시 시도해주세요."
5. Unknown error_code falls back to generic Korean message.

## Mock surface
- `vi.mock('@/lib/supabase/client', () => ({ createSupabaseBrowserClient: () => ({ auth: { signInWithOAuth: signInSpy } }) }))`.

## Integration / E2E
- Real Kakao OAuth flow cannot be exercised in CI (requires real Kakao account + consent screen). Manual smoke after deploy.
- Existing Playwright suite (`e2e/`) already exercises the calendar/list/diary flows post-auth; those tests bypass `/login` by other means (or run pre-middleware integration). No new E2E added in this commit.

## Regression checks
- `npm run build` must complete (Next 15 Suspense rule applies — keep `Suspense` wrapper on login page from prior commit).
- All existing unit tests stay green.

## Commands to run
```bash
npx tsc --noEmit
npm run lint
npx vitest run
npm run build
```

## Not applicable
- DB-layer tests (no DB change).
- API-route tests (no API change; `/auth/callback` untouched).

## Verdict
PASS

# Technical Design — Kakao-Only Login

## Implementation Strategy
1 commit, 4 files touched (3 source + 1 spec):
1. New `src/design-system/KakaoLoginButton.tsx` (~50 lines) — exports a single `<KakaoLoginButton onClick disabled />` with `#FEE500` background, black text, Kakao speech-bubble SVG inline.
2. Rewrite `src/app/login/page.tsx` (~60 lines) — Kakao-only. State: `idle | redirecting | error`. Hash error parsing on mount → human-friendly Korean message.
3. Update/add `src/app/__tests__/login-page.test.tsx` — verify (a) button renders, (b) click calls `signInWithOAuth({provider:'kakao', options:{redirectTo:...}})`, (c) `#error=otp_expired` hash shows Korean message.
4. (Side task, NOT in repo) Apply Supabase Auth provider config via Management API once Client Secret arrives.

## Frontend Responsibilities
- Render Kakao-branded button + handle click → call `supabase.auth.signInWithOAuth`.
- Parse `window.location.hash` on mount; map known error codes to Korean copy.
- Preserve `?redirectTo=` query param into OAuth `options.redirectTo`.
- Removed: email input, send-OTP form, "sending/sent" status.

## Backend Responsibilities
None — Supabase Auth is the OAuth backend. `/auth/callback` already wired.

## Data / Migration
None. `auth.users` schema unchanged. `handle_new_user` trigger handles new Kakao users identically.

## Test Responsibilities
- Unit: render, click, error-hash parsing.
- E2E: out of scope (real Kakao OAuth requires real account + cannot be stubbed in Playwright without complex network mocking). Local verify is unit-only; manual verify after Supabase Kakao provider config.

## Files Expected to Change
- `src/app/login/page.tsx` (REWRITE)
- `src/design-system/KakaoLoginButton.tsx` (NEW)
- `src/app/__tests__/login-page.test.tsx` (NEW or rewrite if exists)

## Out-of-repo follow-ups (after this commit)
- Supabase Management API call to register Kakao provider (script or one-off curl).
- DEPLOYMENT.md update — Kakao section. Can be a follow-up commit.

## Implementation Order
1. Write `KakaoLoginButton.tsx`.
2. Rewrite `login/page.tsx`.
3. Write tests.
4. `npm run build` + lint + vitest local verify.
5. Commit + push (triggers Vercel auto-deploy).
6. Register Kakao provider via Management API (using REST API Key + Client Secret).
7. Manual smoke on prod URL.

## Backward Compatibility
- Any user that was authenticated via Magic Link still has a valid Supabase session cookie → app continues to work for them.
- New logins require Kakao. Old session tokens auto-expire per `jwt_exp=3600` then re-login via Kakao.
- No data migration required.

## Risks
- LOW. UI swap only.
- One operational dependency: Kakao Client Secret needs to be supplied before prod flow works. Coded path is correct; provider config gates the actual sign-in.

## Performance review? 
NO — UI only, no list/query work.

## Infra review?
PARTIAL — Supabase Auth provider config changes externally (via Management API), not in repo. Will document in DEPLOYMENT.md follow-up commit. No deployment pipeline change.

## Verdict
PASS

# Code Review — Kakao-Only Login

## Diff scope
3 files (2 source + 1 test):
- `src/design-system/KakaoLoginButton.tsx` (NEW, 35 lines)
- `src/app/login/page.tsx` (REWRITE, 87 lines vs prior 85)
- `src/app/__tests__/login-page.test.tsx` (NEW, 71 lines)

## Findings
- **Correctness** — OAuth call shape matches `@supabase/supabase-js` v2 `signInWithOAuth({provider, options:{redirectTo}})`. `redirectTo` is constructed only on the client (uses `window.location.origin`), avoiding SSR origin guessing. Hash parser strips the hash via `replaceState` so a remount doesn't re-trigger. ✓
- **Naming/Reuse** — Button moved into `src/design-system/` per CLAUDE.md UI component reuse rule. Pure presentation; no Supabase coupling. ✓
- **File size** — KakaoLoginButton 35 lines, LoginPage 87 lines. Both under 100-line guide. ✓
- **Test coverage** — Includes regression guard (no email input) so Magic Link cannot silently come back. ✓
- **A11y** — Button has `aria-label`. Error region uses `role="alert"`. ✓
- **No leftover Magic Link references** — search confirms: no `signInWithOtp` outside node_modules.
- **No changes to** `auth/callback`, `middleware`, supabase clients, schema. As designed. ✓

## Nits (non-blocking)
- The inline SVG path is a simplified speech bubble, not the official Kakao mark. Sufficient for MVP. Brand swap is a one-line edit if Kakao asset wanted later.

## Verdict
PASS

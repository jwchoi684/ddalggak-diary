# Security Review — Kakao-Only Login

## Surfaces examined
- `src/app/login/page.tsx`
- `src/design-system/KakaoLoginButton.tsx`
- Outbound: `supabase.auth.signInWithOAuth` (Supabase SDK).

## Findings
- **No secrets in client code.** Kakao Client Secret + REST Key live on Supabase Auth Provider config (server-side at supabase.com). The browser only triggers `signInWithOAuth`; the actual OAuth exchange is server-to-server (Supabase ↔ Kakao). ✓
- **Open redirect prevention.** `redirectTo` query param is passed into `options.redirectTo` as `${origin}/auth/callback?next=${encodeURIComponent(redirectTo)}`. `next=` is consumed by `/auth/callback` with `new URL(next, url.origin)` — paths only, same-origin enforced by the URL base. ✓
- **Hash injection via `window.location.hash`.** Parser only reads `error_code`/`error` and maps to a fixed Korean string set; unknown values → generic message. No HTML interpolation. ✓
- **CSRF.** OAuth state nonce is handled by Supabase Auth (PKCE). App does not maintain its own state. ✓
- **PII logging.** No `console.log` of user inputs or tokens.
- **Rate limiting.** Supabase Auth rate-limits OAuth attempts at provider/project level. No app-side throttling needed for MVP.

## Out-of-repo posture
- Kakao Client Secret was provided over chat. Recommend rotating after dev settles (`개발자센터 → 보안 → Client Secret → 재발급`). Same advice still stands for OpenAI / Vercel / Supabase / GitHub tokens disclosed earlier.

## Verdict
PASS

# API Contract — Kakao-Only Login

## Browser → Supabase
**Call**: `supabase.auth.signInWithOAuth(params)`
- `params.provider`: `'kakao'`
- `params.options.redirectTo`: `${window.location.origin}/auth/callback?next=${encodeURIComponent(redirectTo)}`
- `params.options.scopes`: omitted (use Kakao defaults — profile_nickname).

**Response**: `{ data: { provider, url }, error }`. supabase-js automatically navigates to `url` (Kakao consent).

## Kakao → Supabase callback (external)
Supabase hosted callback `https://vrkkqnmooynogditnquu.supabase.co/auth/v1/callback` consumes Kakao `code`, exchanges with Kakao for token, then redirects to the app's `options.redirectTo`:
- success: appended `?code=<exchange_code>` → handled by `src/app/auth/callback/route.ts` (unchanged).
- failure: `#error=<code>&error_code=<sub>&error_description=...` in hash fragment → handled by login page hash-parser.

## Login Page → /auth/callback (success)
Existing contract preserved: `GET /auth/callback?code=...&next=/` → `supabase.auth.exchangeCodeForSession(code)` → `redirect(next)`.

## Hash Error Vocabulary (parsed → Korean)
| error_code | Korean message |
|---|---|
| `otp_expired` | 링크가 만료됐어요. 다시 시도해주세요. |
| `access_denied` (user cancelled) | 로그인을 취소했어요. |
| `provider_email_needs_verification` | 카카오 이메일 인증이 필요해요. |
| (unknown) | 로그인에 실패했어요. 잠시 후 다시 시도해주세요. |

## Supabase Management API (already applied this session)
`PATCH /v1/projects/{ref}/config/auth`
```json
{
  "external_kakao_enabled": true,
  "external_kakao_client_id": "<rest_api_key>",
  "external_kakao_secret": "<client_secret>"
}
```
Applied ✓.

## Verdict
PASS

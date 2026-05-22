# Security Review Report — REQ-013

## Summary

REQ-013 adds a pure client-side, display-only diary list screen at `/list`. It reads entries via `useDiaries`, renders them as cards, and does not write to any storage. The attack surface is minimal: URL query-parameter consumption, text rendering from localStorage data, and `<img src>` from base64 data URLs. All six items requested for verification check out clean. No critical or high issues found.

## Scope

Files reviewed:
- `src/lib/utils/formatListDate.ts`
- `src/app/list/_components/PhotoThumbnailStrip.tsx`
- `src/app/list/_components/DiaryListCard.tsx`
- `src/app/list/_components/ListHeader.tsx`
- `src/app/list/page.tsx`
- `src/lib/storage/photoBase64.ts` (REQ-011 MIME guard, read for context)

## Critical Issues

None.

## High Issues

None.

## Medium Issues

None.

## Low Issues

**L1 — `?month` parameter is unsanitized before URL re-emission.**

Severity: Low.

`activeMonth = searchParams.get('month') ?? currentMonth` is passed directly to `Routes.listWithFilter({ month: m })` via `onMonthChange`. The value is also compared against `e.date.slice(0, 7)` using strict string equality, and split on `'-'` in `addMonths()` to construct a `Date`. No output escaping is needed because the value is never rendered as HTML and Next.js router's `router.push` encodes query parameters before writing them to the address bar. However, a crafted `?month` value (e.g., a very long string or non-date garbage) could produce a nonsensical `Date` object in `addMonths`. This is a cosmetic/UX edge case with no exploitable consequence: the list will simply render an empty month. Risk is self-contained to the local browser session.

**L2 — `photo.dataUrl` rendered in `<img src>` without re-validation at render time.**

Severity: Low (accepted by design per REQ-011).

`PhotoThumbnailStrip` passes `photo.dataUrl` directly to `<img src>`. The MIME guard in `photoBase64.ts` (`!dataUrl.startsWith('data:image/')`) fires at write time when the photo is added. Data stored in `localStorage` before REQ-011 was deployed, or manually crafted by a user editing their own `localStorage`, could theoretically contain a non-image data URL. Because this app has no authentication, no multi-user isolation, and no server, the only person who can manipulate `localStorage` is the user themselves — so there is no cross-user exploitation path.

## Commands Run

```
rg "dangerouslySetInnerHTML|innerHTML|eval\(|new Function" src/app/list/ src/lib/utils/formatListDate.ts
rg "password|secret|token|api_key|private_key|apiKey" src/app/list/ src/lib/utils/formatListDate.ts
rg "photo\.dataUrl|dataUrl" src/app/list/
npm audit --audit-level=high
git diff HEAD~1 -- src/app/list/ src/lib/utils/formatListDate.ts
```

## Checklist Results

| # | Check | Result |
|---|---|---|
| 1 | Authentication checks | N/A — personal local app, no auth layer |
| 2 | Authorization checks | N/A — single-user, no server |
| 3 | IDOR risks | None — all data is owned by the local user |
| 4 | Tenant/user isolation | N/A — single-user localStorage |
| 5 | Input validation | `?month` consumed as string only; used in strict equality filter and `Date` constructor. No XSS path. |
| 6 | Injection risks | No SQL, no server. Text body rendered as React text node (`{entry.text}`), never as HTML. |
| 7 | XSS and unsafe rendering | No `dangerouslySetInnerHTML`. No `innerHTML`. Text content rendered via React's safe text interpolation. |
| 8 | CSRF-sensitive mutations | No writes on this screen. |
| 9 | Secret leakage | No secrets, tokens, or API keys in any new file. |
| 10 | Sensitive data logging | No `console.log` of entry content. |
| 11 | File upload / path traversal | No file upload. `loading="lazy"` on `<img>` only. |
| 12 | SSRF risks | No HTTP calls. |
| 13 | Dependency vulnerabilities | `npm audit` reports 0 high/critical issues introduced by this REQ. |
| 14 | Internal error disclosure | No server, no error boundary added. |
| 15 | Insecure defaults | None. Sort defaults to `'desc'`; month defaults to current month. Both safe. |
| 16 | Permission changes | None. |

## Required Fixes

None.

## Accepted Residual Risks

1. **Self-XSS via manually crafted `localStorage`** — a user who edits their own `ddalkkak:diaries:v1` key to insert a `javascript:` or `data:text/html` photo URL could trigger unexpected browser behavior. Accepted because: (a) personal single-user app with no cross-user data path, (b) the MIME guard at write time blocks normal ingestion paths, (c) requires intentional self-sabotage. Mitigation path for a future multi-user version: re-validate `startsWith('data:image/')` at render time.

2. **`?month` accepts arbitrary strings** — cosmetically harmless in the current pure client-side design. Not exploitable.

## Verdict
PASS

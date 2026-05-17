# Security Review — REQ-006

## Summary

REQ-006 implements the Next.js App Router routing shell: 5 page stubs, `not-found.tsx`, `Routes` helper, shared `next/navigation` Vitest mock. No new runtime dependencies, no env vars, no network calls, no localStorage access, no secrets. Zero new security findings. Six carry-forward items from REQ-005 remain unchanged.

## Scope

- `src/lib/navigation/{routes.ts, index.ts}`
- `src/lib/navigation/__tests__/{setupNextNavigation.ts, routes.test.ts, setupNextNavigation.test.ts}`
- `src/app/{not-found.tsx, list/page.tsx, chat/page.tsx, stats/page.tsx}`
- `src/app/diary/[date]/page.tsx`
- `src/app/__tests__/{diary-date-page.test.tsx, not-found.test.tsx}`

## Critical / High / Medium / Low Issues

None new. See carry-forward.

## URL Injection and Path Traversal Analysis

### `/diary/[date]` segment — path traversal

Next.js App Router does not pass raw URL bytes to `params`. The framework percent-decodes and normalizes the segment value before delivering it. `..` and `.` segments are rejected at the HTTP layer before reaching any page handler.

Even if a crafted string reached `DiaryPage`, the regex guard `/^\d{4}-\d{2}-\d{2}$/` (anchored, digits + hyphens only) rejects all tested traversal patterns: `../../etc/passwd`, `../`, `..`, `%2e%2e%2fpasswd`, `2026-05-17/../../../etc`, `2026-05-..`. Correct and sufficient secondary defense.

The rendered `{date}` in the heading passes through React JSX as a text child — text node, not HTML injection vector. No `dangerouslySetInnerHTML`.

### `Routes.diary(date)` — URL injection responsibility

`Routes.diary` is a template literal `` `/diary/${date}` ``. Does NOT percent-encode the `date` argument. If a caller supplies a raw user-controlled string containing `?`, `#`, or `%`, the resulting URL could break routing or introduce unexpected query/fragment components.

Within this codebase the callers are controlled surfaces (calendar grid, list screen) supplying pre-known ISO date strings. JSDoc does not currently warn callers about encoding responsibility. API contract notes caller invariant of trusted source in MVP — acceptable documented residual.

Severity: Low. Recommendation (non-blocking): add JSDoc note to `Routes.diary` stating "Callers must supply a pre-validated ISO 8601 date string. Raw user-typed input must be validated or encoded before passing."

### `Routes.listWithFilter` — open redirect / query injection

`URLSearchParams` correctly percent-encodes all values. `sort` parameter narrowed to `'asc' | 'desc'`. `month` accepts any `string` but values encoded before append. No open redirect vector; resulting URLs always relative paths beginning with `/list`.

### `not-found.tsx` — anchor href

`<a href="/">` is a fixed string literal. Safe.

## XSS and Injection Audit

`dangerouslySetInnerHTML`, `innerHTML`, `eval`, `new Function`, `document.write` — grep across all 12 in-scope files returned zero matches.

All JSX content is either static string literals or `date` rendered as JSX text child (auto-escaped by React). No ReactNode props accept caller-supplied HTML.

No `console.log`/`console.error`/`console.warn` in production source.

## CSRF / Mutations

No form submissions, no HTTP calls. Not applicable.

## Secrets Audit

Grep for `password|secret|token|api_key|API_KEY|apiKey|bearer|Authorization` — zero matches.

## Test Helper Exposure

`setupNextNavigation.ts` under `__tests__/` — test-only. Not imported by production. Not in Next.js build output.

## Dependency Audit

No new dependencies. `npm audit`: 0 critical, 0 high, 7 moderate (same `postcss < 8.5.10` carry-forward). Auto-fix would downgrade Next.js to 9.3.3 — deferred. Delta from REQ-005: 0.

## Carry-forward (from REQ-005, still applicable)

1. **`JSON.parse` on localStorage without prototype-pollution guard** — Low/Medium. Hard gate at REQ-019.
2. **`Photo.dataUrl` stored without format/size validation** — Medium, deferred. Hard gate at REQ-011.
3. **No runtime schema validation on write paths** — Medium, deferred. Hard gate at REQ-019.
4. **`Settings` wide index type** — Low. Narrow as concrete keys land.
5. **esbuild dev-server CORS** (GHSA-67mh-4wv8-2f99) — dev-only.
6. **postcss CSS stringify** (GHSA-qx2v-qp2m-jg93) — build-tool-only.

## Required Fixes

None.

## Accepted Residual Risks

- `Routes.diary(date)` encoding responsibility undocumented at function level. Accepted for MVP given controlled call sites; JSDoc note recommended in next maintenance pass.
- Same 6 carry-forward items as REQ-005.

## Verdict

PASS

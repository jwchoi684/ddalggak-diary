# Security Review — REQ-007

## Summary

REQ-007 adds 5 new production React components, 1 client hook (`useDiaries`), and Playwright E2E bootstrap. Surface is entirely read-only client-side rendering. No HTTP calls, no secrets, no user-supplied HTML, no external service access. Zero new findings. All REQ-006 carry-forward items unchanged.

## Scope

- `src/app/page.tsx` (replaced placeholder)
- `src/app/_components/{CalendarScreen, CalendarHeader, CalendarGrid, CalendarDayCell}.tsx`
- `src/lib/storage/useDiaries.ts`
- `playwright.config.ts`
- `e2e/calendar.spec.ts`

## Critical / High / Medium / Low Issues

None new. See carry-forward.

## XSS / Injection Audit

Grep for `dangerouslySetInnerHTML`, `innerHTML`, `eval(`, `new Function`, `document.write` across all 8 files — zero matches.

Only dynamic JSX from diary data in REQ-007: `MoodIcon` receives `MoodId` enum (10 literal compile-time map) → Unicode emoji inside `<span role="img">`. No diary text rendered in REQ-007; body text is REQ-009's concern.

`aria-label` values:
- `CalendarDayCell`: `` `${date}${entry ? ' 일기 있음' : ''}` `` — `date` is internally computed YYYY-MM-DD, not user input. Safe.
- Arrow buttons: static `"이전 달"`/`"다음 달"`.
- FAB: static `"오늘 일기 쓰기"`.

Inline SVG (PenIcon, SearchIcon, StatsIcon, ListIcon): static JSX with fixed path data, no event handlers, no `<script>`, no `onload`, no `<a href>` inside. Safe.

Month label `` {month + 1}월 `` — arithmetic + React text node. Safe.

Day numerals via `Number(date.slice(8))` — integer text node. Safe.

## Dependency Audit

New production dep delta: NONE. `@playwright/test ^1.44.0` is devDep only; excluded from production bundle.

`npm audit --omit=dev` unchanged from REQ-006:
- 0 critical, 0 high
- 2 moderate: `postcss < 8.5.10` (GHSA-qx2v-qp2m-jg93, CSS stringify XSS in build-time tool output) — same deferred carry-forward.

`@playwright/test` is well-maintained widely-vetted. Delta: 0 new advisories.

## Sensitive Data / Logging

Grep for `console.` across production files: zero matches.

`process.env` access in `playwright.config.ts` reads only `process.env.CI` — boolean CI flag for `forbidOnly`/`retries`/`reuseExistingServer`. No secrets.

## localStorage Isolation

`useDiaries` calls `readDiaries()` from `@/lib/storage` (SSR-safe abstraction REQ-002). No component in `src/app/_components/` accesses `localStorage` directly. REQ-002's `no-direct-localstorage-access.test.ts` enforces this at test time. Boundary intact.

## Navigation / Routing Safety

All navigation through `Routes.*`. `Routes.diary(date)` receives JS-arithmetic-computed dates (not raw user input). Same carry-forward Low note from REQ-006 applies. `/diary/[date]` retains regex guard `/^\d{4}-\d{2}-\d{2}$/` as server-side backstop.

## CSRF / Mutations / SSRF

No mutations, no `fetch`/`axios`/`XMLHttpRequest`, no form submissions. Not applicable.

## Playwright / E2E Config Security

`playwright.config.ts` targets `http://localhost:3000` (local). `baseURL` is fixed localhost string. `reuseExistingServer: !process.env.CI` is standard. E2E spec is dev/CI only, not shipped. Chromium-only limits browser-automation attack surface. No cookies/sessions/credentials handled.

## Carry-forward (from REQ-006, still applicable)

1. **`JSON.parse` on localStorage without prototype-pollution guard** — Low/Medium. Hard gate at REQ-019.
2. **`Photo.dataUrl` stored without format/size validation** — Medium, deferred. Hard gate at REQ-011.
3. **No runtime schema validation on write paths** — Medium, deferred. Hard gate at REQ-019.
4. **`Settings` wide index type** — Low. Narrow as concrete keys land.
5. **esbuild dev-server CORS** (GHSA-67mh-4wv8-2f99) — dev-only.
6. **postcss CSS stringify** (GHSA-qx2v-qp2m-jg93) — build-tool-only.
7. **`Routes.diary(date)` JSDoc missing encoding-responsibility note** — Low. REQ-007 call sites use internally computed dates; no exploitable path. Recommend JSDoc add in next maintenance.

## Required Fixes

None.

## Accepted Residual Risks

- Same 7 carry-forward items from REQ-006.
- `@playwright/test` devDep adds ~277 MB Chromium binaries in dev only; not in production bundle. Accepted.

## Verdict

PASS

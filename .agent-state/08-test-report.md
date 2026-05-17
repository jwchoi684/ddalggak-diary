# Test Report — REQ-006

## Summary

Independent re-verification of REQ-006 (Next.js App Router routing shell). All four gates pass. 151/151 tests pass across 23 test files. The build produces exactly 6 routes. All 20 REQ-006 test cases are present and match the plan. All 131 baseline tests (REQ-002 through REQ-005) pass unchanged. No source modifications were made.

---

## Commands Run

| Command | Result | Detail |
|---|---|---|
| `npm run typecheck` | PASS | Exit 0, no output |
| `npm run lint` | PASS | "No ESLint warnings or errors" (cosmetic `next lint` deprecation notice, not an error) |
| `npm test` | PASS | 151/151 tests, 23 files |
| `npm run build` | PASS | 6 routes rendered (see Build Output below) |

---

## Test Case Coverage vs Plan

All 20 REQ-006 `it()` cases are present and match the plan description exactly.

### `src/lib/navigation/__tests__/routes.test.ts` — 10 cases (node env)

| Plan Case | Present | Verified |
|---|---|---|
| Routes.calendar equals "/" | Yes | Routes.calendar === '/' (as const literal) |
| Routes.list equals "/list" | Yes | Routes.list === '/list' |
| Routes.chat equals "/chat" | Yes | Routes.chat === '/chat' |
| Routes.stats equals "/stats" | Yes | Routes.stats === '/stats' |
| Routes.diary("2026-05-17") returns "/diary/2026-05-17" | Yes | exact string match |
| Routes.diary(date) starts with "/diary/" and ends with date | Yes | two-part assertion |
| empty {} returns "/list" no trailing "?" | Yes | exact string match |
| { month: "2026-04" } returns "/list?month=2026-04" | Yes | exact string match |
| { sort: "asc" } returns "/list?sort=asc" | Yes | exact string match |
| { month: "2026-04", sort: "desc" } returns "/list?month=2026-04&sort=desc" | Yes | month precedes sort confirmed |

### `src/app/__tests__/diary-date-page.test.tsx` — 4 cases (happy-dom)

| Plan Case | Present | Verified |
|---|---|---|
| valid "2026-05-17" renders heading; notFound not called | Yes | heading.textContent contains date |
| "not-a-date" rejects with NEXT_NOT_FOUND; notFound called once | Yes | rejects.toThrow + calledTimes(1) |
| "2026/05/17" fails regex, rejects; notFound called once | Yes | same pattern |
| "2026-13-01" passes regex, renders without notFound (semantic deferred) | Yes | renders heading, mockNotFound not called |

Top-level `await import` after `vi.mock` is used correctly to ensure mock hoisting applies before module evaluation.

### `src/app/__tests__/not-found.test.tsx` — 3 cases (happy-dom)

| Plan Case | Present | Verified |
|---|---|---|
| renders "찾을 수 없는 페이지입니다." | Yes | getByText assertion |
| anchor href="/" with text "캘린더로 돌아가세요" | Yes | getByRole('link') + getAttribute('href') |
| source-guard: no "use client" in not-found.tsx | Yes | fs.readFileSync pattern from Card.test.tsx |

### `src/lib/navigation/__tests__/setupNextNavigation.test.ts` — 3 cases (happy-dom)

| Plan Case | Present | Verified |
|---|---|---|
| mockRouter.push is callable vi.fn with mock.calls array | Yes | push('/test'), length 1 |
| mockNotFound() throws "NEXT_NOT_FOUND" | Yes | expect(() => mockNotFound()).toThrow |
| resetNavigationMocks() clears calls and re-applies throw after mockReset | Yes | all three assertions |

---

## Existing Tests Regression (131 baseline)

All 131 baseline tests from REQ-002 through REQ-005 pass unchanged:

| File | Tests | Status |
|---|---|---|
| `src/lib/storage/__tests__/diaries.test.ts` | 13 | PASS |
| `src/lib/storage/__tests__/conversations.test.ts` | 9 | PASS |
| `src/lib/storage/__tests__/settings.test.ts` | 8 | PASS |
| `src/lib/storage/__tests__/uuid.test.ts` | 3 | PASS |
| `src/lib/storage/__tests__/ssr.test.ts` | 4 | PASS |
| `src/lib/storage/__tests__/no-direct-localstorage-access.test.ts` | 1 | PASS |
| `src/lib/storage/__tests__/limits.test.ts` | 3 | PASS |
| `src/design-system/__tests__/moods.test.ts` | 12 | PASS |
| `src/design-system/__tests__/MoodIcon.test.tsx` | 9 | PASS |
| `src/design-system/__tests__/personas.test.ts` | 17 | PASS |
| `src/design-system/__tests__/Card.test.tsx` | 5 | PASS |
| `src/design-system/__tests__/EmptyState.test.tsx` | 7 | PASS |
| `src/design-system/__tests__/IconButton.test.tsx` | 6 | PASS |
| `src/design-system/__tests__/FAB.test.tsx` | 5 | PASS |
| `src/design-system/__tests__/useDialogControl.test.ts` | 5 | PASS |
| `src/design-system/__tests__/BottomSheet.test.tsx` | 6 | PASS |
| `src/design-system/__tests__/ConfirmDialog.test.tsx` | 8 | PASS |
| `src/design-system/__tests__/Toast.test.tsx` | 5 | PASS |
| `src/design-system/__tests__/useToast.test.ts` | 5 | PASS |
| **Total** | **131** | **PASS** |

---

## Build Output (6 routes)

```
Route (app)                                 Size  First Load JS
┌ ○ /                                      141 B         103 kB
├ ○ /_not-found                            141 B         103 kB
├ ○ /chat                                  141 B         103 kB
├ ƒ /diary/[date]                          141 B         103 kB
├ ○ /list                                  141 B         103 kB
└ ○ /stats                                 141 B         103 kB
```

Exactly 6 routes. `/diary/[date]` is correctly `ƒ` (dynamic server-rendered). All other routes are `○` (static prerendered). Matches self-reported build output in the implementation report.

---

## Source Guards

### No "use client" in any REQ-006 page.tsx file

Grep confirmed zero matches across:
- `src/app/not-found.tsx`
- `src/app/diary/[date]/page.tsx`
- `src/app/chat/page.tsx`
- `src/app/list/page.tsx`
- `src/app/stats/page.tsx`

`chat/page.tsx`, `list/page.tsx`, and `stats/page.tsx` contain no `"use client"` directive and no React import (they export default functions returning plain JSX, consistent with Server Components in Next.js 15 with automatic JSX runtime at build time).

`not-found.tsx` and `diary/[date]/page.tsx` import React explicitly, consistent with the Vitest JSX transform requirement documented in the implementation report.

---

## Routes API Shape Verified

Direct inspection of `src/lib/navigation/routes.ts`:

| Property | Type | Value |
|---|---|---|
| `Routes.calendar` | `'/'` (as const) | `'/'` |
| `Routes.list` | `'/list'` (as const) | `'/list'` |
| `Routes.chat` | `'/chat'` (as const) | `'/chat'` |
| `Routes.stats` | `'/stats'` (as const) | `'/stats'` |
| `Routes.diary` | `(date: string) => string` | `` `/diary/${date}` `` |
| `Routes.listWithFilter` | `(params: { month?: string; sort?: 'asc' \| 'desc' }) => string` | URLSearchParams with month-before-sort ordering |

`src/lib/navigation/index.ts` re-exports `Routes` only; no additional exports.

`setupNextNavigation.ts` exports: `mockRouter`, `mockNotFound`, `mockUseRouter`, `mockUseSearchParams`, `mockUseParams`, `mockUsePathname`, `resetNavigationMocks`. Matches the plan's named export list exactly.

---

## Config Stability

| Check | Result |
|---|---|
| `next.config.ts` unchanged | Confirmed — `const nextConfig: NextConfig = {}; export default nextConfig;` only |
| No `experimental.scrollRestoration` toggle | Confirmed absent |
| `package.json` unchanged (no new deps) | Confirmed — no new runtime or dev dependencies added by REQ-006 |
| Scripts unchanged | `test`, `test:watch`, `typecheck`, `lint`, `build`, `dev`, `start` — all pre-existing |

---

## Discrepancies / Notes

- The implementation report's build output shows 7 static pages (`Generating static pages (7/7)`), which counts internal Next.js pages plus the 6 app routes. The route table shows exactly 6 app routes as required. No discrepancy.
- The CJS build deprecation warning from Vitest 2.x is cosmetic and pre-existing from REQ-002. Not a REQ-006 issue.
- `setupNextNavigation.test.ts` uses `// @vitest-environment happy-dom` on line 1 as specified in the plan, even though the helper itself is a pure module (no DOM). This is correct: the plan calls for happy-dom on this file.
- `diary-date-page.test.tsx` uses top-level `await import` (not a static import) to load the page component after `vi.mock` is applied. This pattern is correct for ensuring mock hoisting applies before module evaluation with Vitest's ESM handling.

---

## Coverage Notes

All 10 Caller Invariants from `04-api-contract.md` are covered by the 20 test cases. Coverage matrix in `06-test-plan.md` is accurate. No uncovered invariants found.

---

## Remaining Risks

All risks are pre-existing from the implementation report:

- `Routes.listWithFilter` does not validate `month` or `sort` values — deferred to REQ-013.
- Semantic date validation in `/diary/[date]` (e.g., Feb 31) — deferred to REQ-009.
- Back-navigation routes, scroll restoration, and modal history isolation — deferred to Phase 13 E2E.

---

## Verdict
PASS

# Code Review — REQ-007

## Summary

REQ-007 implements the main calendar screen: 7-column monthly grid with mood icons, 3-icon header, horizontal swipe + arrow navigation, FAB → diary editor. All 5 new production files present, all contracts substantively honored. 181/181 unit + 1/1 E2E pass. 3 non-blocking issues + 2 nits. No blockers.

---

## Files Reviewed

| File | Lines | Role |
|---|---|---|
| `src/app/page.tsx` | 7 | Thin `"use client"` boundary |
| `src/app/_components/CalendarScreen.tsx` | 104 | Root screen component |
| `src/app/_components/CalendarHeader.tsx` | 89 | Header bar |
| `src/app/_components/CalendarGrid.tsx` | 78 | Pure 7-col grid |
| `src/app/_components/CalendarDayCell.tsx` | 66 | Leaf cell, React.memo |
| `src/lib/storage/useDiaries.ts` | 30 | Client hook |
| `src/app/globals.css` | +1 | Additive token |
| `vitest.config.ts` | +1 | E2E exclude |
| `playwright.config.ts` | 22 | New Playwright config |
| `e2e/calendar.spec.ts` | 17 | Golden-path E2E |
| Test files (5) | 65–119 | Unit tests |

---

## Verdict
PASS

---

## Blocking Issues
None.

---

## Non-Blocking Suggestions

**NB-1: `"use client"` placed after 2 comment lines in `useDiaries.ts`.** Lines 1–3:
```ts
// React hook — client-only. Direct import only;
// NOT re-exported from @/lib/storage/index.ts (that barrel is SSR-safe).
"use client";
```
Next.js parses correctly after comments; build passes. But convention puts `"use client"` as first statement. Every other client file in this repo does. Recommend moving directive to line 1, comments after.

**NB-2: `onSearch`/`onStats`/`onList` are inline arrows, not `useCallback`-stabilized.** `CalendarScreen.tsx` lines 88–90:
```ts
onSearch={() => {}}
onStats={() => router.push(Routes.stats)}
onList={() => router.push(Routes.list)}
```
Contract Invariant 6 mandates `useCallback` on `onCellTap`/`onFAB` (done correctly). The 3 header callbacks don't matter today (`CalendarHeader` not memoized), but would break future `React.memo` wrapping without follow-up. Wrap for consistency.

**NB-3: `pointerStartX` persists across canceled gestures (no `onPointerCancel`).** When OS cancels a pointer (notification, multi-touch), `pointercancel` fires but `pointerup` doesn't. Next unrelated `pointerup` computes spurious delta → may unexpectedly advance month. Add `onPointerCancel={() => { pointerStartX.current = null; }}`.

---

## Nits

**Nit-1: `CalendarScreen` is 104 lines — just over 100-line guideline.** The single logical excess is the `PenIcon` JSX constant (lines 12–18). Extracting it brings file to 97 lines. Minor soft violation of the "곧 다시 줄어들 테니 두자" anti-pattern.

**Nit-2: `CalendarGrid` test offset count via `previousElementSibling` is fragile.** Works because `CalendarDayCell` root is `<button>` (no wrapper). If a wrapper `<div>` is ever added, silently counts wrong. Acceptable for now.

---

## Positive Notes

- `useDiaries` correctly places `readDiaries` inside `useEffect` for SSR safety + hydration mismatch protection.
- `CalendarGrid` has no `"use client"` (correct — pure, rendered inside client tree, type-only imports from `@/lib/storage`).
- `CalendarDayCell` uses `React.memo(function CalendarDayCell(...))` named-function pattern (preserves DevTools display name).
- `diaryByDate` uses `useMemo([entries])` with `Map<string, DiaryEntry>` for O(1) lookup — per contract.
- `(typeof entries)[number]` idiomatic — avoids redundant `DiaryEntry` import.
- All navigation through `Routes.*`, zero hardcoded paths.
- Token discipline perfect — no hex in components.
- Korean strings everywhere required.
- Playwright config minimal + correct (Chromium only, `webServer reuseExistingServer`).
- E2E uses role/aria-label only — no `data-testid` in production.
- `useDiaries` initial-state adaptation correctly documented; coverage closed via `CalendarScreen.test.tsx` mock.
- 151 baseline tests pass unchanged.

---

## Contract Conformance per Component

| Component | Props match | JSDoc | "use client" | Key behaviors |
|---|---|---|---|---|
| `useDiaries` | Returns `{ entries, isReady }` ✓ | ✓ | Line 3 (after 2 comments — NB-1) | `isReady` transitions once; never throws |
| `CalendarScreen` | No props ✓ | ✓ | Line 1 | `useCallback` on `onCellTap`/`onFAB`; `useMemo` diaryByDate; swipe ±40px; pen icon as prop |
| `CalendarHeader` | All 7 match; year accepted but not rendered | ✓ | Line 1 | Plain `<button>` arrows w/ Korean aria-label; 3 IconButtons |
| `CalendarGrid` | All 5 match; `Map<string, DiaryEntry>` | ✓ | Absent (correct) | Sunday-first weekday header; YYYY-MM-DD dateKey; null slots non-interactive |
| `CalendarDayCell` | All 4 match | ✓ | Line 1 | React.memo; 44px touch; aria-label format; today peach dot/text |

Minor gap: contract specifies explicit `React.MemoExoticComponent` type annotation on `CalendarDayCell`; actual code uses `React.memo(function ...)` inferred. TS infers correctly. Non-blocking.

---

## Invariant Correctness

- `onCellTap` never called for null slots — confirmed (null slots render `<div>` with no handlers).
- `onTap(date)` called with verbatim prop — confirmed (`onClick={() => onTap(date)}`).
- Swipe ±40px threshold — confirmed (`delta <= -40` / `delta >= 40`).
- `today` derived via `toLocaleDateString('sv')` — confirmed.
- `month` 0-based rendered as `{month+1}월` — confirmed.
- `useDiaries` not re-exported from storage barrel — confirmed (`src/lib/storage/index.ts` has no reference).

---

## CLAUDE.md Compliance

**File size**: 5 of 6 production files ≤ 100 lines. `CalendarScreen` at 104 — minor soft violation (Nit-1).

**Korean strings**: all user-facing text Korean. Code identifiers English. Compliant.

**No new runtime deps**: `@playwright/test` is devDep only. Compliant.

**No UI reimplementation**: `MoodIcon`, `IconButton`, `FAB` imported from design-system. Compliant.

**No barrel re-exports** of `useDiaries`. Compliant.

---

## Type Safety

No `any` casts. `(typeof entries)[number]` idiomatic. `Map<string, DiaryEntry>` typed correctly. Missing explicit `React.MemoExoticComponent` annotation on `CalendarDayCell` is style nit only.

---

## Test Quality

30 new unit cases cover all contract invariants:
- `useDiaries`: 4 cases, `vi.mock('@/lib/storage')` proves abstraction boundary.
- `CalendarDayCell`: 7 cases (plan said 6; extra aria-label split is superset). Class assertions not hex.
- `CalendarGrid`: sibling traversal for offset count (correct for flat layout; brittle — Nit-2). `getAllByRole('img')` for MoodIcon presence is solid.
- `CalendarHeader`: 6 cases all callbacks + Korean aria-labels.
- `CalendarScreen`: swipe ±60px (satisfies 40 threshold), month-wrap edge cases.

`isReady=false` test adaptation valid (happy-dom flushes effects sync inside `renderHook`); hydration guard separately proven via `CalendarScreen.test.tsx` case 2.

---

## E2E Setup Quality

- `playwright.config.ts`: `testDir: './e2e'`, Chromium only, `webServer reuseExistingServer: !process.env.CI`, `forbidOnly: !!process.env.CI`.
- `vitest.config.ts excludes 'e2e/**'` — prevents Playwright `test()` collision.
- `e2e/calendar.spec.ts` role/aria-label only; no `data-testid` in production.
- Golden path: navigate `/` → assert month label → click FAB → assert `/diary/YYYY-MM-DD`.

---

## Backward Compatibility

Only expected files modified: `src/app/page.tsx` (planned replacement), `globals.css` (additive token), `vitest.config.ts` (additive exclude), `package.json` (additive devDep + scripts). All 151 baseline tests pass unchanged. No existing component/hook/test modified.

---

## Architecture Consistency

- `"use client"` on leaf interactive components; absent on stateless presentational rendered inside client subtree.
- `readDiaries` accessed only via `useDiaries` hook.
- All navigation via `Routes.*`.
- `IconButton`/`MoodIcon`/`FAB` imported per-file from `@/design-system/`, not re-implemented.
- `// @vitest-environment happy-dom` + `afterEach(cleanup)` consistent.
- `setupNextNavigation` helper reused identically to `diary-date-page.test.tsx`.

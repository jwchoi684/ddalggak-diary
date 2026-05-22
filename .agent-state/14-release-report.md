# Release Report

## Summary

REQ-014 (통계 화면) fills in the existing stub at `src/app/stats/page.tsx` with a fully
functional monthly mood stats screen. The screen shows a year/month navigator, a mood-icon
summary row, a horizontal bar chart of mood distribution, and an empty-month state. The
`addMonths` helper is extracted from `ListHeader.tsx` into a shared utility so both the List
and Stats headers share a single implementation.

All ten required gate reports are present and PASS. 322 unit tests green, 8/8 E2E specs green,
TypeScript clean, ESLint clean. No new external dependencies. No unrelated changes included.

---

## Files Changed

### New production files

| File | Lines | Description |
|---|---|---|
| `src/lib/utils/addMonths.ts` | 14 | Shared YYYY-MM month arithmetic utility |
| `src/app/stats/_components/useMoodStats.ts` | 45 | Aggregation hook: counts, hasData, maxCount |
| `src/app/stats/_components/StatsHeader.tsx` | 96 | Two-row month navigator + X close button |
| `src/app/stats/_components/MoodBarChart.tsx` | 59 | Icon summary row + horizontal bar chart + empty state |
| `src/app/stats/page.tsx` | 48 | Replaced stub: Suspense shell + StatsPageContent |

### Modified production files

| File | Change | Description |
|---|---|---|
| `src/app/list/_components/ListHeader.tsx` | 7-line refactor | Remove inline addMonths; import from shared util |

### New test files

| File | Cases | Description |
|---|---|---|
| `src/lib/utils/__tests__/addMonths.test.ts` | 6 (AM1–AM6) | Forward, backward, year rollover both ways, identity, +12 |
| `src/app/stats/_components/__tests__/useMoodStats.test.ts` | 5 (UMS1–UMS5) | Empty, wrong-month filter, sort, tiebreak, all-10 |
| `src/app/stats/__tests__/StatsScreen.test.tsx` | 10 (SS1–SS10) | Full screen: empty, bar widths, all moods, month nav rollover, close, search param, tiebreak, loading, partial |

### Modified agent-state reports

All `.agent-state/00–13` reports updated for REQ-014 scope.
`.agent-state/security-report.md` mirror updated.
`.agent-state/requirements/REQ-014.md` status: TODO → DONE.
`.agent-state/requirements/index.md` REQ-014 row: TODO → DONE.

---

## Gate Status

| Gate | Report | Verdict |
|---|---|---|
| Requirement intake | `01-requirement-intake.md` | PASS |
| Architecture | `02-architecture-report.md` | PASS |
| Technical design | `03-technical-design.md` | PASS |
| API contract | `04-api-contract.md` | PASS |
| DB / migration | `05-db-migration-report.md` | PASS (no schema change) |
| Test plan | `06-test-plan.md` | PASS |
| Test report | `08-test-report.md` | PASS |
| Code review | `09-code-review-report.md` | PASS |
| Security review | `10-security-report.md` | PASS |
| E2E | `13-e2e-report.md` | PASS (no new spec; display-only screen covered by component tests) |
| Performance | `11-performance-report.md` | PASS |
| Infra | `12-infra-report.md` | PASS |

---

## Tests Run

```
npx vitest run --reporter=basic   →  46 files, 322/322 PASS  (10.87s)
npx tsc --noEmit                  →  clean (0 errors)
npm run lint                      →  clean (0 warnings/errors)
npm run test:e2e                  →  8/8 PASS (27.3s)
```

New tests: 6 unit (addMonths) + 5 hook (useMoodStats) + 10 component (StatsScreen) = 21 new cases.
Pre-existing: 301 unit + 8 E2E — all passing, no regression.

---

## Review Status

Code review PASS. No blocking issues.

Three non-blocking suggestions deferred per policy:

1. NB1: ChevronLeft/ChevronRight SVG icons duplicated between StatsHeader and ListHeader. Extract
   to `src/design-system/icons.tsx` before a fourth screen uses chevrons.
2. NB2: `MOOD_MAP[moodId]` has no undefined fallback in MoodBarChart. Safe by construction; a
   `mood?.color ?? '#EBEBEB'` guard would add defensive depth.
3. NB3: `currentMonth` derivation calls `new Date()` on every render; used only as useState
   initial value so computed once in practice — a useMemo or module constant would clarify intent.

---

## Security Status

Security review PASS. No critical, high, or medium issues.

One accepted low-severity residual risk:

- L-1: `?month=` query param used unsanitized for filter equality and Date constructor input only.
  Cannot escape into HTML. Same posture as REQ-013. Self-contained.

---

## E2E Status

E2E PASS. No new Playwright spec for REQ-014. Rationale: display-only screen with no form
submission or multi-step async flow; all paths (empty, populated, month nav, close, sort) are
deterministic in the 10 component tests with mocked navigation. Pre-existing 8/8 specs pass.

---

## Performance / Infra Status

Performance PASS. `useMoodStats` is O(n) over entries and wrapped in `useMemo([entries, yearMonth])`.
At most ~365 entries for a single user; negligible. `MOODS.findIndex` in tiebreak sort is O(10)
on at most 10 elements.

Infra PASS. No new npm packages. No env vars. No deployment config changes. Pure client-side
feature bundled with existing Next.js build.

---

## Commit Message

```
feat: monthly mood stats screen (REQ-014)

- Replace /stats stub with full stats screen: two-row month navigator,
  mood-icon summary row, horizontal pill bar chart (count DESC sort),
  and empty-month state
- Extract addMonths to src/lib/utils/addMonths.ts shared by ListHeader
  and StatsHeader (eliminates duplicate)
- 322 unit tests pass; 8/8 Playwright E2E specs pass

Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>
```

---

## PR Body

```md
## Summary

- Replaces the placeholder at `src/app/stats/page.tsx` with a fully functional monthly
  mood stats screen.
- Two-row month navigator (year above, "M월" + chevrons below) with year rollover;
  close button (✕) calls `router.back()`.
- Mood-icon summary row: only moods with ≥1 entry in the selected month, size=64.
- Horizontal bar chart: MoodIcon(40) + gray track + color fill (pill-shaped) + right-aligned count,
  sorted count DESC with MOODS master-array index as stable tiebreak.
- Empty month: "이 달에는 기록이 없어요" via EmptyState; mood row and chart are hidden;
  month navigator stays interactive.
- `addMonths` extracted from ListHeader to `src/lib/utils/addMonths.ts` — shared utility,
  no duplication.

## Acceptance Criteria

- [x] Month navigator shows year (bare YYYY) and month (M월, no zero-padding).
- [x] Prev/Next month buttons trigger year rollover correctly.
- [x] ✕ close calls `router.back()`.
- [x] Summary row shows only moods that appear in the selected month.
- [x] Bar chart rows sorted count DESC; tiebreak by MOODS master-array index.
- [x] Bar fill width = `Math.max(8, (count / maxCount) * 100)`% (percentage, not pixels).
- [x] Bar fill color = `mood.color` from MOODS master; gray track behind.
- [x] Empty month hides chart and icon row, shows Korean message, keeps nav live.
- [x] `?month=YYYY-MM` search param used as initial month if present.

## Technical Notes

- Pattern mirrors `src/app/list/page.tsx` exactly: `"use client"` + `<Suspense>` +
  `useSearchParams` + `useDiaries`. Month nav updates local `useState` only (no `router.push`).
- Bar widths via inline `style={{ width: '..%' }}` — no chart library.
- Bar colors via inline `style={{ backgroundColor: mood.color }}` — Tailwind cannot generate
  dynamic classes from runtime hex values.
- `StatsHeader.tsx` is 96 lines (soft limit 100); excess is inline SVG defs — deferred NB.
- Three deferred non-blocking code-review items: chevron SVG deduplication, MOOD_MAP undefined
  guard, currentMonth useMemo.

## API / Interface Changes

No HTTP endpoints. Four new internal TypeScript interfaces (`useMoodStats`, `StatsHeader`,
`MoodBarChart`, `addMonths`) — all client-side only. No existing component props modified.

## Data / Migration Notes

No localStorage schema change. Read-only consumption of existing `ddalkkak:diaries:v1`.

## Tests

- 6 unit cases for `addMonths` (AM1–AM6): forward, backward, year rollover both ways, identity, +12.
- 5 hook cases for `useMoodStats` (UMS1–UMS5): empty, wrong-month filter, sort, tiebreak, all-10.
- 10 component cases for `StatsScreen` (SS1–SS10): empty state, bar width proportions, all 10
  moods, prev/next nav with rollover, close button, search param init, tiebreak order, loading
  state, partial mood set.
- 322/322 Vitest green; 8/8 Playwright green; TypeScript + ESLint clean.

## Security Review

PASS. No XSS paths (all user text in React text nodes). No secrets. No new dependencies.
One accepted low residual risk: `?month=` param unsanitized beyond Date arithmetic — no HTML
injection path.

## E2E Evidence

`npm run test:e2e` → 8/8 PASS (27.3s, Chromium). No new spec for stats (display-only screen;
all paths covered by 10 component tests with mocked navigation).

## Risk / Rollback Plan

Low risk. Replaces a stub with no existing callers or tests. Roll back by reverting
`src/app/stats/` and `src/lib/utils/addMonths.ts`, and restoring the inline `addMonths`
function in `src/app/list/_components/ListHeader.tsx`. No data migration required.
```

---

## Remaining Risks

1. Deferred NB1: ChevronLeft/ChevronRight SVGs duplicated in ListHeader and StatsHeader.
   No runtime impact. Extract before a fourth screen needs chevrons.
2. Deferred NB2: `MOOD_MAP[moodId]` lookup in MoodBarChart has no undefined fallback. Safe
   by construction today; a legacy diary with an unrecognized mood id would throw at render.
3. `StatsHeader.tsx` at 96 lines is near the 100-line soft limit. Not a concern now.
4. Month selection resets to current month on browser refresh (local useState, no URL push).
   Accepted per architecture decision; caller can pass `?month=` if needed.
5. E2E Chromium-only. Safari/Firefox deferred to a future CI expansion.

---

## Verdict
PASS

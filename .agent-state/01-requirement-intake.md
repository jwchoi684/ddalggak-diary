# Requirement Intake — REQ-007

## Restatement

REQ-007 converts the app entry screen (`src/app/page.tsx`) from a placeholder into the **main calendar screen**: a 7-column monthly grid showing `MoodIcon` (32px) on days that have entries and grey (`#C8C8C8`) numerals on days that do not. The header exposes three right-side `IconButton`s (검색→`/chat`, 통계→`/stats`, 리스트→`/list`); a charcoal `FAB` (✏) sits bottom-right and routes to today's editor. Tapping any in-month cell routes to `/diary/[date]`. Month navigation works via arrow controls and horizontal swipe. This is the **first interactive screen** in the codebase and therefore the first real consumer of REQ-002 storage reads, REQ-003 MoodIcon, REQ-005 primitives, and REQ-006 `Routes`.

## In Scope

- Convert `/` into a Client Component (`"use client"`) that owns the visible month and the loaded diary list.
- Read entries via `readDiaries()` (REQ-002) inside `useEffect` so SSR returns the empty calendar shell with no hydration mismatch.
- Render a 7×6 (max 42) grid for the visible month using **only days that fall inside the current month** (out-of-month cells render empty placeholders or are omitted — PRD §4.1.4 "이번 달 외 날짜는 미표시").
- Render today's date with subtle emphasis (text-only, no background — PRD §4.1.4).
- Render a header row with right-aligned IconButtons (🔍 검색, 📊 통계, 📋 리스트) wired through `Routes.chat / stats / list`.
- Render a large "M월 ›" month label (left-aligned, 32–40pt) with adjacent ‹ › arrow affordances for prev/next month.
- Implement horizontal swipe (touch) → month ±1.
- Render an `FAB` (✏ pen icon) fixed bottom-right that routes to `Routes.diary(today)` where `today = "YYYY-MM-DD"` from the user's local timezone.
- Tap on any in-month cell → `router.push(Routes.diary(cellDate))`. Empty vs filled cells route identically; the mood-picker auto-open is a downstream concern (REQ-008/009).
- Bootstrap **Playwright** at the project level (config + first golden spec: open app → calendar visible → FAB → `/diary/[today]`).
- Hook extracted: `useDiaries()` at `src/lib/storage/useDiaries.ts` that wraps `readDiaries` + `useState` + `useEffect` (justified below in Q5).

## Out of Scope (deferred to owner REQ)

| Item | Deferred to | PRD reference |
|---|---|---|
| Mood picker bottom sheet | REQ-008 | §4.2 |
| Editor content (form, save, fields) | REQ-009 | §4.3 |
| Auto-opening the picker on empty cell tap | REQ-009 (editor owns its modal lifecycle) | §4.1.7 + §4.2.1 |
| Bottom photo strip | v2 (not an MVP REQ) | §4.1.6 |
| Month / year picker modal | P1 (not an MVP REQ) | §4.1.3 |
| Landscape mode handling | MVP-out | §10.4 |
| Left-side header icons (⚙ settings, 📦 archive) | v2 | §4.1.2 |
| Dark mode / theme switching | v2 | §13.2 |
| Multi-month preloading / virtualization | Not needed at MVP scale | — |
| Search / list / stats / chat screen *content* | REQ-013 / REQ-014 / REQ-015–018 | — |

## Invariants

1. **Data access**: the calendar reads diaries **only** via `readDiaries()` from `@/lib/storage`. No direct `localStorage` access, no new storage abstraction.
2. **Design-system reuse**: all interactive chrome composes existing primitives — `IconButton` and `FAB` (REQ-005), `MoodIcon` (REQ-003). No new SVG paths, no hardcoded emoji outside `MOODS`, no inline circular-button markup.
3. **Routing**: every navigation goes through `Routes.*` (REQ-006). Raw string literals like `'/diary/...'` are forbidden in the calendar code.
4. **Layout context**: the 420px max-width container is already provided by `layout.tsx` (REQ-001/006). The calendar must not introduce a competing width constraint.
5. **SSR safety**: storage reads happen inside `useEffect`. The initial render must produce the empty-grid shell (no MoodIcons) so server HTML and first client paint match.
6. **Out-of-month cells**: cells before the 1st of the month and after the last day are not displayed as numbers or mood icons (per §4.1.4). They occupy grid slots silently to preserve weekday alignment.
7. **One screen per file → 100-line guideline**: the calendar is decomposed into `page.tsx` (thin boundary), `CalendarScreen`, `CalendarHeader`, `CalendarGrid`, and `CalendarDayCell` so no single file exceeds the soft cap.
8. **Visual tokens**: today's emphasis, grey number color, cream background, header icon container — all sourced from existing CSS tokens (`text-charcoal`, `text-meta`, brand peach `#F5C896`, etc.). No new design tokens.
9. **Locale**: month label, weekday header (일·월·화·수·목·금·토), and aria-labels are Korean.
10. **Today determination**: derive `today` once per render using local timezone (`new Date()` formatted to `YYYY-MM-DD`), not UTC.

## Open Questions and Recommended Defaults

### Q1. Component file layout — monolithic or split?

**Recommendation: split.** A single `page.tsx` will trivially exceed 100 lines once header + grid + swipe handler + state + effects coexist. Proposed split:

- `src/app/page.tsx` — thin `"use client"` boundary that renders `<CalendarScreen />`.
- `src/app/_components/CalendarScreen.tsx` — owns visible-month state, today's date, diary load, swipe handler, navigation callbacks.
- `src/app/_components/CalendarHeader.tsx` — right-side IconButton row + "M월 ›" label + prev/next arrows.
- `src/app/_components/CalendarGrid.tsx` — pure grid renderer; accepts `{ year, month, diaryByDate, today, onCellTap }`.
- `src/app/_components/CalendarDayCell.tsx` — single cell; wrapped in `React.memo`.

Total: 5 files, each comfortably under 100 lines.

### Q2. Where do `_components` live?

**Recommendation: `src/app/_components/`** (Next.js convention — the leading underscore tells the App Router this folder is *not* a route segment). This keeps screen-specific composites colocated with the route that owns them. Cross-screen composites that emerge later (e.g. a shared `Toolbar` once the list screen also wants header icons) graduate to `src/components/`.

### Q3. Month state location — `useState` or URL search params?

**Recommendation: `useState`** inside `CalendarScreen`. Month is transient navigation state with no deep-link, share, or refresh-stability requirement at MVP. URL search params (`?month=YYYY-MM`) add a `useSearchParams` dependency, force the route to be dynamic, and complicate the back-stack semantics already covered by REQ-006. If a "share this month" use case appears in v2, migrate then.

### Q4. Swipe vs arrows for month navigation?

**Recommendation: both.** Arrows (‹ ›) are keyboard- and mouse-accessible (desktop, screen readers) and serve as the visible affordance for the "›" call-out in PRD §4.1.3. Swipe is required on mobile per §4.1.7 ("좌우 스와이프"). Implement swipe with native `pointerdown`/`pointerup` deltas (no library); a horizontal delta > ~40px commits month ±1. No vertical scroll lock — the page itself does not scroll meaningfully at this point.

### Q5. Extract a `useDiaries()` hook?

**Recommendation: yes, create it now in REQ-007.** Justification:

- Pattern (`useState<DiaryEntry[]>([]) + useEffect(() => setEntries(readDiaries()))`) is reused identically by REQ-009 (editor preload), REQ-013 (list), REQ-014 (stats). Deferring duplicates the boilerplate in four places and risks divergence on SSR-guard logic.
- It is the cheapest possible hook: ~10 lines, zero external dependencies, returns `DiaryEntry[]`.
- Location: `src/lib/storage/useDiaries.ts`. Re-exported from `@/lib/storage` only if downstream REQs prefer that import path — REQ-007 imports it directly.

**Counter-argument considered**: defer to REQ-013 to avoid speculative generalization. Rejected because (a) the hook is so small that "generalize later" creates more churn than "extract now," and (b) the pattern is already concrete: REQ-009/013/014 each name diary loading as a known step. This is YAGNI-compliant — the second caller is in the next REQ.

### Q6. FAB position conflict with calendar?

**Recommendation: no change.** REQ-005's `FAB` defaults to `fixed bottom-6 right-6`. The calendar bottom area is intentionally empty (photo strip is v2). No layout collision, no className override needed.

### Q7. Header layout — left side?

**Recommendation: render only the right-side group (3 IconButtons) for MVP.** PRD §4.1.2 explicitly defers ⚙ settings and 📦 archive ("MVP는 좌측 아이콘 생략하거나 1개만"). Leaving the left empty matches the v0 build-order and avoids placeholder buttons that route nowhere.

### Q8. Today's date highlight when an entry exists?

**Recommendation: emphasize today identically in both cases, applied to whichever element occupies the cell.** If the cell shows a number, apply `font-bold text-peach` (`#F5C896` brand accent — already in CSS tokens). If the cell shows a MoodIcon, render a small 4px `bg-peach` dot beneath the icon (PRD §4.1.4 explicitly allows "작은 점"). This keeps the affordance "this is today" visible even when the mood occupies the number slot. Single brand color usage matches §1.6.2 ("primary `#F5C896` used only for selected/active emphasis").

### Q9. MoodIcon size in cells?

**Recommendation: 32.** PRD §4.1.4 specifies "~32px"; REQ-003's `MoodIcon` accepts arbitrary `size`. Pass `size={32}` literal. No new token needed (a single call site does not warrant a constant).

### Q10. Playwright bootstrap scope?

**Recommendation: bootstrap in REQ-007.** REQ-005 and REQ-006 forward-designated this REQ as the E2E entry point. Concrete scope:

- Install `@playwright/test` as a devDependency.
- Add `playwright.config.ts` at repo root with `testDir: 'e2e'`, base URL pointing at `http://localhost:3000`, Chromium-only for MVP.
- Add an npm script `test:e2e` and (optionally) `test:e2e:ui`.
- Write **one** golden spec at `e2e/calendar.spec.ts`: navigate to `/`, assert header IconButtons + month label visible, click FAB, assert URL becomes `/diary/<today>`. Subsequent REQs add their own specs to the same `e2e/` folder.

Anything beyond this single spec (mocked diary fixture, swipe gesture coverage, header-icon routing matrix) belongs to REQ-007's own test plan (Phase 8), not its intake.

### Q11. `React.memo` on `CalendarDayCell`?

**Recommendation: yes.** A month renders up to 31 visible cells, and `CalendarScreen` re-renders on every month change. Cells take a stable date string + an optional `MoodId` + an `onTap` callback; if the callback is stabilized via `useCallback`, memoization is essentially free and prevents N re-renders on month transitions. Add a brief code comment naming the hot-path so future readers understand the wrapping is deliberate.

## Dependency Check

| Dep | Status (per `index.md`) | What REQ-007 consumes |
|---|---|---|
| REQ-002 | DONE | `readDiaries()`, `DiaryEntry`, `MoodId` types from `@/lib/storage` |
| REQ-003 | DONE | `MoodIcon` component, `MOOD_MAP` (transitively via MoodIcon) |
| REQ-005 | DONE | `IconButton`, `FAB` primitives from `@/design-system` |
| REQ-006 | DONE | `Routes.calendar / diary / list / chat / stats` from `@/lib/navigation` |
| REQ-001 | DONE | Next.js App Router scaffold, Tailwind tokens, 420px container, `src/app/layout.tsx` |

All upstream dependencies are merged. No blocking gaps. Out-of-scope screens (`/list`, `/stats`, `/chat`, `/diary/[date]`) exist as REQ-006 placeholder routes — they are valid navigation targets even though their content lands in later REQs.

## Verdict
PASS

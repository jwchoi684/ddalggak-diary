# Requirement Intake — REQ-014

## Restatement

REQ-014 adds a Stats screen reachable from the bottom nav. The screen shows the emotional distribution for a selected month: a year/month navigator at the top (small year label above, large "M월" with ‹ › chevrons below), a compact row of mood icons for moods that appeared at least once that month, and a horizontal bar chart below it listing each mood's count in descending order. Each chart row contains a 40 px MoodIcon, a rounded color bar whose width is proportional to the maximum count in that month, and a right-aligned count. An ✕ button (white circle, top-right) closes via `router.back()`. An empty month hides the mood row and chart and shows "이 달에는 기록이 없어요" while keeping month navigation live.

## In Scope

- Stats page at the existing stub route `src/app/stats/page.tsx` (REQ-006).
- Year/month header navigator: two-row layout (year line above, "M월" + chevrons below), defaulting to the current calendar month at entry.
- Year rollover on month navigation (e.g., Jan → Dec of prior year).
- Mood-icon summary row: only moods with count ≥ 1, ~64 px icons, centered, no card/background.
- Horizontal bar chart: MoodIcon (40 px) + rounded bar (radius = height/2) + right-aligned count, sorted count DESC.
- Bar width: proportional to max count in month (max = 100 % of available width). Minimum visible width for any present bar.
- Bar color: `mood.color` from `MOODS` master, no separate mapping.
- Empty-month state: message + hide mood row and chart, keep month nav.
- ✕ close button (white circle, top-right) → `router.back()`.
- Optional gray track behind color bar (PRD §4.7.4 notes this as an acceptable style).
- All UI copy in Korean.

## Out of Scope (with pointer to owner REQ if known)

- Weekly trend line chart, year-over-year comparison, streak counter, total-days summary card — deferred to v2 (§4.7.6, no REQ assigned yet).
- Download / share — v2 (§4.7.6).
- Mid-session persona switching or AI features — REQ-015–018.
- URL search-param persistence of selected month — see Open Questions; treated as implementation detail, not a PRD requirement.

## Invariants

1. Close button is ✕ (not a back-arrow chevron). Uses the white circular 44 px container / 24 px icon pattern from CLAUDE.md §1.6 (same as PhotoViewer).
2. `router.back()` is the close target — same convention as other secondary screens.
3. `MOODS` array from `src/design-system/moods.ts` is the single source of mood colors and order. No new color mapping.
4. Mood count sort is descending by count; chart and icon row use the same order.
5. Bar radius equals `height / 2` (fully rounded pill ends), per PRD §4.7.4 and §1.6.6.
6. Only moods with at least one entry in the selected month appear in the icon row and chart. Moods with zero count are completely absent.
7. Empty month: "이 달에는 기록이 없어요" shown; mood row and chart are hidden; month navigator remains interactive.
8. No third-party chart library. Bars implemented as plain `div` elements with inline/CSS width percentages.
9. File size rule: if `StatsPage` exceeds 100 lines, extract `MoodBarChart` (and `MonthNav` if warranted) as separate files in `src/app/stats/_components/`.
10. UI component reuse rule: check for existing `IconButton`, `MoodIcon`, `EmptyState` before creating new components.
11. Default month is the current calendar month at screen entry — not the month last viewed in the calendar or list (unless `?month=` is passed).
12. `useDiaries()` from `@/lib/storage/useDiaries` is the data source; no backend calls.

## Open Questions and Recommended Defaults

**Q1: Year/month header layout — single line or two-row?**
PRD §4.7.1 shows two rows: small gray year ("2026") on its own line, then large "‹ 5월 ›" below. Default: two-row layout. Year: "YYYY" (4-digit, no "년" suffix per the PRD diagram). Month: "M월" (no zero-padding).

**Q2: Mood-icon row sort — count descending, master order, or appearance order?**
Default: count descending. Tiebreak: stable secondary by `MOODS` master array index.

**Q3: Bar height — what px value?**
Default: 28 px (pill radius 14 px).

**Q4: Bar color — full `mood.color` or alpha?**
Default: full `mood.color` (no alpha).

**Q5: Gray track behind color bar — required or optional?**
Default: include gray track (`bg-[#EBEBEB]`) for legibility on low-count bars.

**Q6: Minimum bar width for low counts?**
Default: minimum rendered bar width of 6 px regardless of proportion (so count=1 in a max=20 month is still visible).

**Q7: URL search param vs local `useState` for selected month?**
Default: read `?month=YYYY-MM` if present (consistent with REQ-013), else local default to current month. Use a single `useState` initialized from `useSearchParams`. Month nav can push to URL via `Routes.statsWithMonth` (architecture phase will confirm if this route helper exists; if not, just `useState`).

**Q8: Default month — current real-world month, or last-viewed?**
Default: current real-world month if `?month=` absent. Calendar/list can pass `?month=` in the future to convey "last viewed."

**Q9: Mood-icon sizes — summary row vs chart row?**
Default: `size={64}` summary row (matches calendar size scaled up for emphasis), `size={40}` chart row (per PRD §4.7.4).

**Q10: Tied counts in chart — sort stability?**
Default: count DESC primary, `MOODS` master index ASC secondary tiebreak.

## Dependency Check

| Dependency | Required Status | Actual Status |
|---|---|---|
| REQ-002 (data model / localStorage) | DONE | DONE |
| REQ-003 (MOODS master + MoodIcon) | DONE | DONE |
| REQ-005 (design system primitives) | DONE | DONE |
| REQ-006 (routing shell / stats stub route) | DONE | DONE |

All four declared dependencies are DONE.

## Verdict
PASS

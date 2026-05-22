# Architecture Report — REQ-014

## Summary

REQ-014 (통계 화면) fills in the existing stub at `src/app/stats/page.tsx` (8 lines, no logic). All dependencies (REQ-002, REQ-003, REQ-005, REQ-006) are DONE. No backend, no DB, no new libraries. The screen is pure client-side computation over `localStorage` diary data. All design system primitives required (`MoodIcon`, `IconButton`, `EmptyState`, `Card`) exist and are confirmed reusable. The main architectural decisions are: (1) mimic the ListPage's `Suspense + useSearchParams + useDiaries` pattern, (2) extract `addMonths` to a shared utility so both ListHeader and StatsHeader can import it, (3) split into 2–3 sub-components in `src/app/stats/_components/` to stay within the 100-line file budget.

---

## Codebase Map

```
src/
  app/
    stats/
      page.tsx                      ← stub (8 lines), will become the shell
    list/
      page.tsx                      ← reference implementation to mimic
      _components/
        ListHeader.tsx              ← contains addMonths helper (extract to shared util)
    diary/[date]/
      _components/                  ← confirms _components/ convention
  design-system/
    MoodIcon.tsx                    ← size: number prop, Server Component
    moods.ts                        ← MOODS array + MOOD_MAP + getMood()
    IconButton.tsx                  ← "use client", 44×44 white circle
    EmptyState.tsx                  ← Server Component
    Card.tsx                        ← Server Component
  lib/
    storage/
      useDiaries.ts                 ← { entries: DiaryEntry[], isReady: boolean }
    navigation/
      routes.ts                     ← Routes.stats = '/stats' (no statsWithMonth)
      __tests__/
        setupNextNavigation.ts      ← mockRouter, resetNavigationMocks
  app/globals.css                   ← @theme tokens: bg-cream, bg-paper, text-charcoal, text-meta
```

---

## Findings

**1. Stats stub (`src/app/stats/page.tsx`)**
Plain RSC, 8 lines, no `"use client"`. Must become a `"use client"` shell wrapping a `Suspense` boundary (same as ListPage) because `useSearchParams` requires client context.

**2. `MoodIcon.tsx` — size prop**
`size: number` integer pixels. Use `size={64}` for the summary icon row and `size={40}` for each chart row.

**3. `moods.ts` — MOODS array shape**
`{ id: MoodId, emoji: string, label: string, color: string }`, 10 entries. `MOOD_MAP` provides O(1) lookup by `MoodId`. Use `MOOD_MAP[id]` directly (safe — all ids come from typed `DiaryEntry.mood`).

**4. `IconButton.tsx` — ✕ close button**
`"use client"`, requires `icon`, `label`, `onClick`. The ✕ can be inline SVG or unicode `✕` inside a `<span>`. Positioned `absolute top-4 right-4` in the header.

**5. `EmptyState.tsx`**
`title: React.ReactNode`, `description?: string`, `action?: ReactNode`, `icon?`, `className?`. For empty-month: `title="이 달에는 기록이 없어요"` with no icon/action. Use `className="mt-16"`.

**6. `Card.tsx`**
Available. PRD does not mandate a card wrapper — bare `bg-cream` section with `px-4` padding is acceptable. Recommend skipping `Card` for the chart section.

**7. `useDiaries.ts`**
`{ entries: DiaryEntry[], isReady: boolean }`. Hook reads from localStorage once on mount. Guard all aggregation behind `isReady` exactly as ListPage does. Import directly from `@/lib/storage/useDiaries` (not the SSR-safe barrel).

**8. `routes.ts` — stats route**
`Routes.stats = '/stats' as const` exists. No `statsWithMonth` helper. Recommend `useState` only for month (no URL sync needed for stats — different UX from list).

**9. `addMonths` helper**
Lives in `src/app/list/_components/ListHeader.tsx` (lines 14–18), module-private. **Extract to `src/lib/utils/addMonths.ts`** so both ListHeader and StatsHeader can import it.

**10. Tailwind tokens in `globals.css`**
Confirmed: `bg-cream`, `bg-paper`, `text-charcoal`, `text-meta`. Bar colors use inline `style={{ backgroundColor: mood.color }}` — Tailwind cannot generate dynamic classes from runtime hex values.

**11. Existing test patterns**
- `// @vitest-environment happy-dom` at file top
- `vi.mock('next/navigation', ...)` + `setupNextNavigation.ts` helpers
- `vi.mock('@/lib/storage/useDiaries', ...)` with `vi.fn()` + per-test `mockReturnValue`
- Tests co-located in `__tests__/` folder
- `makeEntry(date, overrides)` fixture pattern

**12. File-size budget**
- StatsPage shell: ~25 lines (Suspense + StatsPageContent)
- StatsHeader (MonthNav): ~60 lines
- MoodBarChart: ~60 lines
- useMoodStats: ~30 lines
- addMonths util: ~8 lines

All fit within budget.

---

## Integration Points

| Dependency | Import Path | Notes |
|---|---|---|
| `useDiaries` | `@/lib/storage/useDiaries` | `{ entries, isReady }` |
| `MoodIcon` | `@/design-system/MoodIcon` | `size={64}` summary, `size={40}` chart |
| `IconButton` | `@/design-system/IconButton` | ✕ close button |
| `EmptyState` | `@/design-system/EmptyState` | Empty month state |
| `MOODS` / `MOOD_MAP` | `@/design-system/moods` | Source of mood colors |
| `Routes.stats` | `@/lib/navigation` | `'/stats'` constant |
| `useRouter`, `useSearchParams` | `next/navigation` | Inside Suspense |
| `DiaryEntry` type | `@/lib/storage` | `.date: string`, `.mood: MoodId` |
| `addMonths` | `@/lib/utils/addMonths` (NEW) | Shared with ListHeader |

---

## Architecture Constraints

1. `useSearchParams` mandates `"use client"` + `<Suspense>` wrapper (same as ListPage).
2. `MoodIcon` is RSC; usable in client components freely.
3. `IconButton` is `"use client"`.
4. Bar widths via inline `style={{ width: ${pct}% }}` — no chart library.
5. Bar color via inline `style={{ backgroundColor: mood.color }}`.
6. `useMoodStats` hook must be inside a client component (needs `isReady` guard).
7. No new npm packages.

---

## Risks

1. **`addMonths` duplication risk.** Extract to `src/lib/utils/addMonths.ts` during this REQ to prevent drift between ListHeader and StatsHeader.
2. **`useSearchParams` without Suspense causes build errors.** Wrap properly — confirm via `npm run build`.
3. **Hydration mismatch.** `new Date()` for default month computed inside the client component, not at module scope.
4. **Bar minimum width.** Guard against `maxCount === 0` (empty month is hidden separately, but defensive).

---

## Suggested File Structure

```
src/
  lib/
    utils/
      addMonths.ts                            ← NEW (extract from ListHeader, ~8 lines)
  app/
    stats/
      page.tsx                                ← REPLACE stub; Suspense shell (~25 lines)
      _components/
        StatsHeader.tsx                       ← NEW; year + M월 nav + ✕ close (~60 lines)
        MoodBarChart.tsx                      ← NEW; icon row + bar rows + empty (~60 lines)
        useMoodStats.ts                       ← NEW; aggregation hook (~30 lines)
      __tests__/
        StatsScreen.test.tsx                  ← NEW; unit tests
    list/
      _components/
        ListHeader.tsx                        ← MODIFY: import addMonths from new util
```

---

## File Budget

| File | Estimated Lines | Status |
|---|---|---|
| `src/app/stats/page.tsx` | ~25 | OK |
| `src/app/stats/_components/StatsHeader.tsx` | ~60 | OK |
| `src/app/stats/_components/MoodBarChart.tsx` | ~60 | OK |
| `src/app/stats/_components/useMoodStats.ts` | ~30 | OK |
| `src/lib/utils/addMonths.ts` | ~8 | OK |

---

## Verdict
PASS

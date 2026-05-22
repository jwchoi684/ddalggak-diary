# Technical Design — REQ-014: 통계 화면

## Summary

REQ-014 implements the Stats screen at `src/app/stats/page.tsx` (currently an 8-line stub). The screen shows a mood-distribution horizontal bar chart for a selected month, with a two-row month navigator and an ✕ close button. The implementation is pure client-side: no backend calls, no new libraries, no new npm packages. All design primitives (`MoodIcon`, `IconButton`, `EmptyState`) are confirmed present and reusable. The pattern mirrors `src/app/list/page.tsx` exactly: `"use client"` + `Suspense` + `useSearchParams` + `useDiaries`. The `addMonths` helper is extracted from `ListHeader.tsx` into a shared utility.

---

## Implementation Strategy

1. Extract `addMonths` from `ListHeader.tsx` to `src/lib/utils/addMonths.ts`. Update `ListHeader.tsx` to import from there.
2. Implement `useMoodStats` hook in `src/app/stats/_components/useMoodStats.ts`.
3. Implement `StatsHeader` component in `src/app/stats/_components/StatsHeader.tsx`.
4. Implement `MoodBarChart` component in `src/app/stats/_components/MoodBarChart.tsx`.
5. Replace the stats page stub with the orchestration shell.
6. Write unit tests.

---

## Component / File Map

```
src/
  lib/utils/
    addMonths.ts                              # NEW — shared utility
  app/
    stats/
      page.tsx                                # REPLACE stub; Suspense shell (~30 lines)
      _components/
        StatsHeader.tsx                       # NEW (~60 lines)
        MoodBarChart.tsx                      # NEW (~60 lines)
        useMoodStats.ts                       # NEW (~30 lines)
      __tests__/
        StatsScreen.test.tsx                  # NEW
    list/_components/
      ListHeader.tsx                          # MODIFY — import addMonths from util
```

---

## Exact Function Signatures

### `src/lib/utils/addMonths.ts`

```ts
export function addMonths(yearMonth: string, delta: number): string {
  const [y, m] = yearMonth.split('-').map(Number);
  const d = new Date(y, m - 1 + delta, 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}
```

### `src/app/stats/_components/useMoodStats.ts`

```ts
import { useMemo } from 'react';
import type { DiaryEntry, MoodId } from '@/lib/storage';
import { MOODS } from '@/design-system/moods';

export interface MoodCount { mood: MoodId; count: number; }
export interface MoodStats { counts: MoodCount[]; hasData: boolean; maxCount: number; }

export function useMoodStats(entries: DiaryEntry[], yearMonth: string): MoodStats {
  return useMemo(() => {
    const monthEntries = entries.filter(e => e.date.slice(0, 7) === yearMonth);
    const raw: Partial<Record<MoodId, number>> = {};
    for (const e of monthEntries) raw[e.mood] = (raw[e.mood] ?? 0) + 1;
    const counts: MoodCount[] = MOODS
      .filter(m => (raw[m.id] ?? 0) > 0)
      .map(m => ({ mood: m.id, count: raw[m.id]! }))
      .sort((a, b) =>
        b.count - a.count ||
        MOODS.findIndex(m => m.id === a.mood) - MOODS.findIndex(m => m.id === b.mood)
      );
    const maxCount = counts.length > 0 ? counts[0].count : 0;
    return { counts, hasData: counts.length > 0, maxCount };
  }, [entries, yearMonth]);
}
```

Tiebreak: count DESC primary, MOODS master-array index ASC secondary (stable sort guaranteed by V8 / Node 18+).

### `src/app/stats/_components/StatsHeader.tsx`

```ts
interface StatsHeaderProps {
  month: string;          // "YYYY-MM"
  onMonthChange: (month: string) => void;
  onClose: () => void;
}
export function StatsHeader(props: StatsHeaderProps): JSX.Element
```

Layout:
- Root: `relative flex flex-col items-center pt-4 pb-3 bg-cream`
- ✕ close: `<IconButton icon={<CloseIcon />} label="닫기" onClick={onClose} className="absolute top-4 right-4" />`
- Year row: `<p className="text-meta text-sm">{y}</p>` (e.g. "2026", bare 4-digit)
- Month row: `<div className="flex items-center gap-1">` containing prev/next `<IconButton label="이전 달"/>` `<IconButton label="다음 달"/>` plus `<span className="text-charcoal font-semibold text-lg min-w-[60px] text-center">{Number(m)}월</span>`
- `CloseIcon`: inline 24×24 SVG (two diagonal lines)

### `src/app/stats/_components/MoodBarChart.tsx`

```ts
interface MoodBarChartProps {
  stats: MoodStats;
}
export function MoodBarChart(props: MoodBarChartProps): JSX.Element
```

When `stats.hasData === true`:

**Mood summary row:**
```tsx
<div data-testid="mood-summary-row" className="flex flex-row justify-center gap-2 px-4 py-3">
  {stats.counts.map(({ mood }) => <MoodIcon key={mood} id={mood} size={64} />)}
</div>
```

**Bar chart rows:**
```tsx
{stats.counts.map(({ mood: moodId, count }) => {
  const mood = MOOD_MAP[moodId];
  const pct = Math.max(8, (count / stats.maxCount) * 100);
  return (
    <div key={moodId} data-testid={`mood-bar-${moodId}`} className="flex items-center gap-3 py-2 px-4">
      <MoodIcon id={moodId} size={40} />
      <div className="flex-1 h-7 bg-[#EBEBEB] rounded-full overflow-hidden">
        <div style={{ width: `${pct}%`, backgroundColor: mood.color }} className="h-full rounded-full" />
      </div>
      <span className="text-charcoal text-sm tabular-nums w-8 text-right">{count}</span>
    </div>
  );
})}
```

When `stats.hasData === false`:
```tsx
<EmptyState title="이 달에는 기록이 없어요" className="mt-16" />
```

Minimum bar width: `Math.max(8, ...)` — 8% floor (percentage, not pixels).

---

## page.tsx Integration Sketch

```tsx
"use client";

import React, { Suspense, useState } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { useDiaries } from '@/lib/storage/useDiaries';
import { StatsHeader } from './_components/StatsHeader';
import { MoodBarChart } from './_components/MoodBarChart';
import { useMoodStats } from './_components/useMoodStats';

const LOADING = <div className="text-center text-meta py-8">불러오는 중…</div>;

function StatsPageContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const today = new Date();
  const currentMonth = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}`;
  const [month, setMonth] = useState<string>(searchParams.get('month') ?? currentMonth);
  const { entries, isReady } = useDiaries();
  const stats = useMoodStats(isReady ? entries : [], month);

  return (
    <div className="min-h-screen bg-cream">
      <StatsHeader month={month} onMonthChange={setMonth} onClose={() => router.back()} />
      <main className="pb-8">
        {!isReady && LOADING}
        {isReady && <MoodBarChart stats={stats} />}
      </main>
    </div>
  );
}

export default function StatsPage() {
  return (
    <Suspense fallback={LOADING}>
      <StatsPageContent />
    </Suspense>
  );
}
```

Key behaviors:
- `useSearchParams()` read once; result used as initial `useState`. Month nav calls `setMonth` only (no `router.push`).
- `useMoodStats` receives empty array when `!isReady` so the hook is always called (rules of hooks).

---

## Visual Spec

| Element | Tailwind / style |
|---|---|
| Page root | `min-h-screen bg-cream` |
| StatsHeader root | `relative flex flex-col items-center pt-4 pb-3 bg-cream` |
| Close button | `absolute top-4 right-4` (IconButton) |
| Year text | `text-meta text-sm` |
| Month text | `text-charcoal font-semibold text-lg min-w-[60px] text-center` |
| Mood summary row | `flex flex-row justify-center gap-2 px-4 py-3` |
| Bar row | `flex items-center gap-3 py-2 px-4` |
| Bar track | `flex-1 h-7 bg-[#EBEBEB] rounded-full overflow-hidden` |
| Bar fill | `h-full rounded-full` + inline `width`, `backgroundColor` |
| Count text | `text-charcoal text-sm tabular-nums w-8 text-right` |

---

## Accessibility Spec

| Element | A11y |
|---|---|
| Close button | `aria-label="닫기"` |
| Prev/Next month | `aria-label="이전 달"` / `aria-label="다음 달"` |
| Mood summary row | `data-testid="mood-summary-row"` |
| Bar row | `data-testid="mood-bar-{moodId}"` |
| Empty state | text "이 달에는 기록이 없어요" |

---

## Edge Case Resolutions

1. **Default month source**: `useSearchParams().get('month') ?? current month`. Initial value of `useState`. Month nav updates only `useState` (no URL push).
2. **useMoodStats signature**: `(entries, yearMonth) => {counts, hasData, maxCount}`. Wrapped in useMemo.
3. **StatsHeader props**: `{month, onMonthChange, onClose}`.
4. **MoodBarChart props**: `{stats}`.
5. **page.tsx orchestration**: mirrors list/page.tsx pattern.
6. **addMonths.ts**: shared utility extracted to `src/lib/utils/`.
7. **Mood summary row**: only present moods, size=64.
8. **Bar chart row**: MoodIcon(40) + track + fill + count text right.
9. **Korean strings exact**: "닫기", "이전 달", "다음 달", "이 달에는 기록이 없어요", year "YYYY", month "M월".
10. **No URL push on nav**: simpler. Skip `router.push` in `setMonth`.
11. **Loading placeholder**: "불러오는 중…" identical to ListPage.
12. **isReady=false guard**: pass `[]` to useMoodStats so `hasData=false`, chart never renders before ready.

---

## Test Hooks

| Element | Locator |
|---|---|
| Close button | `getByRole('button', {name:'닫기'})` |
| Prev month | `getByRole('button', {name:'이전 달'})` |
| Next month | `getByRole('button', {name:'다음 달'})` |
| Mood summary row | `getByTestId('mood-summary-row')` |
| Bar row | `getByTestId('mood-bar-{moodId}')` |
| Empty state | `getByText('이 달에는 기록이 없어요')` |
| Loading | `getByText('불러오는 중…')` |

Test cases (10):
1. SS1: Empty month → EmptyState, no bars, nav works
2. SS2: joy×3, sad×2 → bars in desc order, widths 100% & ~67%
3. SS3: All 10 moods once → 10 bars/icons, equal widths
4. SS4: Prev month → year rollover Jan→Dec
5. SS5: Next month → forward direction
6. SS6: ✕ close → router.back called
7. SS7: ?month=2026-03 → initial March
8. SS8: Tied counts → master order tiebreak (joy before sad)
9. SS9: isReady=false → loading placeholder
10. SS10: Only 2 moods used → summary row has 2 icons (not 10)

Plus `useMoodStats` unit tests:
- Empty array → `{counts:[], hasData:false, maxCount:0}`
- Other-month entries excluded
- Sort + tiebreak correctness

---

## File Budget

| File | Target lines |
|---|---|
| `addMonths.ts` | ~8 |
| `useMoodStats.ts` | ~30 |
| `StatsHeader.tsx` | ~60 |
| `MoodBarChart.tsx` | ~60 |
| `page.tsx` | ~30 |
| `StatsScreen.test.tsx` | ~200 (test file OK over 100) |

---

## Implementation Order

1. `addMonths.ts` — extract
2. `ListHeader.tsx` — import update (1-line change, verify list tests)
3. `useMoodStats.ts` — pure hook
4. `StatsHeader.tsx` — depends on addMonths + IconButton
5. `MoodBarChart.tsx` — depends on useMoodStats + MoodIcon + EmptyState
6. `page.tsx` — orchestration
7. `StatsScreen.test.tsx` — last

---

## Backward Compatibility

- `addMonths` extraction is a pure refactor (function was module-private). Existing ListHeader behavior unchanged.
- `Routes.stats` unchanged.
- No API contracts affected.
- No localStorage schema changes.

---

## Performance Considerations

- `useMoodStats` wrapped in `useMemo([entries, yearMonth])`. O(n) over entries; negligible.
- `MOODS.findIndex` in sort comparator — O(10) per comparison on at most 10 elements. Acceptable.
- Bar widths computed at render time via inline style. No layout thrash.
- `MoodIcon` is RSC; no hydration cost.

---

## Risks and Tradeoffs

| Risk | Mitigation |
|---|---|
| `useSearchParams` without Suspense → build error | Suspense wrapper identical to ListPage |
| Hydration mismatch from `new Date()` | Called inside `"use client"` component, runs only in browser |
| Bar 8% minimum visually narrow on small screens | Acceptable; can raise to 10% if needed |
| `Array.prototype.sort` tiebreak stability | V8 stable sort since Node 11 |

**Tradeoff accepted**: Month selection is local `useState` only (no URL push on nav). Matches architecture report recommendation.

---

## Open Questions

None.

---

## Verdict
PASS

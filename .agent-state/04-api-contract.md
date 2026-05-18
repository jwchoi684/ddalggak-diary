# API Contract — REQ-007

## Scope

Internal TypeScript module contracts for the main calendar screen. No HTTP endpoints, RPC, queues, or external integrations. Covers:
- Route `/` — behavior change from placeholder to live screen
- `src/lib/storage/useDiaries.ts` — new React hook
- `src/app/_components/CalendarScreen.tsx` — new composite screen (no props)
- `src/app/_components/CalendarHeader.tsx` — new sub-component
- `src/app/_components/CalendarGrid.tsx` — new sub-component
- `src/app/_components/CalendarDayCell.tsx` — new leaf component

---

## Route Contract for `/`

| Property | Value |
|---|---|
| Path | `/` |
| Method | GET (page navigation) |
| Auth | None (localStorage only) |
| SSR behavior | Server returns empty calendar shell (no MoodIcons). MoodIcons appear after first client effect. |
| Previously | 7-line placeholder stub |
| Now | Full calendar screen with 7-column grid, header, FAB |

`src/app/page.tsx` becomes thin `"use client"` boundary that renders `<CalendarScreen />`.

---

## Public Exports per File

| File | Export | Kind |
|---|---|---|
| `src/lib/storage/useDiaries.ts` | `useDiaries` | named function (hook) |
| `src/app/_components/CalendarScreen.tsx` | `CalendarScreen` | named function component |
| `src/app/_components/CalendarHeader.tsx` | `CalendarHeader` | named function component |
| `src/app/_components/CalendarGrid.tsx` | `CalendarGrid` | named function component |
| `src/app/_components/CalendarDayCell.tsx` | `CalendarDayCell` | named const (`React.memo`-wrapped) |

No barrel file is created or modified.

---

## Per-Module Detail

### `useDiaries` hook

```ts
// React hook — client-only. Direct import only;
// NOT re-exported from @/lib/storage/index.ts (that barrel is SSR-safe).
"use client";

import { useEffect, useState } from 'react';
import { readDiaries, type DiaryEntry } from '@/lib/storage';

/**
 * Reads all diary entries from localStorage once on mount.
 *
 * Returns `isReady: false` on initial SSR/hydration render so callers can
 * suppress hydration-mismatch content. Transitions to `isReady: true`
 * synchronously after first effect.
 *
 * Never throws. If localStorage unavailable, `readDiaries()` returns [] and
 * `isReady` still becomes true.
 *
 * Always import via: import { useDiaries } from '@/lib/storage/useDiaries'
 */
export function useDiaries(): { entries: DiaryEntry[]; isReady: boolean }
```

**Caller invariants:**
- `entries` is stable array reference after `isReady=true`. Doesn't change between renders unless a write triggers re-read (REQ-009+).
- `isReady` transitions exactly once: `false → true`. Never reverts.
- Empty dependency `[]` — fires once per mount.
- Callers must gate MoodIcon rendering on `isReady`.

---

### `CalendarScreen` component

```ts
"use client";

/**
 * Root screen component for `/`.
 * Owns: visible-month state, today, diary loading, swipe, navigation callbacks.
 * Renders: CalendarHeader + (when isReady) CalendarGrid + FAB.
 * Consumed only by src/app/page.tsx.
 */
export function CalendarScreen(): JSX.Element
```

**Behavior contract:**
- Visible month initialized to user's local current month.
- `today` derived per render via `new Date().toLocaleDateString('sv')` → YYYY-MM-DD.
- Calls `useDiaries()`; builds `Map<string, DiaryEntry>` via `useMemo([entries])`.
- Suppresses `CalendarGrid` while `!isReady` (hydration safety).
- `onCellTap(date)` → `router.push(Routes.diary(date))`. No distinction empty/filled — editor handles auto-open (REQ-008/009).
- `onFAB()` → `router.push(Routes.diary(today))`.
- Month nav: `prevMonth` / `nextMonth` use `new Date(year, month ± 1, 1)`.
- Swipe: pointer events on container; horizontal delta > 40px → month ±1. Vertical scroll unaffected.
- Stabilizes `onCellTap` + `onFAB` with `useCallback` for `React.memo` effectiveness.
- No props; no ref forward.

---

### `CalendarHeader` component

```ts
"use client";

export interface CalendarHeaderProps {
  /** Full year of visible month (e.g. 2026). Received but not rendered in MVP. */
  year: number;
  /** 0-based month (0=January…11=December). Rendered as `{month+1}월`. */
  month: number;
  /** ‹ button handler. */
  onPrev: () => void;
  /** › button handler. */
  onNext: () => void;
  /** 검색 IconButton handler. */
  onSearch: () => void;
  /** 통계 IconButton handler. */
  onStats: () => void;
  /** 리스트 IconButton handler. */
  onList: () => void;
}

/**
 * Header bar for calendar screen.
 * Left: ‹ + "{month+1}월" (text-3xl font-bold) + ›
 * Right: 3 IconButtons (검색, 통계, 리스트).
 * Arrows are plain <button> (not IconButton — distinguishes from circular icons).
 * Icon SVGs inline at top of file. All targets ≥ 44px.
 */
export function CalendarHeader(props: CalendarHeaderProps): JSX.Element
```

**Invariants:** `month` 0–11 (caller validates); component is pure (no useRouter); all callbacks no-arg, return ignored.

---

### `CalendarGrid` component

```ts
import type { DiaryEntry } from '@/lib/storage';

export interface CalendarGridProps {
  /** Full year (e.g. 2026). Used for date math, not displayed. */
  year: number;
  /** 0-based month (0=January…11=December). */
  month: number;
  /**
   * Lookup map of diary entries keyed by "YYYY-MM-DD".
   * Built by caller via useMemo for O(1) per-cell lookup.
   * May be empty.
   */
  diaryByDate: Map<string, DiaryEntry>;
  /** Today's date "YYYY-MM-DD" (local TZ). */
  today: string;
  /** Called when any in-month cell tapped. */
  onCellTap: (date: string) => void;
}

/**
 * Pure 7-column monthly grid.
 * Renders 일·월·화·수·목·금·토 weekday header (Sunday-first) + 7×N day grid.
 * Out-of-month leading/trailing slots are non-interactive empty <div>.
 *
 * Date math (no external library):
 *   firstDay = new Date(year, month, 1)
 *   startOffset = firstDay.getDay()  // 0=Sun…6=Sat
 *   lastDate = new Date(year, month + 1, 0).getDate()
 * Cells: [null × startOffset] + [1..lastDate] + trailing nulls to multiple of 7.
 *
 * dateKey: `${year}-${String(month+1).padStart(2,'0')}-${String(day).padStart(2,'0')}`
 *
 * No "use client" needed — rendered inside client subtree.
 */
export function CalendarGrid(props: CalendarGridProps): JSX.Element
```

**Invariants:** `diaryByDate` keys YYYY-MM-DD; out-of-month entries ignored silently; `onCellTap` never called for null slots; component is stateless.

---

### `CalendarDayCell` component

```ts
import type { DiaryEntry } from '@/lib/storage';

export interface CalendarDayCellProps {
  /** YYYY-MM-DD. Passed verbatim to onTap. Used as aria-label base. */
  date: string;
  /**
   * Entry for this date if exists.
   * Present: render MoodIcon(id=entry.mood, size=32).
   * Absent: render grey numeral extracted from date.
   */
  entry?: DiaryEntry;
  /**
   * Today emphasis:
   * - entry present: 4px peach dot below MoodIcon
   * - entry absent: font-bold text-peach numeral instead of text-cell-empty
   */
  isToday: boolean;
  /** Called when tapped. Fires regardless of entry presence. */
  onTap: (date: string) => void;
}

/**
 * Single day cell. React.memo-wrapped — re-renders only when props change.
 * Requires callers to stabilize onTap with useCallback for memo effectiveness.
 * Hot path: up to 31 cells per month change.
 *
 * Touch target: <button> with min-h-[44px].
 * aria-label: "{date}" or "{date} 일기 있음" based on entry.
 */
export const CalendarDayCell: React.MemoExoticComponent<
  (props: CalendarDayCellProps) => JSX.Element
>
```

**Invariants:** `date` must be valid YYYY-MM-DD; `onTap` called with verbatim `date` prop; `React.memo` comparison shallow — callers must not construct new `entry` object per render; `isToday` derived in parent.

---

## Caller Invariants (Cross-Cutting)

1. **No direct localStorage access.** Only via `useDiaries() → readDiaries()`.
2. **All navigation via `Routes.*`.** Raw path strings forbidden.
3. **Token discipline.** Grey empty cell = `text-cell-empty` (→ `--color-cell-empty: #C8C8C8`). Today = `text-peach`/`bg-peach`. No hardcoded hex.
4. **No competing width constraint.** No `max-w-*` or `w-full` override of layout 420px.
5. **Korean labels.** Weekdays, month, aria-label, FAB label all Korean.
6. **Callback stabilization.** `CalendarScreen` must `useCallback` `onCellTap`/`onFAB` so `React.memo` works.

---

## Error Contract Summary

| Scenario | Behavior |
|---|---|
| `readDiaries()` returns `[]` | `useDiaries` returns `{ entries: [], isReady: true }`. Grid empty. No error. |
| `useDiaries` effect exception | Propagates to React error boundary. No special handling. |
| Cell tapped no entry | `onTap(date)` fires. Routing proceeds. Editor/picker is REQ-009 concern. |
| `Routes.diary(date)` valid YYYY-MM-DD | Always returns valid path. |
| `router.push` failure | Next.js internal. |
| `month` outside 0–11 | Undefined; JS Date wraps. Caller must validate. |

---

## Import Path Discipline

| What | Correct path | Forbidden |
|---|---|---|
| `useDiaries` hook | `'@/lib/storage/useDiaries'` | barrel (`'@/lib/storage'`) |
| Types (`DiaryEntry`, `MoodId`) | `'@/lib/storage'` | sub-modules |
| `Routes` | `'@/lib/navigation'` | hardcoded strings |
| `IconButton`, `FAB` | `'@/design-system/IconButton'` etc. (per-file, no barrel) | inline reimplementation |
| `MoodIcon` | `'@/design-system/MoodIcon'` | inline emoji |
| Sub-components | direct `'./CalendarHeader'` etc. | re-exported |

---

## Out of Scope

| Item | Owner |
|---|---|
| Mood picker auto-open on empty cell | REQ-008 / REQ-009 |
| Editor form, save, field rendering | REQ-009 |
| Bottom photo strip | v2 |
| Month/year picker modal | P1 |
| Left-side header icons (settings, archive) | v2 |
| Search/list/stats/chat screen content | REQ-013~018 |
| Skeleton during `!isReady` | Not MVP |
| Re-read entries after write (reactive store) | REQ-009+ |
| Landscape mode | MVP-out |

---

## Verdict
PASS

# API / Interface Contract — REQ-014

## Summary

REQ-014 adds a Stats screen to `src/app/stats/page.tsx`. All interfaces are internal (pure client-side). There are no HTTP endpoints, RPC calls, WebSocket events, or queue messages. This contract defines the four internal component/hook interfaces, one shared utility function signature, storage read conventions, routing conventions, and Korean string literals that all implementation agents must treat as locked.

## Contract Type

Internal TypeScript interfaces — shared utility function, React hook, React components, storage reads, routing read.

---

## Interfaces

### 1. `addMonths` — shared utility

**File:** `src/lib/utils/addMonths.ts`

```ts
export function addMonths(yearMonth: string, delta: number): string
```

- `yearMonth`: `"YYYY-MM"` format string (e.g. `"2026-01"`).
- `delta`: signed integer month offset.
- Returns `"YYYY-MM"` string. Year rollover handled automatically via `Date` arithmetic.
- Pure function — no side effects, no React dependency.
- Extracted from `ListHeader.tsx`. `ListHeader.tsx` must import from this path after extraction.

---

### 2. `useMoodStats` hook

**File:** `src/app/stats/_components/useMoodStats.ts`

```ts
export interface MoodCount {
  mood: MoodId;
  count: number;
}

export interface MoodStats {
  counts: MoodCount[];   // sorted count DESC, tiebreak MOODS master-array index ASC
  hasData: boolean;      // true iff counts.length > 0
  maxCount: number;      // counts[0].count, or 0 when empty
}

export function useMoodStats(entries: DiaryEntry[], yearMonth: string): MoodStats
```

- `entries`: full `DiaryEntry[]` array from `useDiaries()`. May be `[]` while storage loads — callers must pass `[]`, not skip the call (rules of hooks).
- `yearMonth`: `"YYYY-MM"` string.
- Wrapped in `useMemo([entries, yearMonth])`.
- Only moods with `count >= 1` in the selected month appear in `counts`. Zero-count moods are absent.
- Sort: count DESC primary; `MOODS` master-array index ASC secondary (stable tiebreak).

---

### 3. `<StatsHeader>` component

**File:** `src/app/stats/_components/StatsHeader.tsx`

```ts
interface StatsHeaderProps {
  month: string;                        // "YYYY-MM"
  onMonthChange: (month: string) => void;
  onClose: () => void;
}
export function StatsHeader(props: StatsHeaderProps): JSX.Element
```

- Two-row display: year `"YYYY"` (bare 4-digit) above; `"M월"` (no zero-padding) below flanked by chevrons.
- `onMonthChange`: called with new `"YYYY-MM"` via `addMonths(month, -1)` / `addMonths(month, +1)`.
- `onClose`: called when ✕ pressed.
- Close button: `<IconButton aria-label="닫기" className="absolute top-4 right-4" />`.
- Prev/Next buttons: `<IconButton aria-label="이전 달" />` / `aria-label="다음 달"`.
- No internal state — purely controlled.

---

### 4. `<MoodBarChart>` component

**File:** `src/app/stats/_components/MoodBarChart.tsx`

```ts
interface MoodBarChartProps {
  stats: MoodStats;
}
export function MoodBarChart(props: MoodBarChartProps): JSX.Element
```

When `stats.hasData === true`:
- Mood summary row `data-testid="mood-summary-row"` of `<MoodIcon size={64} />` for each entry.
- Bar row per entry `data-testid="mood-bar-{moodId}"`: `<MoodIcon size={40} />` + gray track + color fill + right-aligned count.
- Bar fill width: `Math.max(8, (count / stats.maxCount) * 100)` percent.
- Bar fill color: `mood.color` from `MOODS`.
- Bar height 28px (`h-7`); radius = height/2 (`rounded-full`).
- Gray track: `bg-[#EBEBEB] rounded-full overflow-hidden`.
- Count: `text-charcoal text-sm tabular-nums w-8 text-right`.

When `stats.hasData === false`:
- `<EmptyState title="이 달에는 기록이 없어요" />`. Mood summary row and bar rows absent.

---

### 5. `StatsPage` orchestration

**File:** `src/app/stats/page.tsx`

- `"use client"`.
- Default export `StatsPage` wraps `StatsPageContent` in `<Suspense fallback={LOADING}>`.
- `StatsPageContent` reads `useSearchParams().get('month')` once as `useState` initial value. Month nav calls `setMonth` only (no `router.push`).
- `useDiaries()` provides `{entries, isReady}`. When `!isReady`, pass `[]` to `useMoodStats` and render loading.
- Close: `onClose={() => router.back()}`.

---

## Storage Reads

- **Hook:** `useDiaries()` from `@/lib/storage/useDiaries`.
- Read-only. No writes, no deletes, no new keys.
- No new localStorage keys introduced.

---

## Routing

- **Route:** `Routes.stats` — existing, unchanged.
- **Query param read:** `?month=YYYY-MM` via `useSearchParams()`. Optional; defaults to current calendar month.
- **No URL writes:** month nav updates `useState` only.

---

## Korean String Literals (locked)

| Usage | Exact string |
|---|---|
| Close button aria-label | `"닫기"` |
| Prev month aria-label | `"이전 달"` |
| Next month aria-label | `"다음 달"` |
| Empty state message | `"이 달에는 기록이 없어요"` |
| Loading placeholder | `"불러오는 중…"` |
| Year display format | `"YYYY"` — bare 4-digit, no suffix |
| Month display format | `"M월"` — no zero-padding |

---

## Caller Invariants

1. `addMonths` callers must pass `"YYYY-MM"` format strings.
2. `useMoodStats` must always be called (never conditionally). Pass `[]` during loading.
3. `StatsHeader` must use existing `IconButton`. No new button variant.
4. `MoodBarChart` must use existing `MoodIcon`, `EmptyState`. No duplicates.
5. Bar widths via inline style percentage (no chart library).
6. Bar colors via `mood.color` from `MOODS`.
7. `<Suspense>` wraps `useSearchParams` consumer.
8. Sort state never written to localStorage.

---

## Backward Compatibility

- `addMonths` extraction is a pure refactor — function was module-private in ListHeader. `ListHeader` behavior unchanged.
- `Routes.stats` unchanged.
- No localStorage schema changes.
- No existing component props modified.

---

## Verdict
PASS

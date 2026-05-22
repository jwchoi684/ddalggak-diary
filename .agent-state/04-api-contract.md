# API / Interface Contract — REQ-013

## Summary

REQ-013 replaces the 8-line stub at `src/app/list/page.tsx` with a functional diary list screen. Four new internal TypeScript interfaces are introduced (`ListHeader`, `DiaryListCard`, `PhotoThumbnailStrip`, and the `formatListDate` utility). All interfaces are frontend-only and client-side. No HTTP endpoints, no new storage keys, and no existing signatures change.

---

## Contract Type

Internal TypeScript component and utility interfaces (frontend-only, client-side).

---

## Interfaces

### 1. `formatListDate(isoDate: string): string`

**File:** `src/lib/utils/formatListDate.ts`

```ts
export function formatListDate(isoDate: string): string
```

**Input:** ISO 8601 date string in "YYYY-MM-DD" format (e.g., `"2026-05-22"`).
**Output:** Korean-formatted date string in "YYYY.MM.DD 요일" format (e.g., `"2026.05.22 토요일"`).

**Caller responsibilities:** Pass well-formed "YYYY-MM-DD". Never pass full ISO timestamps.

**Callee guarantees:**
- Parses via `new Date(isoDate + 'T00:00:00')` to avoid UTC offset shifting.
- Builds "YYYY.MM.DD" from string slices.
- Appends weekday via `Intl.DateTimeFormat('ko-KR', { weekday: 'long' })`.
- Never throws.

---

### 2. `<ListHeader>` component

**File:** `src/app/list/_components/ListHeader.tsx`

```ts
export interface ListHeaderProps {
  month: string;                          // "YYYY-MM"
  sort: 'asc' | 'desc';
  onBack: () => void;
  onMonthChange: (month: string) => void;
  onSortToggle: () => void;
}
export function ListHeader(props: ListHeaderProps): JSX.Element
```

**Caller responsibilities:**
- `month` must be valid "YYYY-MM"; component formats label as `"YYYY년 M월"`.
- Wire `onMonthChange` to `router.push(Routes.listWithFilter({month}))`.
- Wire `onBack` to `router.back()`.
- Wire `onSortToggle` to `useState<'asc'|'desc'>` toggle.

**Callee guarantees:**
- Sticky `top-0 z-10 bg-cream`.
- Left: `<IconButton aria-label="뒤로 가기" onClick={onBack} />`.
- Center: `<IconButton aria-label="이전 달" />` + `<span>{label}</span>` + `<IconButton aria-label="다음 달" />`. Prev passes `addMonths(month, -1)`; next passes `addMonths(month, +1)`.
- Right: `<button aria-label="정렬 변경">` showing `"최신순 ↓"` (desc) or `"오래된순 ↑"` (asc).
- 44×44 min touch targets.

---

### 3. `<DiaryListCard>` component

**File:** `src/app/list/_components/DiaryListCard.tsx`

```ts
import type { DiaryEntry } from '@/lib/storage';

export interface DiaryListCardProps {
  entry: DiaryEntry;
  onTap: () => void;
}
export function DiaryListCard(props: DiaryListCardProps): JSX.Element
```

**Caller responsibilities:**
- Pass complete `DiaryEntry` from `useDiaries().entries`.
- Wire `onTap` to `router.push(Routes.diary(entry.date))`.
- Stable `key={entry.date}` in list.

**Callee guarantees:**
- Wraps `<Card>` inside `<button className="w-full text-left">` with `aria-label="YYYY년 M월 D일 일기 보기"` (via `Intl.DateTimeFormat('ko-KR')` on `entry.date + 'T00:00:00'`).
- `<MoodIcon id={entry.mood} size={64} className="mx-auto" />` at top.
- `<p className="text-meta text-sm text-center mt-2">{formatListDate(entry.date)}</p>` below.
- Body text rules (evaluated in order):
  1. `entry.text` non-empty → `<p className="text-charcoal line-clamp-3 mt-2">{entry.text}</p>`
  2. Text empty AND `photos.length === 0` → `<p className="text-meta italic mt-2">(내용 없음)</p>`
  3. Text empty AND `photos.length > 0` → no body text element
- `{photos.length > 0 && <PhotoThumbnailStrip photos={entry.photos} />}` at bottom.

---

### 4. `<PhotoThumbnailStrip>` component

**File:** `src/app/list/_components/PhotoThumbnailStrip.tsx`

```ts
import type { Photo } from '@/lib/storage';

export interface PhotoThumbnailStripProps {
  photos: Photo[];
}
export function PhotoThumbnailStrip(props: PhotoThumbnailStripProps): JSX.Element
```

**Caller responsibilities:**
- Pass full `entry.photos`; strip truncates internally.
- Do not call when `photos.length === 0` (DiaryListCard gates).

**Callee guarantees:**
- `<div className="flex flex-row gap-2 mt-3">`.
- Up to 3 `<img src={photo.dataUrl} alt="첨부 사진" className="w-16 h-16 object-cover rounded-xl" loading="lazy" />`.
- When `photos.length > 3`: 4th overflow badge `<div className="w-16 h-16 bg-[#EBEBEB] rounded-xl flex items-center justify-center text-charcoal text-sm font-medium" data-testid="photo-overflow-badge">+{photos.length - 3}</div>`.
- No scrolling; max 4 visible cells.

---

## Storage Reads

`useDiaries()` from `@/lib/storage/useDiaries`:

```ts
function useDiaries(): { entries: DiaryEntry[]; isReady: boolean }
```

- Read-only. Zero writes. No new keys.
- `isReady` is `false` on initial render, `true` after first effect.
- `page.tsx` gates card rendering on `isReady`; shows `"불러오는 중…"` placeholder until ready.
- Filter: `entries.filter(e => e.date.slice(0, 7) === activeMonth)`.
- Sort: `localeCompare` on `entry.date` (ISO strings sort correctly).

---

## Routing & Query Params

| Route | Builder | Notes |
|---|---|---|
| `/diary/[date]` | `Routes.diary(date)` | Card tap target |
| `/list` | `Routes.list` | Bare; defaults month to today |
| `/list?month=YYYY-MM` | `Routes.listWithFilter({month})` | Month nav pushes this |

- `useSearchParams().get('month')` provides the active month; defaults to current month when absent.
- Sort is local `useState<'asc'|'desc'>('desc')`, session-only, never persisted.
- `<Suspense>` boundary required around `useSearchParams` consumer per Next.js 15 App Router.

---

## Korean Strings

| Use | String |
|---|---|
| Back button aria | `뒤로 가기` |
| Prev/Next month aria | `이전 달` / `다음 달` |
| Sort toggle aria | `정렬 변경` |
| Sort label (desc) | `최신순 ↓` |
| Sort label (asc) | `오래된순 ↑` |
| Header center label | `YYYY년 M월` |
| Card aria-label | `YYYY년 M월 D일 일기 보기` |
| Empty body fallback | `(내용 없음)` |
| Card date | `YYYY.MM.DD 요일` |
| Img alt | `첨부 사진` |
| Empty month title | `이 달에는 작성된 일기가 없어요` |
| Empty month CTA | `캘린더로 가기` |
| Loading placeholder | `불러오는 중…` |

---

## Caller Invariants

1. `useDiaries` must be called inside a `"use client"` component.
2. `<Suspense>` wraps the page content using `useSearchParams`.
3. `DiaryListCard.onTap` must use `router.push(Routes.diary(entry.date))`.
4. `PhotoThumbnailStrip` only rendered when `entry.photos.length > 0`.
5. `formatListDate` only receives "YYYY-MM-DD" strings.
6. Sort state never written to localStorage.
7. `MoodIcon` is the sole mood-rendering boundary.
8. `Card` from design-system is the sole card surface.

---

## Backward Compatibility

- Stub at `src/app/list/page.tsx` has no callers — safe to replace.
- `CalendarScreen` pushes bare `Routes.list` → defaults to current month. No change required.
- `Routes.listWithFilter` `sort` param supported but not consumed by REQ-013.
- `useDiaries` signature unchanged.
- `Routes.diary(date)` signature unchanged.
- No new design-system primitives.
- No localStorage schema change.

---

## Verdict
PASS

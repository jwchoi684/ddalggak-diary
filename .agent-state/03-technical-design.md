# Technical Design — REQ-013: 일기 리스트 화면

## Summary

REQ-013 replaces the 8-line stub at `src/app/list/page.tsx` with a fully functional diary list screen. The screen shows one calendar month of diary entries as vertically scrollable cards, with a sticky header containing back navigation, month navigator, and sort toggle. All state is minimal: month is URL-canonical via `?month=YYYY-MM`, sort is local `useState` (session-only). No new dependencies, no new design-system primitives — only composition of existing pieces.

---

## Implementation Strategy

Pure composition over existing primitives. The only new production code lives in:
- `src/app/list/page.tsx` (replaced)
- `src/app/list/_components/ListHeader.tsx` (new)
- `src/app/list/_components/DiaryListCard.tsx` (new)
- `src/app/list/_components/PhotoThumbnailStrip.tsx` (new)
- `src/lib/utils/formatListDate.ts` (new, small utility)
- `src/app/list/__tests__/ListScreen.test.tsx` (new)

---

## Component / File Map

```
src/app/list/
  page.tsx                  # "use client" + Suspense wrapper + state orchestrator
  _components/
    ListHeader.tsx           # sticky header: back + month nav + sort toggle
    DiaryListCard.tsx        # single card: MoodIcon + date + text + photos
    PhotoThumbnailStrip.tsx  # max 3 img + +N badge
  __tests__/
    ListScreen.test.tsx
src/lib/utils/
  formatListDate.ts          # "YYYY.MM.DD 요일" helper
```

---

## Data Flow

```
page.tsx
  useSearchParams() → activeMonth ("YYYY-MM", default: today's month)
  useState<'asc'|'desc'>('desc') → sort
  useDiaries() → { entries, isReady }

  filtered = entries.filter(e => e.date.slice(0,7) === activeMonth)
  sorted   = [...filtered].sort((a,b) =>
               sort === 'desc'
                 ? b.date.localeCompare(a.date)
                 : a.date.localeCompare(b.date))

  → <ListHeader month={activeMonth} sort={sort}
                onMonthChange={m => router.push(Routes.listWithFilter({month:m}))}
                onSortToggle={() => setSort(s => s==='desc' ? 'asc' : 'desc')}
                onBack={() => router.back()} />
  → sorted.map(e => <DiaryListCard key={e.date} entry={e}
                                   onTap={() => router.push(Routes.diary(e.date))} />)
  → empty → <EmptyState … />
```

---

## Exact Function Signatures

```ts
// page.tsx (inner component, wrapped in Suspense)
function ListPageContent(): JSX.Element

// ListHeader.tsx
interface ListHeaderProps {
  month: string;          // "YYYY-MM"
  sort: 'asc' | 'desc';
  onBack: () => void;
  onMonthChange: (month: string) => void;
  onSortToggle: () => void;
}
export function ListHeader(props: ListHeaderProps): JSX.Element

// DiaryListCard.tsx
interface DiaryListCardProps {
  entry: DiaryEntry;
  onTap: () => void;
}
export function DiaryListCard(props: DiaryListCardProps): JSX.Element

// PhotoThumbnailStrip.tsx
interface PhotoThumbnailStripProps {
  photos: Photo[];      // caller passes all photos; strip shows first 3 + badge
}
export function PhotoThumbnailStrip(props: PhotoThumbnailStripProps): JSX.Element

// src/lib/utils/formatListDate.ts
export function formatListDate(isoDate: string): string
// "2026-05-22" → "2026.05.22 토요일"
// Implementation: parse via new Date(isoDate + 'T00:00:00') to avoid UTC offset shifting;
// build "YYYY.MM.DD" from string slices; append weekday via Intl.DateTimeFormat('ko-KR', {weekday: 'long'})
```

### Month Navigation Helper

```ts
function addMonths(yearMonth: string, delta: number): string {
  const [y, m] = yearMonth.split('-').map(Number);
  const d = new Date(y, m - 1 + delta, 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}
```

Handles year rollover automatically via `Date` constructor overflow.

---

## page.tsx Integration Sketch

```tsx
"use client";
import { Suspense, useState } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { useDiaries } from '@/lib/storage/useDiaries';
import { Routes } from '@/lib/navigation';
import { ListHeader } from './_components/ListHeader';
import { DiaryListCard } from './_components/DiaryListCard';
import { EmptyState } from '@/design-system/EmptyState';

function ListPageContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const today = new Date();
  const currentMonth = `${today.getFullYear()}-${String(today.getMonth()+1).padStart(2,'0')}`;
  const activeMonth = searchParams.get('month') ?? currentMonth;
  const [sort, setSort] = useState<'asc'|'desc'>('desc');
  const { entries, isReady } = useDiaries();

  const filtered = isReady
    ? entries.filter(e => e.date.slice(0, 7) === activeMonth)
    : [];
  const sorted = [...filtered].sort((a, b) =>
    sort === 'desc' ? b.date.localeCompare(a.date) : a.date.localeCompare(b.date)
  );

  return (
    <div className="min-h-screen bg-cream">
      <ListHeader
        month={activeMonth} sort={sort}
        onBack={() => router.back()}
        onMonthChange={m => router.push(Routes.listWithFilter({ month: m }))}
        onSortToggle={() => setSort(s => s === 'desc' ? 'asc' : 'desc')}
      />
      <main className="px-4 pt-4 pb-8">
        {!isReady && <div className="text-center text-meta py-8">불러오는 중…</div>}
        {isReady && sorted.length === 0 && (
          <EmptyState
            className="mt-16"
            title="이 달에는 작성된 일기가 없어요"
            action={<button onClick={() => router.push('/')} className="…">캘린더로 가기</button>}
          />
        )}
        {isReady && (
          <div className="space-y-3" key={activeMonth}>
            {sorted.map(e => (
              <DiaryListCard
                key={e.date} entry={e}
                onTap={() => router.push(Routes.diary(e.date))}
              />
            ))}
          </div>
        )}
      </main>
    </div>
  );
}

export default function ListPage() {
  return (
    <Suspense fallback={<div className="text-center text-meta py-8">불러오는 중…</div>}>
      <ListPageContent />
    </Suspense>
  );
}
```

---

## Visual Spec

**ListHeader** — sticky, `top-0 z-10 bg-cream`:
- Left: `<IconButton icon={<ChevronLeft />} label="뒤로 가기" onClick={onBack} />`
- Center: `<IconButton label="이전 달" />` + `<span>` "YYYY년 M월" + `<IconButton label="다음 달" />`
- Right: `<button aria-label="정렬 변경">` text "최신순" or "오래된순" + `↓` / `↑` arrow

**DiaryListCard** — wraps `<Card className="p-4">` in `<button className="w-full text-left">`:
- `<MoodIcon id={entry.mood} size={64} className="mx-auto" />`
- `<p className="text-meta text-sm text-center mt-2">{formatListDate(entry.date)}</p>`
- Body text section (conditional):
  - If `text` non-empty: `<p className="text-charcoal line-clamp-3 mt-2">{entry.text}</p>`
  - If `text` empty AND `photos.length === 0`: `<p className="text-meta italic mt-2">(내용 없음)</p>`
  - If `text` empty AND `photos.length > 0`: omit body text section entirely
- `{photos.length > 0 && <PhotoThumbnailStrip photos={entry.photos} />}`

**PhotoThumbnailStrip** — `<div className="flex flex-row gap-2 mt-3">`:
- Up to 3 `<img src={photo.dataUrl} alt="첨부 사진" className="w-16 h-16 object-cover rounded-xl" loading="lazy" />`
- If `photos.length > 3`: `<div className="w-16 h-16 bg-[#EBEBEB] rounded-xl flex items-center justify-center text-charcoal text-sm font-medium" data-testid="photo-overflow-badge">+{photos.length - 3}</div>`

**Card tap button**: `aria-label` formatted as "YYYY년 M월 D일 일기 보기" — built from `entry.date` using `Intl.DateTimeFormat('ko-KR', {year:'numeric', month:'long', day:'numeric'})`.

---

## Month Label Display

The center header shows "YYYY년 M월" (e.g. "2026년 5월"):
```ts
const [y, m] = activeMonth.split('-');
const label = `${y}년 ${Number(m)}월`;
```

---

## Accessibility Spec

| Element | A11y |
|---|---|
| Back button | `aria-label="뒤로 가기"` |
| Prev month | `aria-label="이전 달"` |
| Next month | `aria-label="다음 달"` |
| Sort toggle | `aria-label="정렬 변경"` |
| Card button | `aria-label="YYYY년 M월 D일 일기 보기"` |
| Photo img | `alt="첨부 사진"` |
| Empty CTA | `<button>캘린더로 가기</button>` |
| Overflow badge | `data-testid="photo-overflow-badge"` |

---

## Edge Case Resolutions

1. **Page orchestration**: `page.tsx` owns state (useSearchParams, sort useState, useRouter). No separate `ListScreen.tsx` file.
2. **Sort toggle UX**: text + arrow icon, single button, `aria-label="정렬 변경"`.
3. **Date format**: `formatListDate(date)` returns "2026.05.22 토요일" via Intl.DateTimeFormat weekday.
4. **+N overflow cell**: `bg-[#EBEBEB]` with `text-charcoal text-sm font-medium`. Same 64×64 size as thumbnails.
5. **Photo thumbnail alt**: "첨부 사진" (matches REQ-011).
6. **Photo strip layout**: `flex flex-row gap-2`, no scroll (truncate at 3 + badge).
7. **Header positioning**: sticky `top-0 z-10 bg-cream`.
8. **Empty body + photos present**: omit body text section. Only "(내용 없음)" when both empty.
9. **Card spacing**: `space-y-3` on the container div.
10. **Test selectors**: aria-labels above + `data-testid="photo-overflow-badge"`.
11. **Suspense fallback**: `<div className="text-center text-meta py-8">불러오는 중…</div>`.
12. **Hydration safety**: gate render on `isReady`; show "불러오는 중…" until storage read completes.

---

## Test Hooks

| Element | Locator |
|---|---|
| Back button | `getByRole('button', {name:'뒤로 가기'})` |
| Prev/Next month | `getByRole('button', {name:'이전 달'})` / `'다음 달'` |
| Sort toggle | `getByRole('button', {name:'정렬 변경'})` |
| Card buttons | `getByRole('button', {name:/일기 보기/})` |
| Overflow badge | `getByTestId('photo-overflow-badge')` |
| Empty state | `getByText('이 달에는 작성된 일기가 없어요')` |
| Loading | `getByText('불러오는 중…')` |

Unit test cases (12):
1. Month filter — only May entries with `?month=2026-05`
2. Default month — current month when no param
3. Sort desc default
4. Sort asc after click
5. +N badge for 5 photos
6. "(내용 없음)" when text empty AND no photos
7. Body text omitted when text empty BUT photos present
8. Empty month state visible
9. Card tap calls router.push with /diary/[date]
10. Next month nav (push with new month)
11. Prev month year rollover (2026-01 → 2025-12)
12. isReady=false shows loading placeholder

E2E (optional): seed entries → navigate to /list → tap card → editor opens → back returns to list with same state.

---

## File Budget

| File | Target lines |
|---|---|
| `page.tsx` | ~75 |
| `ListHeader.tsx` | ~60 |
| `DiaryListCard.tsx` | ~70 |
| `PhotoThumbnailStrip.tsx` | ~30 |
| `formatListDate.ts` | ~15 |
| `ListScreen.test.tsx` | ~200 (test file, OK over 100) |

---

## Implementation Order

1. `src/lib/utils/formatListDate.ts`
2. `src/app/list/_components/PhotoThumbnailStrip.tsx`
3. `src/app/list/_components/DiaryListCard.tsx`
4. `src/app/list/_components/ListHeader.tsx`
5. `src/app/list/page.tsx`
6. `src/app/list/__tests__/ListScreen.test.tsx`
7. Run typecheck, lint, test

---

## Backward Compatibility

- Existing stub at `src/app/list/page.tsx` has no tests/callers — safe to replace.
- CalendarScreen pushes bare `Routes.list` — list page defaults to current month when `?month` absent. No CalendarScreen change required.
- No localStorage schema change.

---

## Performance Considerations

- `loading="lazy"` on all photo `<img>` tags
- `useDiaries` reads once on mount; filter and sort are in-memory and instantaneous for typical diary volumes
- `key={activeMonth}` on list container triggers natural unmount/mount on month change

---

## Risks and Tradeoffs

1. `<button>` wrapping `<Card>`: needs `w-full text-left` to prevent browser-default centering.
2. Month not passed from calendar's list button — accepted UX gap; list defaults to current month.
3. No live storage subscription — accepted for MVP.
4. `formatListDate` must use `new Date(isoDate + 'T00:00:00')` to avoid UTC shift.

---

## Open Questions

None. All resolved by pre-decisions.

---

## Verdict
PASS

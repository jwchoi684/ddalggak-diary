# Architecture Report — REQ-013

## Summary

REQ-013 (일기 리스트 화면) builds on a solid Next.js 15 / React 19 / Tailwind v4 foundation. The route stub exists at `src/app/list/page.tsx` (7 lines, placeholder only). All dependencies — `Card`, `MoodIcon`, `EmptyState`, `IconButton`, `useDiaries`, `Routes.listWithFilter` — are in place and production-quality. No new primitives are needed; this is a composition task.

---

## Codebase Map

| Path | Role |
|---|---|
| `src/app/list/page.tsx` | Route stub (replace entirely) |
| `src/app/list/_components/` | Does not exist yet — create here |
| `src/design-system/Card.tsx` | White surface, `large` variant |
| `src/design-system/MoodIcon.tsx` | Emoji icon, `size: number` |
| `src/design-system/EmptyState.tsx` | Zero-content layout |
| `src/design-system/IconButton.tsx` | White circular 44×44 header btn |
| `src/lib/storage/useDiaries.ts` | `{ entries, isReady }` hook |
| `src/lib/storage/types.ts` | `DiaryEntry`, `Photo` shapes |
| `src/lib/navigation/routes.ts` | `Routes.listWithFilter`, `Routes.diary` |
| `src/lib/navigation/__tests__/setupNextNavigation.ts` | Router mock helpers |
| `src/app/globals.css` | Tailwind v4 `@theme` tokens |

---

## Findings

### 1. `src/app/list/page.tsx` — Current stub

8 lines. Pure stub with no `"use client"` directive, no state, no hooks. Safe to replace wholesale. The list page will need `"use client"` because it reads `useSearchParams`, `useRouter`, and `useDiaries`.

### 2. `Card` API — exact props

```ts
export interface CardProps {
  children: React.ReactNode;
  className?: string;
  large?: boolean;          // true → --radius-card-lg (20px); default 16px
}
```

Shadow is applied via `style={{ boxShadow: 'var(--shadow-card)' }}` (Tailwind v4 does not auto-generate shadow utilities from `@theme` variables). No `padding` or `onClick` props — padding must be added via `className`; tap handler must wrap `Card` in a `<button>` or add `onClick` on a wrapping element. The REQ-013 card needs both internal padding and a tap-to-navigate action, so the pattern will be: `<button onClick={…}><Card className="p-4">…</Card></button>` or add an `onClick` + `role="button"` to a wrapping element.

### 3. `MoodIcon` — size prop

```ts
export interface MoodIconProps {
  id: MoodId;
  size: number;   // integer pixels
  className?: string;
}
```

Precedents: `size={32}` in `CalendarDayCell`, `size={72}` in `EditorBody`. REQ-013 requires `size={64}` (top-center on card). No changes to `MoodIcon` needed.

### 4. `useDiaries` — signature and reactivity

```ts
function useDiaries(): { entries: DiaryEntry[]; isReady: boolean }
```

Reads `localStorage` **once on mount** (no subscription, no re-read on storage events). `isReady` is `false` on the first SSR/hydration render, `true` after the effect fires. The list screen must gate rendering on `isReady` (same pattern as `CalendarScreen`). Not re-exported from the SSR-safe `@/lib/storage` barrel; import path must be `@/lib/storage/useDiaries`.

### 5. `readDiaries` — shape

Returns `DiaryEntry[]`, never throws, returns `[]` on SSR/missing key. Not suitable for direct screen use (no reactivity); `useDiaries` wraps it and is the correct choice for the list screen.

### 6. `DiaryEntry` — relevant fields

```ts
interface DiaryEntry {
  id: string;
  date: string;        // "YYYY-MM-DD"
  mood: MoodId;
  text: string;        // may be empty string
  textAlign: 'left' | 'center';
  photos: Photo[];     // Photo.dataUrl is base64, Photo.id is UUID
  createdAt: string;
  updatedAt: string;
}
```

Month filtering: `entry.date.slice(0, 7)` yields `"YYYY-MM"` — compare against the active month param. Sort: compare `entry.date` strings lexicographically (ISO dates sort correctly as strings).

### 7. Routes — list navigation

`Routes.listWithFilter` already exists and handles the `?month=YYYY-MM&sort=asc|desc` pattern:

```ts
Routes.listWithFilter({ month: '2026-05' })          // '/list?month=2026-05'
Routes.listWithFilter({ month: '2026-05', sort: 'asc' }) // '/list?month=2026-05&sort=asc'
Routes.diary(date)                                    // '/diary/YYYY-MM-DD'
```

Month navigation in the list header should push `Routes.listWithFilter({ month: newMonth })` rather than using local state, so the URL stays bookmarkable and back-navigation preserves month. Sort toggle can remain local state per REQ-013 ("정렬 상태는 세션 내 유지").

Initial month defaults: read `?month` from `useSearchParams()`; fall back to current month if absent. The calendar's list button currently pushes `Routes.list` (bare, no month param) — the list screen's fallback to current month handles that correctly.

### 8. Calendar → /list navigation

`CalendarScreen.tsx` line 90:
```ts
onList={() => router.push(Routes.list)
```
No month is passed. The list screen must default to current month when `?month` is absent.

### 9. `CalendarDayCell` — MoodIcon size precedent

`size={32}` is the calendar cell size. REQ-013 requires `size={64}` for the list card. No changes needed to `CalendarDayCell`.

### 10. Date formatting precedent

`EditorBody` uses:
```ts
const DATE_FMT = new Intl.DateTimeFormat('ko-KR', { year: 'numeric', month: 'long', day: 'numeric' });
// date + 'T00:00:00' to avoid UTC offset shifting
```
The list card date display should use the same pattern (e.g. `"2026년 5월 22일"` or `"2026.05.22 토요일"` per intake Q5).

### 11. Photo strip pattern

`PhotoCarousel` uses `photo.dataUrl` with a plain `<img>` tag (not `next/image` — base64 data URLs are incompatible). The list card's thumbnail strip is simpler: up to 3 `<img>` elements at fixed size + `+N` badge. Reuse the `no-scrollbar` CSS class (already in `globals.css`) if the strip overflows, or keep it non-scrolling (truncate at 3).

### 12. Tailwind v4 `line-clamp` availability

Tailwind v4.3.0 **natively generates `line-clamp-*` utilities**. The utility expands to `overflow: hidden; display: -webkit-box; -webkit-box-orient: vertical; -webkit-line-clamp: N`. Use `line-clamp-3` directly in className. No plugin or custom CSS needed.

---

## Concrete Integration Points

| Concern | What to use | Import path |
|---|---|---|
| Data read | `useDiaries()` | `@/lib/storage/useDiaries` |
| Month filter | `entry.date.slice(0,7) === activeMonth` | inline |
| Sort | `[...filtered].sort((a,b) => a.date.localeCompare(b.date))` | inline |
| Card surface | `<Card className="p-4">` | `@/design-system/Card` |
| Mood icon | `<MoodIcon id={entry.mood} size={64} />` | `@/design-system/MoodIcon` |
| Empty state | `<EmptyState title="이 달에는 작성된 일기가 없어요" action={…} />` | `@/design-system/EmptyState` |
| Header buttons | `<IconButton …>` | `@/design-system/IconButton` |
| Navigate to editor | `router.push(Routes.diary(entry.date))` | `@/lib/navigation` |
| Month URL param | `Routes.listWithFilter({ month })` | `@/lib/navigation` |
| Read URL param | `useSearchParams().get('month')` | `next/navigation` |
| Back navigation | `router.back()` | `next/navigation` |
| Text clamp | `className="line-clamp-3"` | Tailwind v4 native |
| Photo dataUrl | `<img src={photo.dataUrl} alt="…" />` | inline (no next/image) |

---

## Architecture Constraints

1. `"use client"` required on `list/page.tsx` — it uses `useSearchParams`, `useRouter`, `useDiaries`.
2. Next.js 15: `useSearchParams()` should be wrapped in a `<Suspense>` boundary at the page level (this is the canonical workaround for the Next.js 15 dev warning).
3. `Card` has no `onClick` prop — click handler belongs on a wrapping `<button>` element. Apply `w-full text-left` to avoid button default centering.
4. `useDiaries` returns a snapshot, not a live subscription. If the user edits an entry in another tab, the list will not update without a page reload. Acceptable for MVP.
5. File size rule (CLAUDE.md): 100 lines per file. The list screen will need splitting if the page + card + header logic accumulates.
6. Design system rule: `DiaryListCard` must live in `src/app/list/_components/`, not as a one-off inline component.

---

## Risks

1. **Calendar does not pass `?month` to `/list`** — the list screen must gracefully default to current month. Low risk; clearly handled by fallback logic.
2. **`Card` has no interactive affordance** — wrapping in `<button>` is the correct pattern, but `<button>` inside a `<div>` scroll container may cause accessibility issues with keyboard focus order. Use `role="group"` or ensure each card `<button>` has a clear label.
3. **Photo thumbnails are base64 data URLs** — for entries with many large photos, rendering even 3 thumbnails in a long list could be slow. MVP scope makes this acceptable, but consider lazy loading (`loading="lazy"` on `<img>`) as a low-cost mitigation.
4. **`useSearchParams` Suspense warning** — Next.js 15 emits a warning if `useSearchParams` is used outside `<Suspense>` in some SSR contexts. Wrap the list content in `<Suspense fallback={...}>`.

---

## Unknowns

- Whether the calendar's `onList` callback should pass the currently-viewed month (currently it does not). REQ-013 accepts bare `/list` and defaults to current month; this is a UX gap but not a blocker.

---

## Suggested File Structure

```
src/app/list/
  page.tsx                         # "use client" — owns searchParams, sort state, routing
  _components/
    ListHeader.tsx                 # back button + month nav + sort toggle
    DiaryListCard.tsx              # single card: MoodIcon + date + text + photos
    PhotoThumbnailStrip.tsx        # up to 3 img + +N badge (if > 3)
  __tests__/
    ListScreen.test.tsx            # month filter, sort toggle, +N, empty state
```

---

## File Budget Warnings

- `page.tsx` should stay under 80 lines by delegating rendering to `ListHeader` and `DiaryListCard`.
- `DiaryListCard.tsx` will be ~60–80 lines including the photo strip; extract `PhotoThumbnailStrip` if it grows beyond that.
- `ListHeader.tsx` can likely stay under 60 lines.

---

## Verdict
PASS

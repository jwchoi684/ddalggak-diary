# Performance Review Report — REQ-013

## Summary

REQ-013 is a pure client-side list screen. All data work is in-memory filter and sort over a `useDiaries` snapshot. The dataset is bounded by nature (one entry per calendar day, maximum 31 per month). No queries, no network calls, no background jobs, and no external APIs are involved. Performance risk is structurally low.

## Scope

Files examined:
- `src/app/list/page.tsx`
- `src/app/list/_components/DiaryListCard.tsx`
- `src/app/list/_components/PhotoThumbnailStrip.tsx`
- `src/lib/storage/useDiaries.ts`
- Agent state files: 03-technical-design, 07-implementation-report, 09-code-review-report

## Findings

**1. filter + sort re-runs every render**

`page.tsx` lines 26-33 compute `filtered` and `sorted` inline on every render, with no `useMemo`. For the real-world dataset (diary entries are per-day, so at most ~31 items per month and almost certainly under a few hundred total across all time) the filter is O(n) and the sort is O(k log k) where k <= 31. Both operations complete in microseconds and pose no measurable cost. `useMemo` would be correct style but is not blocking here.

**2. `useDiaries` reads storage once on mount**

`useEffect([], [])` fires once, sets state once. No per-render storage hit. Correct pattern.

**3. Base64 photo thumbnails**

Each `DiaryListCard` can render up to 3 `<img>` tags with base64 `dataUrl` src values. The browser decodes the image data to a bitmap once and caches it. All thumbnail `<img>` elements use `loading="lazy"`, which defers off-screen image decoding. The thumbnail dimensions are constrained to 64x64 px by Tailwind classes. The `photos.slice(0, 3)` cap in `PhotoThumbnailStrip` ensures a hard upper bound of 3 decodes per card.

Memory consideration: if a user has 31 entries in a month each with 3 large base64 photos, all of that data is loaded into `entries` in one shot. With REQ-011's 150KB per-photo cap and 10-photo per-entry cap, the worst-case month corpus is ~31 × 10 × 150KB ≈ ~46MB. This is bounded by the localStorage 5MB cap in practice. Not new risk.

**4. `Intl.DateTimeFormat` instance hoisted to module scope**

`DiaryListCard.tsx` line 13-17 creates `DATE_FMT` once at module load. Correct pattern.

**5. `key={activeMonth}` on a non-list `<div>`**

Noted by code review NB-3. The `key` has no remount effect in this position. No performance consequence.

**6. No virtualization**

Correct tradeoff. At max 31 cards per month, DOM node count is small.

**7. Inline arrow functions as `onTap` props**

`page.tsx` line 67 creates a new function per card per render. At 31 items this is unmeasurable overhead. Not blocking.

**8. `new Date(entry.date + 'T00:00:00')` called per render**

Single cheap Date construction per card render. Non-issue.

**9. `today` and `currentMonth` recomputed every render**

`page.tsx` lines 19-20 create a `new Date()` and build `currentMonth` on every render. Negligible.

## Blocking Issues

None.

## Non-Blocking Suggestions

1. **Memoize `filtered` and `sorted` with `useMemo`.** Wrap `page.tsx` lines 26-33 in a single `useMemo` keyed on `[entries, activeMonth, sort]`. Eliminates redundant filter+sort on sort-toggle re-renders. Not blocking at this dataset size but is correct hygiene.

2. **Consider memoizing `DiaryListCard` with `React.memo` if photo count grows.** Not needed today (31 cards, 3 photos max), but worth noting if photo limits change.

## Verdict
PASS

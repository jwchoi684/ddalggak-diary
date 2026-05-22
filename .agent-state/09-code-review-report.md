# Code Review Report — REQ-013

## Summary

REQ-013 implements the diary list screen by replacing a stub `page.tsx` with a full composition of new components (`ListHeader`, `DiaryListCard`, `PhotoThumbnailStrip`) and a utility (`formatListDate`). The implementation closely follows the technical design and API contract. All 12 unit tests and 1 E2E test pass. No blocking issues were found.

---

## Files Reviewed

| File | Type | Lines |
|---|---|---|
| `src/lib/utils/formatListDate.ts` | New utility | 15 |
| `src/app/list/_components/PhotoThumbnailStrip.tsx` | New component | 39 |
| `src/app/list/_components/DiaryListCard.tsx` | New component | 52 |
| `src/app/list/_components/ListHeader.tsx` | New component | 75 |
| `src/app/list/page.tsx` | Replaced stub | 83 |
| `src/lib/utils/__tests__/formatListDate.test.ts` | New tests | 26 |
| `src/app/list/__tests__/ListScreen.test.tsx` | New tests | 260 |
| `e2e/list.spec.ts` | New E2E | 46 |

---

## Blocking Issues

None.

---

## Non-Blocking Suggestions

1. **`DiaryListCard` and `PhotoThumbnailStrip` missing `"use client"` directive.** Both components are rendered as children of a Client Component (`page.tsx`), so they inherit the client boundary at runtime. However, they are not explicitly marked `"use client"` and would fail if ever rendered inside a Server Component tree without the parent boundary. `ListHeader.tsx` is correctly marked. Adding `"use client"` to both files would make the boundary explicit and consistent.

2. **Sort-toggle touch target uses inline `style` rather than a Tailwind class.** `ListHeader.tsx` line 69 uses `style={{ minHeight: 44 }}` for the sort button while `IconButton` enforces 44×44 via its own inline style internally. Using `className="min-h-[44px]"` instead of the inline style would be consistent with the rest of the design-system pattern.

3. **`key={activeMonth}` is on an inner `div` that's not list-rendered.** At `page.tsx` line 62 the `key={activeMonth}` is set on a `<div>` rendered unconditionally inside the same tree — it is not a list-rendered element. React will not treat a non-list key as a reset trigger in this position; the `key` has no effect on remount. The intended reset-on-month-change behavior should be achieved by setting `key={activeMonth}` on `<main>` instead. Currently the sort state will not reset when the month changes — which matches the spec ("정렬 상태는 세션 내 유지"), so there is no user-visible bug. Worth fixing for intent clarity.

---

## Nits

1. `ListHeader.tsx`: `ChevronLeft` and `ChevronRight` inline arrow components could be extracted to a shared `icons.tsx` to reduce future SVG duplication. Low priority.
2. `ListScreen.test.tsx` line 31: `useDiaries as ReturnType<typeof vi.fn>` — `vi.mocked(useDiaries)` would be cleaner. Pure nit.
3. `LOADING` constant at `page.tsx` lines 12-14 is a JSX expression hoisted to module scope. Fine in React 18 but unusual style.

---

## Positive Notes

- `formatListDate` correctly avoids the UTC-shift trap by appending `'T00:00:00'` and builds the date string from string slices to preserve leading zeros.
- All production files are under 100 lines as required by CLAUDE.md.
- No `any`, no `@ts-ignore`, no new external dependencies.
- `<img>` (not `next/image`) is used correctly for base64 `dataUrl` values, with `// eslint-disable-next-line @next/next/no-img-element` where needed.
- `PhotoThumbnailStrip` uses `key={photo.id}` (stable, entity-based key) rather than array index.
- FLD1 weekday deviation (test plan said `토요일`, calendar fact is `금요일`) was caught and corrected.
- `<Suspense>` boundary wraps `ListPageContent` correctly per Next.js 15 App Router rules.
- `Routes.calendar` is used for the empty-state CTA rather than a hardcoded `'/'`.
- `localeCompare` on ISO-8601 date strings is correct — ISO strings sort lexicographically in date order without parsing.

---

## Test Coverage Assessment

| Concern | Coverage |
|---|---|
| Month filtering | LS1 |
| Default month fallback | LS2 |
| Sort desc default | LS3 |
| Sort asc toggle | LS4 |
| +N overflow badge | LS5 |
| Empty body + no photos | LS6 |
| Empty body + photos present | LS7 |
| Empty month state | LS8 |
| Card tap navigation | LS9 |
| Next month nav | LS10 |
| Prev month year rollover | LS11 |
| Loading state | LS12 |
| formatListDate correctness | FLD1–FLD4 |
| E2E smoke | LE1 |

Coverage is complete against all 12 test plan cases plus 4 formatListDate cases.

---

## Invariant Walkthrough

| # | Caller Invariant | Status | Notes |
|---|---|---|---|
| 1 | `useDiaries` called inside `"use client"` component | PASS | `ListPageContent` inside `page.tsx` (`"use client"`) |
| 2 | `<Suspense>` wraps `useSearchParams` consumer | PASS | `ListPage` wraps `ListPageContent` |
| 3 | `DiaryListCard.onTap` uses `router.push(Routes.diary(entry.date))` | PASS | `page.tsx` line 65 |
| 4 | `PhotoThumbnailStrip` only rendered when `photos.length > 0` | PASS | `DiaryListCard` line 48 gates on `hasPhotos` |
| 5 | `formatListDate` only receives "YYYY-MM-DD" strings | PASS | All callers pass `entry.date` |
| 6 | Sort state never written to localStorage | PASS | Sort is `useState` only |
| 7 | `MoodIcon` is the sole mood-rendering boundary | PASS | `DiaryListCard` uses `<MoodIcon id={entry.mood} size={64} />` |
| 8 | `Card` from design-system is the sole card surface | PASS | `DiaryListCard` wraps `<Card className="p-4">` |

---

## File Size Audit

| File | Actual Lines | Limit | Status |
|---|---|---|---|
| `formatListDate.ts` | 15 | 100 | PASS |
| `PhotoThumbnailStrip.tsx` | 39 | 100 | PASS |
| `DiaryListCard.tsx` | 52 | 100 | PASS |
| `ListHeader.tsx` | 75 | 100 | PASS |
| `page.tsx` | 83 | 100 | PASS |

---

## Architecture Consistency

- Reuses `Card`, `MoodIcon`, `EmptyState`, `IconButton` from `@/design-system/`.
- Uses `useDiaries` from `@/lib/storage/useDiaries` (read-only).
- Follows the `Routes.*` navigation pattern.
- Uses `new Date(isoDate + 'T00:00:00')` UTC-safe parsing — same as `EditorBody`.
- Uses plain `<img>` (not `next/image`) for base64 data URLs — same as `PhotoCarousel`.
- Test mock pattern (`currentSearchParams` mutable variable + `vi.mock`) matches `CalendarScreen.test.tsx`.

---

## Contract Consistency

All four interface contracts from the API contract document are satisfied:
- `formatListDate(isoDate: string): string` — correct signature, UTC-safe parsing, correct Intl call.
- `ListHeader` — all 5 props, sticky header, correct aria labels, `addMonths` for prev/next, sort label strings match.
- `DiaryListCard` — correct props, `aria-label` via `Intl.DateTimeFormat('ko-KR')` on `entry.date + 'T00:00:00'`, body text rules applied in specified order, `PhotoThumbnailStrip` gated on `photos.length > 0`.
- `PhotoThumbnailStrip` — correct props, 3-thumbnail + overflow badge, `data-testid="photo-overflow-badge"`, `loading="lazy"`, `alt="첨부 사진"`.

Korean strings all match the contract table exactly.

---

## Verdict
PASS

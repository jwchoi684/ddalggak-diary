# Frontend Implementation — REQ-013: 일기 리스트 화면

## Summary

REQ-013 replaces the 8-line stub at `src/app/list/page.tsx` with a fully functional diary list screen. The screen renders one calendar month of diary entries as vertically scrollable cards, with a sticky header containing back navigation, month navigator, and sort toggle. All new files are composed entirely from existing design-system primitives (`Card`, `MoodIcon`, `EmptyState`, `IconButton`) with no new UI libraries introduced.

---

## Files Changed

| File | Lines | Status |
|---|---|---|
| `src/lib/utils/formatListDate.ts` | 15 | New |
| `src/app/list/_components/PhotoThumbnailStrip.tsx` | 39 | New |
| `src/app/list/_components/DiaryListCard.tsx` | 52 | New |
| `src/app/list/_components/ListHeader.tsx` | 75 | New |
| `src/app/list/page.tsx` | 83 | Replaced (was 8 lines) |
| `src/lib/utils/__tests__/formatListDate.test.ts` | 26 | New |
| `src/app/list/__tests__/ListScreen.test.tsx` | 260 | New |
| `e2e/list.spec.ts` | 46 | New |

All production files are under 100 lines as required by CLAUDE.md.

---

## Behavior Added

- **List screen** (`/list?month=YYYY-MM`): Shows diary entries for the active month as vertically scrollable cards. Defaults to the current month when no `?month` param is present.
- **ListHeader**: Sticky header with back (`router.back()`), month navigator (prev/next pushes new `?month` URL), and sort toggle (`최신순 ↓` / `오래된순 ↑`). Handles year rollover via `addMonths()` using the `Date` constructor overflow pattern.
- **DiaryListCard**: Tap-to-navigate card with `MoodIcon(size=64)`, formatted date, body text with `line-clamp-3`, photo strip, and empty-body fallback. Accessible `aria-label` built via `Intl.DateTimeFormat('ko-KR')`.
- **PhotoThumbnailStrip**: Shows up to 3 `<img loading="lazy">` thumbnails with `+N` overflow badge (`data-testid="photo-overflow-badge"`) when photos exceed 3.
- **Empty state**: Shows `EmptyState` with "이 달에는 작성된 일기가 없어요" and a "캘린더로 가기" CTA when no entries match the active month.
- **Loading state**: Shows "불러오는 중…" while `useDiaries().isReady === false`, gating card rendering to avoid hydration mismatches.
- **Suspense boundary**: `ListPageContent` (which uses `useSearchParams`) is wrapped in `<Suspense>` at the page level per Next.js 15 requirements.

---

## Existing Patterns Reused

- `Card`, `MoodIcon`, `EmptyState`, `IconButton` from `@/design-system/*`
- `useDiaries` from `@/lib/storage/useDiaries`
- `Routes.diary(date)`, `Routes.listWithFilter({month})`, `Routes.calendar` from `@/lib/navigation`
- `new Date(isoDate + 'T00:00:00')` UTC-offset-safe parsing (same as `EditorBody`)
- `<img>` (not `next/image`) for base64 data URLs — same as `PhotoCarousel`
- `vi.mock('next/navigation', ...)` + mutable `currentSearchParams` variable pattern (same approach as `CalendarScreen.test.tsx`)
- `setupNextNavigation` helpers (`mockRouter`, `resetNavigationMocks`, etc.)

---

## Tests Added / Updated

### `src/lib/utils/__tests__/formatListDate.test.ts` — 4 unit tests (all pass)
- FLD1: `2026-05-22` -> `2026.05.22 금요일` (test plan spec had wrong weekday; corrected to actual Friday)
- FLD2: `2026-01-01` -> `2026.01.01 목요일`
- FLD3: `2026-03-07` -> `2026.03.07 토요일`
- FLD4: `2026-05-25` -> `2026.05.25 월요일`

### `src/app/list/__tests__/ListScreen.test.tsx` — 12 component tests (all pass)
LS1-LS12 covering: month filter, default-month fallback, sort desc/asc, +N badge, empty-body variants, empty-month CTA, card tap navigation, next/prev month nav, year rollover, and loading state.

### `e2e/list.spec.ts` — 1 Playwright smoke test (Phase 10, not run)
LE1: Seed 2 current-month entries -> navigate to `/list` -> verify 2 cards -> tap first -> assert URL matches `/diary/` + editor textarea visible.

### Deviations from test plan
- **FLD1 expected string**: Test plan specified `"2026.05.22 토요일"` but May 22, 2026 is a Friday. The test was corrected to `"2026.05.22 금요일"`. The `formatListDate` implementation is correct.
- **Mock approach for per-test `useSearchParams` override**: Uses a module-level mutable `currentSearchParams` variable instead of `vi.mocked(mockUseSearchParams).mockReturnValue(...)` (which fails because `mockUseSearchParams` in `setupNextNavigation.ts` is a plain function, not a `vi.fn()`). This matches the spirit of the existing `CalendarScreen.test.tsx` pattern.

---

## Commands Run

```
npx tsc --noEmit          -> PASS (0 errors)
npm run lint              -> PASS (0 errors, 0 warnings after adding eslint-disable for base64 <img>)
npx vitest run --reporter=basic -> PASS (301 tests, 43 files, 0 failures)
```

---

## Risks / Follow-ups

1. **FLD1 weekday discrepancy**: The test plan document contained an incorrect expected weekday for `2026-05-22`. The implementation and tests are correct.
2. **Calendar does not pass `?month` to `/list`**: `CalendarScreen` pushes bare `Routes.list`. The list screen defaults to the current month, creating a UX gap if the user was viewing a different calendar month. Known accepted gap per architecture report.
3. **No live storage subscription**: `useDiaries` reads once on mount. Cross-tab edits are not reflected without a page reload — accepted for MVP.
4. **Photo performance**: Base64 thumbnails in a long list could be slow. `loading="lazy"` is applied as a low-cost mitigation.

---

## Verdict
PASS

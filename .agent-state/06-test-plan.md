# Test Plan

## Summary

REQ-013 adds the diary list screen: a monthly card-list view with month navigation, sort toggle, photo thumbnails, and an empty state. Three new test files cover all acceptance criteria: a pure unit test for the `formatListDate` utility, a happy-dom component test for the list screen, and one Playwright E2E smoke test. Total new: 17 cases (4 unit + 12 component + 1 E2E).

---

## Unit Tests

### File: `src/lib/utils/__tests__/formatListDate.test.ts`

Framework: Vitest (no DOM needed, no `@vitest-environment` directive required).

| ID | Input | Expected output | What it proves |
|----|-------|-----------------|----------------|
| FLD1 | `"2026-05-22"` | `"2026.05.22 토요일"` | Saturday mapping + dot separator |
| FLD2 | `"2026-01-01"` | `"2026.01.01 목요일"` | Thursday mapping + January leading zero |
| FLD3 | `"2026-03-07"` | `"2026.03.07 토요일"` | Month and day leading zeros preserved |
| FLD4 | `"2026-05-25"` | `"2026.05.25 월요일"` | Monday (non-weekend weekday) renders correctly |

All four cases use hardcoded expected strings; no `vi.useFakeTimers` needed because the function takes an explicit date string.

---

## Integration Tests

### File: `src/app/list/__tests__/ListScreen.test.tsx`

Framework: Vitest 2, `@testing-library/react@^16`, `@vitest-environment happy-dom`.

Mocks required (declared at module scope, before dynamic imports):
- `vi.mock('next/navigation', …)` — reuse existing pattern from `CalendarScreen.test.tsx`.
- `vi.mock('@/lib/storage/useDiaries', () => ({ useDiaries: vi.fn() }))`.

`setupNextNavigation` already exports `mockRouter`, `mockUseRouter`, `mockUseSearchParams`, `resetNavigationMocks`. For `?month` tests the mock needs a custom `URLSearchParams`; override `mockUseSearchParams` locally per test using `vi.spyOn` or a module-level variable pattern matching `CalendarScreen.test.tsx`.

Dynamic imports after mocks (matching existing style):
```ts
const { useDiaries } = await import('@/lib/storage/useDiaries');
const useDiariesMock = useDiaries as ReturnType<typeof vi.fn>;
// import page component after mocks are in place
```

`beforeEach`: `resetNavigationMocks()` + `useDiariesMock.mockReturnValue({ entries: [], isReady: true })`.
`afterEach`: `cleanup()`.

#### Test fixture helpers (defined once at top of file)

```ts
function makeEntry(date: string, overrides = {}): DiaryEntry {
  return { date, mood: 'joy', text: '내용', photos: [], ...overrides };
}
```

#### Cases

| ID | Description | Setup | Assertion |
|----|-------------|-------|-----------|
| LS1 | Month filter: only May entries shown with `?month=2026-05` | 2 May entries + 1 April entry; `mockUseSearchParams` returns `new URLSearchParams('month=2026-05')` | `getByRole('button', {name:/일기 보기/})` count = 2; April entry not found |
| LS2 | Default month = current month when `?month` absent | `vi.useFakeTimers()` + `vi.setSystemTime(new Date('2026-05-15'))`; 1 May entry + 1 June entry; `mockUseSearchParams` returns `new URLSearchParams()` | Only May card visible; June card absent; `afterEach` restores timers |
| LS3 | Sort desc (default): newest entry first | 2 May entries dated `2026-05-01` and `2026-05-20`; `?month=2026-05` | First card aria-label contains `"2026년 5월 20일"` |
| LS4 | Sort asc after clicking sort toggle | Same 2 entries as LS3 | `fireEvent.click(getByRole('button', {name:'정렬 변경'}))` → first card aria-label contains `"2026년 5월 1일"` |
| LS5 | +N badge for 5 photos | Entry with 5 `Photo` objects; `?month=2026-05` | `getByTestId('photo-overflow-badge')` text = `"+2"`; `getAllByAltText('첨부 사진')` length = 3 |
| LS6 | "(내용 없음)" when text empty AND no photos | `makeEntry('2026-05-10', {text:'', photos:[]})` | `getByText('(내용 없음)')` visible |
| LS7 | Body text omitted when text empty AND photos present | `makeEntry('2026-05-10', {text:'', photos:[fakePhoto()]})` | `queryByText('(내용 없음)')` = null; `getByAltText('첨부 사진')` present |
| LS8 | Empty month shows CTA "캘린더로 가기" | No entries for `?month=2026-05` | `getByText('이 달에는 작성된 일기가 없어요')` visible; `getByRole('button', {name:'캘린더로 가기'})` visible |
| LS9 | Card tap calls `router.push("/diary/[date]")` | 1 May entry; `?month=2026-05` | `fireEvent.click(getByRole('button', {name:/일기 보기/}))` → `expect(mockRouter.push).toHaveBeenCalledWith('/diary/2026-05-10')` |
| LS10 | Next month nav pushes `?month=2026-06` | `?month=2026-05` | `fireEvent.click(getByRole('button', {name:'다음 달'}))` → `mockRouter.push` called with string containing `month=2026-06` |
| LS11 | Prev month from 2026-01 rolls back to 2025-12 | `?month=2026-01` | `fireEvent.click(getByRole('button', {name:'이전 달'}))` → `mockRouter.push` called with string containing `month=2025-12` |
| LS12 | `isReady=false` shows loading placeholder | `useDiariesMock.mockReturnValue({entries:[], isReady:false})` | `getByText('불러오는 중…')` visible; no card buttons present |

---

## E2E Tests

### File: `e2e/list.spec.ts`

Framework: Playwright Chromium. Uses existing `seedDiariesScript` helper.

| ID | Steps | Assertions |
|----|-------|------------|
| LE1 | Seed 2 current-month entries via `page.addInitScript(seedDiariesScript([e1, e2]))`; `page.goto('/list')`; verify 2 card buttons visible (aria-label `/일기 보기/`); click first card; assert URL matches `/diary/YYYY-MM-DD`; assert editor textarea visible | `toHaveURL(/\/diary\//)`; `getByPlaceholder('오늘 어떤 하루였나요?')` visible |

Photo entries not required for LE1 — keep the seed minimal (`mood`, `date`, `text`, `photos: []`).

---

## Regression Tests

No existing tests are directly affected. The `src/app/list/page.tsx` stub currently has no test coverage; replacing it cannot break existing passing tests.

---

## Security-Relevant Tests

Not applicable for this feature (read-only local storage rendering; no auth, no API calls, no user input sanitisation concerns beyond existing storage layer).

---

## Fixtures / Mocks Needed

| Item | Source | Notes |
|------|--------|-------|
| `mockRouter`, `mockUseRouter`, `mockUseSearchParams`, `resetNavigationMocks` | `src/lib/navigation/__tests__/setupNextNavigation.ts` | Already exists; no changes needed |
| `useDiaries` mock | `vi.mock('@/lib/storage/useDiaries', …)` | Per-test `.mockReturnValue()` |
| `makeEntry(date, overrides)` factory | Inline in `ListScreen.test.tsx` | ~5 lines |
| `fakePhoto()` factory | Inline in `ListScreen.test.tsx` | Returns `{ id: 'p1', dataUrl: 'data:image/png;base64,AA==' }` |
| `seedDiariesScript` | `e2e/_helpers/seedDiaries.ts` | Already exists |
| `vi.setSystemTime` for LS2 | Vitest built-in | Restore in `afterEach` with `vi.useRealTimers()` |
| Custom `URLSearchParams` per test | `new URLSearchParams('month=...')` | Passed inline to `mockUseSearchParams` via `vi.spyOn` override |

---

## Commands to Run

```bash
# Unit + component tests
npm run test -- --reporter=verbose src/lib/utils/__tests__/formatListDate.test.ts
npm run test -- --reporter=verbose src/app/list/__tests__/ListScreen.test.tsx

# Full suite (regression guard)
npm test

# Type check
npm run typecheck

# E2E
npm run test:e2e -- e2e/list.spec.ts
```

---

## Not Applicable Tests

- **API / HTTP tests**: no backend endpoints introduced.
- **Database / migration tests**: localStorage schema unchanged.
- **Performance tests**: in-memory filter/sort on typical diary volumes; no measurement needed.
- **Auth / permission tests**: app has no auth layer in MVP.

---

## Verdict
PASS

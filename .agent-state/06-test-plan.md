# Test Plan — REQ-007

## Summary

6 test files: 5 Vitest unit suites (~29 cases, happy-dom) + 1 Playwright E2E spec (1 golden-path case, Chromium only). All unit tests use the established project patterns: `// @vitest-environment happy-dom` directive, `@testing-library/react`, `vi.mock`, `beforeEach`/`afterEach(cleanup)`, and the shared `makeDiary` fixture. The E2E bootstraps Playwright for the first time in this project.

---

## Runtime & Config

- **Unit runner:** Vitest v2, `happy-dom` environment (per-file opt-in via `// @vitest-environment happy-dom` directive — matches existing pattern in `diary-date-page.test.tsx`, `FAB.test.tsx`, etc.).
- **Global setup:** `vitest.config.ts` `setupFiles: ['./src/lib/storage/__tests__/setup.ts']` already installs the `LocalStorageShim` and clears it `beforeEach`. No changes to `vitest.config.ts` needed for the unit suite.
- **E2E runner:** Playwright, new `playwright.config.ts` at repo root. `testDir: './e2e'`, Chromium only, `webServer` starts `npm run dev` (`http://localhost:3000`), `reuseExistingServer: !process.env.CI`.
- **New devDep:** `"@playwright/test": "^1.44.0"`. New scripts: `"test:e2e": "playwright test"`, `"test:e2e:install": "playwright install chromium"`.

---

## Unit Tests

### `src/lib/storage/__tests__/useDiaries.test.ts` (4 cases, happy-dom)

Mock target: `vi.mock('@/lib/storage', ...)` scoped to override `readDiaries` while keeping `DiaryEntry` type import intact. Use `act(async () => {})` from `@testing-library/react` to flush the `useEffect`.

Import path under test: `import { useDiaries } from '@/lib/storage/useDiaries'` (direct, not via barrel — matches invariant in `04-api-contract.md`).

Use `renderHook` from `@testing-library/react`.

```
describe('useDiaries — initial state')
  it('returns isReady=false and entries=[] before the effect runs')
    // renderHook, inspect result.current immediately, before act()

describe('useDiaries — after mount effect')
  it('sets isReady=true and entries from readDiaries after effect flushes')
    // readDiaries mocked to return [makeDiary()]; await act(async () => {})
  it('sets isReady=true and entries=[] when readDiaries returns []')
    // readDiaries mocked to return []
  it('sets entries.length=3 when readDiaries returns 3 entries')
    // readDiaries mocked to return [makeDiary(), makeDiary(), makeDiary()]
```

**Covers caller invariants:** `isReady` transitions exactly once `false → true`; `entries` populated from `readDiaries`; no direct localStorage access in hook (mock proves abstraction boundary).

---

### `src/app/__tests__/CalendarDayCell.test.tsx` (6 cases, happy-dom)

Import: `import { CalendarDayCell } from '@/app/_components/CalendarDayCell'`. Use `makeDiary` from `@/lib/storage/__tests__/fixtures`. `afterEach(cleanup)`.

```
describe('CalendarDayCell — no entry, not today')
  it('renders a <span> with the day number extracted from date prop')
    // date='2026-05-15', no entry, isToday=false
    // expect: getByText('15') present; queryByRole('img') null
  it('applies text-cell-empty class on the day numeral span')
    // same setup; check className contains 'text-cell-empty'

describe('CalendarDayCell — no entry, today')
  it('applies font-bold and text-peach classes on the day numeral when isToday=true')
    // date='2026-05-18', isToday=true, no entry
    // expect: getByText('18').className contains 'font-bold' and 'text-peach'

describe('CalendarDayCell — entry present, not today')
  it('renders MoodIcon (role=img) with mood aria-label; no peach dot element')
    // entry=makeDiary({date:'2026-05-10', mood:'joy'}), isToday=false
    // expect: getByRole('img').getAttribute('aria-label') === '기쁨'
    // expect: no element with className containing 'bg-peach'

describe('CalendarDayCell — entry present, today')
  it('renders MoodIcon AND a peach dot element (bg-peach class) when isToday=true')
    // entry present, isToday=true
    // expect: getByRole('img') present; container.querySelector('[class*="bg-peach"]') truthy

describe('CalendarDayCell — interactions and accessibility')
  it('calls onTap with the verbatim date prop when the button is clicked')
    // fireEvent.click(getByRole('button')); expect(onTap).toHaveBeenCalledWith('2026-05-10')
  it('aria-label is "{date} 일기 있음" when entry present; just "{date}" when absent')
    // two renders; check button getAttribute('aria-label')
```

**Covers invariants:** `onTap` called with verbatim `date`; aria-label correctness; Korean string discipline; touch target (min-h-[44px] via button role existence); no hardcoded hex — styling via token classes.

---

### `src/app/__tests__/CalendarGrid.test.tsx` (5 cases, happy-dom)

Import: `import { CalendarGrid } from '@/app/_components/CalendarGrid'`. Use May 2026 (`year=2026, month=4`): `new Date(2026, 4, 1).getDay() === 5` (Friday), 31 days, `startOffset=5` → day 1 is the 6th rendered cell (index 5 in the grid).

```
describe('CalendarGrid — May 2026 structure')
  it('renders the 7-day weekday header row in Sunday-first order: 일 월 화 수 목 금 토')
    // getByText('일'), getByText('월'), ... getByText('토') all present
    // verify order: getAllByText within header row; positions 0..6
  it('renders exactly 31 day buttons (one per in-month day)')
    // getAllByRole('button') has length 31
  it('day 1 is preceded by exactly 5 non-interactive empty slots (Friday column)')
    // The day-1 button aria-label contains '2026-05-01'
    // Count non-button sibling divs before it in the grid = 5

describe('CalendarGrid — diary entry rendering')
  it('day 3 cell renders MoodIcon when diaryByDate has an entry for 2026-05-03; other days render numerals')
    // diaryByDate = new Map([['2026-05-03', makeDiary({date:'2026-05-03', mood:'joy'})]])
    // expect: getAllByRole('img') has length 1; getByText('1') and getByText('5') present
  it('onCellTap called with "2026-05-03" when day-3 button is clicked')
    // fireEvent.click(getByRole('button', {name: /2026-05-03/}))
    // expect(onCellTap).toHaveBeenCalledWith('2026-05-03')
```

**Covers invariants:** Sunday-first weekday order (Korean); `onCellTap` never fired for null/empty slots; dateKey format YYYY-MM-DD; pure/stateless component — same props always same output.

---

### `src/app/__tests__/CalendarHeader.test.tsx` (6 cases, happy-dom)

Import: `import { CalendarHeader } from '@/app/_components/CalendarHeader'`. All callbacks are `vi.fn()`. `afterEach(cleanup)`.

```
describe('CalendarHeader — month display')
  it('renders "{month+1}월" — shows "5월" for month=4, year=2026; year is not rendered')
    // render with month=4, year=2026
    // getByText('5월') present; queryByText('2026') null

describe('CalendarHeader — navigation arrows')
  it('이전 달 button (‹) has aria-label "이전 달" and calls onPrev when clicked')
    // getByRole('button', {name: '이전 달'}); fireEvent.click; expect(onPrev).toHaveBeenCalledTimes(1)
  it('다음 달 button (›) has aria-label "다음 달" and calls onNext when clicked')
    // getByRole('button', {name: '다음 달'}); fireEvent.click; expect(onNext).toHaveBeenCalledTimes(1)

describe('CalendarHeader — icon buttons')
  it('검색 IconButton has aria-label "검색" and calls onSearch when clicked')
    // getByRole('button', {name: '검색'}); fireEvent.click; expect(onSearch).toHaveBeenCalledTimes(1)
  it('통계 IconButton has aria-label "통계" and calls onStats when clicked')
    // getByRole('button', {name: '통계'}); fireEvent.click; expect(onStats).toHaveBeenCalledTimes(1)
  it('리스트 IconButton has aria-label "리스트" and calls onList when clicked')
    // getByRole('button', {name: '리스트'}); fireEvent.click; expect(onList).toHaveBeenCalledTimes(1)
```

**Covers invariants:** Korean labels (all button names Korean); `month` 0-based rendered as `month+1` with `월` suffix; year suppressed in MVP; pure component (no router); each callback is no-arg and independent.

---

### `src/app/__tests__/CalendarScreen.test.tsx` (8 cases, happy-dom)

Two mock targets:

1. `vi.mock('next/navigation', ...)` using `setupNextNavigation` helper (same pattern as `diary-date-page.test.tsx`).
2. `vi.mock('@/lib/storage/useDiaries', ...)` to return controlled `{ entries, isReady }` without touching real localStorage. Default: `{ entries: [], isReady: true }`.

`beforeEach(() => { resetNavigationMocks(); mockUseDiariesFn.mockReturnValue({ entries: [], isReady: true }); })`. `afterEach(cleanup)`.

Compute today string inside tests: `new Date().toLocaleDateString('sv')` (same idiom as production code) to avoid date-hardcoding.

```
describe('CalendarScreen — initial render')
  it('current month label (e.g. "5월") is visible after mount')
    // render(<CalendarScreen />); getByText(`${new Date().getMonth() + 1}월`) present
  it('CalendarGrid is suppressed while isReady=false; visible (buttons rendered) after isReady=true')
    // First render: mock returns isReady=false → getAllByRole('button') returns only FAB + arrow buttons (no day cells)
    // Remount with isReady=true → 28–31 day-cell buttons present

describe('CalendarScreen — FAB')
  it('FAB is rendered with aria-label "오늘 일기 쓰기"')
    // getByRole('button', {name: '오늘 일기 쓰기'}) present
  it('FAB click calls router.push with /diary/YYYY-MM-DD for today')
    // fireEvent.click(getByRole('button', {name: '오늘 일기 쓰기'}))
    // const today = new Date().toLocaleDateString('sv')
    // expect(mockRouter.push).toHaveBeenCalledWith(`/diary/${today}`)

describe('CalendarScreen — month navigation via arrows')
  it('이전 달 button click decrements visible month label by 1')
    // currentMonth = new Date().getMonth() + 1
    // fireEvent.click(getByRole('button', {name: '이전 달'}))
    // expected label: currentMonth === 1 ? '12월' : `${currentMonth - 1}월`
  it('다음 달 button click increments visible month label by 1')
    // currentMonth = new Date().getMonth() + 1
    // fireEvent.click(getByRole('button', {name: '다음 달'}))
    // expected label: currentMonth === 12 ? '1월' : `${currentMonth + 1}월`

describe('CalendarScreen — swipe gesture')
  it('pointer swipe left (deltaX ≤ -50) increments visible month (next month)')
    // const container = screen.getByRole('main') or top-level div
    // fireEvent.pointerDown(container, {clientX: 200})
    // fireEvent.pointerUp(container, {clientX: 140})   // -60 delta
    // expect month label to advance by 1
  it('pointer swipe right (deltaX ≥ +50) decrements visible month (prev month)')
    // fireEvent.pointerDown(container, {clientX: 100})
    // fireEvent.pointerUp(container, {clientX: 160})   // +60 delta
    // expect month label to decrease by 1
```

**Covers caller invariants:** all navigation via `Routes.diary(today)` (no raw string); `useDiaries` not accessed via barrel; Korean FAB label; grid suppressed on `!isReady`; swipe threshold behavior.

---

## Integration Tests

Not applicable. All components are pure client-side with no cross-service I/O. `useDiaries` integration with real `localStorage` is already covered by `diaries.test.ts` (existing). The hook unit tests above mock `readDiaries` at the module boundary, which is sufficient for this REQ.

---

## E2E Tests

### `e2e/calendar.spec.ts` (1 spec, Playwright Chromium)

```ts
import { test, expect } from '@playwright/test';

test('캘린더 화면 진입 후 FAB 탭 시 오늘 일기 에디터로 이동', async ({ page }) => {
  await page.goto('/');

  const today = new Date();
  const monthLabel = `${today.getMonth() + 1}월`;
  await expect(page.getByText(monthLabel)).toBeVisible();
  await expect(page.getByRole('main')).toBeVisible();

  await page.getByRole('button', { name: '오늘 일기 쓰기' }).click();

  const yyyy = today.getFullYear();
  const mm = String(today.getMonth() + 1).padStart(2, '0');
  const dd = String(today.getDate()).padStart(2, '0');
  await expect(page).toHaveURL(`/diary/${yyyy}-${mm}-${dd}`);
});
```

No `data-testid` attributes used. All selectors via role + accessible name. Runs against `npm run dev` server on `localhost:3000`.

---

## Regression Tests

All existing test suites (`moods.test.ts`, `personas.test.ts`, `diaries.test.ts`, `conversations.test.ts`, `settings.test.ts`, all design-system tests, `routes.test.ts`, `diary-date-page.test.tsx`, `not-found.test.tsx`) must continue to pass unchanged. Running `npm test` (which executes `vitest run`) exercises all suites together.

---

## Security-Relevant Tests

No security-sensitive logic in this REQ (no auth, no network calls, no API surface). The `vi.mock('@/lib/storage')` boundary in `useDiaries.test.ts` enforces that the hook never directly touches `localStorage` — all storage access goes through the documented `readDiaries` abstraction (Caller Invariant 1).

---

## Fixtures / Mocks Needed

| Mock / Fixture | Already exists? | Notes |
|---|---|---|
| `makeDiary(overrides?)` | Yes — `src/lib/storage/__tests__/fixtures.ts` | Import as-is |
| `setupNextNavigation` helpers (`mockRouter`, `resetNavigationMocks`) | Yes — `src/lib/navigation/__tests__/setupNextNavigation.ts` | Same `vi.mock('next/navigation', ...)` pattern as `diary-date-page.test.tsx` |
| `LocalStorageShim` + `beforeEach` clear | Yes — `src/lib/storage/__tests__/setup.ts` (global setupFile) | Active for all tests automatically |
| `vi.mock('@/lib/storage', ...)` override for `readDiaries` | No — added inline in `useDiaries.test.ts` | `vi.mock` factory returns `{ readDiaries: vi.fn(), ...rest }` |
| `vi.mock('@/lib/storage/useDiaries', ...)` controlling return value | No — added inline in `CalendarScreen.test.tsx` | Factory exports `useDiaries: vi.fn()` returning `{ entries: [], isReady: true }` by default |
| `playwright.config.ts` | No — must be created at repo root | Per technical design spec |
| `e2e/` directory + `calendar.spec.ts` | No — must be created | One file per E2E spec |

---

## Coverage Matrix

| Caller Invariant (from `04-api-contract.md`) | Covering Test(s) |
|---|---|
| 1. No direct localStorage access — only via `useDiaries → readDiaries` | `useDiaries.test.ts`: `vi.mock('@/lib/storage')` proves boundary; existing `no-direct-localstorage-access.test.ts` covers storage layer |
| 2. All navigation via `Routes.*` — no raw strings | `CalendarScreen.test.tsx` FAB case: asserts `mockRouter.push` called with `/diary/YYYY-MM-DD` matching `Routes.diary(today)` output; type violation caught by `typecheck` |
| 3. Token discipline — `text-cell-empty`, `text-peach`, `bg-peach` (no hardcoded hex) | `CalendarDayCell.test.tsx` cases 1, 2, 3 check className tokens; no hex values asserted |
| 4. No competing width constraint override | Verified during `npm run build` and visual E2E; not directly unit-testable |
| 5. Korean labels — weekdays, month, aria-labels, FAB | `CalendarGrid.test.tsx` case 1 (일~토); `CalendarHeader.test.tsx` cases 1–6; `CalendarScreen.test.tsx` FAB cases; E2E golden path |
| 6. Callback stabilization — `useCallback` for `onCellTap`/`onFAB` | `CalendarScreen.test.tsx` verifies correct behavior per mount; `CalendarDayCell.test.tsx` case 5 verifies tap fires correctly |
| `useDiaries`: `isReady` transitions `false → true` exactly once | `useDiaries.test.ts` cases 1 + 2 |
| `useDiaries`: `entries` populated from `readDiaries`, never throws | `useDiaries.test.ts` cases 2, 3, 4 |
| `CalendarDayCell`: `onTap` called with verbatim `date` | `CalendarDayCell.test.tsx` case 5 |
| `CalendarDayCell`: `aria-label` format | `CalendarDayCell.test.tsx` case 6 |
| `CalendarGrid`: `onCellTap` never called for null slots | `CalendarGrid.test.tsx` cases 1–4 (no null-slot buttons rendered); case 5 validates correct date string |
| `CalendarGrid`: Sunday-first weekday order | `CalendarGrid.test.tsx` case 1 |
| `CalendarGrid`: dateKey YYYY-MM-DD format | `CalendarGrid.test.tsx` case 5 — tap check uses `'2026-05-03'` |
| `CalendarHeader`: `month` 0-based rendered as `month+1 + 월` | `CalendarHeader.test.tsx` case 1 |
| `CalendarHeader`: year not rendered in MVP | `CalendarHeader.test.tsx` case 1 — `queryByText('2026')` null |
| `CalendarScreen`: grid suppressed while `!isReady` | `CalendarScreen.test.tsx` case 2 |
| `CalendarScreen`: FAB routes to today | `CalendarScreen.test.tsx` case 4; E2E golden path |
| `CalendarScreen`: month nav prev/next | `CalendarScreen.test.tsx` cases 5, 6 |
| `CalendarScreen`: swipe ±40px threshold | `CalendarScreen.test.tsx` cases 7, 8 |

---

## Commands to Run

```bash
# Install Playwright browser (one-time)
npm run test:e2e:install

# Type-check (catches import path violations, prop type errors)
npm run typecheck

# Lint
npm run lint

# Unit tests (all suites including new ones)
npm test

# Targeted unit run for REQ-007 files only
npx vitest run \
  src/lib/storage/__tests__/useDiaries.test.ts \
  src/app/__tests__/CalendarDayCell.test.tsx \
  src/app/__tests__/CalendarGrid.test.tsx \
  src/app/__tests__/CalendarHeader.test.tsx \
  src/app/__tests__/CalendarScreen.test.tsx

# E2E (requires dev server or reuseExistingServer=true)
npm run test:e2e
```

---

## Not Applicable Tests

| Category | Reason |
|---|---|
| Mood picker behavior | REQ-008 scope |
| Editor screen content and save flow | REQ-009 scope |
| Visual regression / screenshot comparison | MVP out of scope; no snapshot framework installed |
| Cross-browser E2E (Firefox, Safari, WebKit) | Chromium only per technical design; MVP non-requirement |
| Performance benchmarking / lighthouse | Not a correctness gate |
| Skeleton component during `!isReady` | Explicitly deferred in `04-api-contract.md` ("Not MVP") |
| Cross-year month navigation edge cases | Low risk; JS `Date` wraps correctly; deferred unless current test month is January/December |
| `MoodIcon` rendering fidelity (emoji content, size) | Covered by existing `MoodIcon.test.tsx` |
| `Routes.diary` output format | Covered by existing `routes.test.ts` |
| `FAB` and `IconButton` component contracts | Covered by existing `FAB.test.tsx` and `IconButton.test.tsx` |

---

## Verdict
PASS

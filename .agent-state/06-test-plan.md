# Test Plan

## Summary

REQ-014 adds the Stats screen: a mood-distribution horizontal bar chart for a selected month, with month navigation, a close button, and an empty state. Three new test files cover all acceptance criteria: a pure unit test for `addMonths`, a `renderHook` unit test for `useMoodStats`, and a happy-dom component test for the assembled screen. No E2E test is planned because the stats screen has no user-input flow that unit/integration tests cannot cover adequately. Total new: 21 cases (6 unit + 5 hook + 10 component).

---

## Unit Tests

### File: `src/lib/utils/__tests__/addMonths.test.ts`

Framework: Vitest (no DOM; no `@vitest-environment` directive needed).

| ID | Call | Expected | Rationale |
|----|------|----------|-----------|
| AM1 | `addMonths("2026-05", +1)` | `"2026-06"` | basic forward step |
| AM2 | `addMonths("2026-05", -1)` | `"2026-04"` | basic backward step |
| AM3 | `addMonths("2026-01", -1)` | `"2025-12"` | year rollover backward |
| AM4 | `addMonths("2026-12", +1)` | `"2027-01"` | year rollover forward |
| AM5 | `addMonths("2026-05",  0)` | `"2026-05"` | identity (delta zero) |
| AM6 | `addMonths("2026-03", +12)` | `"2027-03"` | full year advance |

All cases use hardcoded expected strings; no fakes or mocks needed.

---

## Integration Tests

### File: `src/app/stats/_components/__tests__/useMoodStats.test.ts`

Framework: Vitest + `@testing-library/react` `renderHook`. No DOM environment needed.

Imports: `renderHook` from `@testing-library/react`, `useMoodStats` from `../useMoodStats`.

Helper: `function makeEntry(date: string, mood: MoodId): DiaryEntry` — minimal inline factory (date + mood + empty text + empty photos).

| ID | entries | yearMonth | Expected result |
|----|---------|-----------|-----------------|
| UMS1 | `[]` | `"2026-05"` | `{ counts: [], hasData: false, maxCount: 0 }` |
| UMS2 | 2 entries dated `"2026-04-01"` (joy + sad) | `"2026-05"` | `{ counts: [], hasData: false, maxCount: 0 }` — other-month entries excluded |
| UMS3 | joy×3, sad×2 all in `"2026-05"` | `"2026-05"` | `counts[0] = { mood:'joy', count:3 }`, `counts[1] = { mood:'sad', count:2 }`, `maxCount: 3`, `hasData: true` |
| UMS4 | joy×2, sad×2 all in `"2026-05"` | `"2026-05"` | `counts[0].mood === 'joy'` (joy index 0 < sad index 5 in MOODS master array), `counts[1].mood === 'sad'` |
| UMS5 | all 10 moods once each in `"2026-05"` | `"2026-05"` | `counts.length === 10`, `maxCount === 1`, every `count === 1`, `hasData: true` |

---

## E2E Tests

Not required for this feature. The stats screen performs no form submission, navigation side-effect, or multi-step flow that integration tests cannot exercise directly. The `useMoodStats` hook is pure; the component is rendered and asserted in the component test below.

---

## Component Tests

### File: `src/app/stats/__tests__/StatsScreen.test.tsx`

Framework: Vitest 2, `@testing-library/react@^16`, `@vitest-environment happy-dom`.

**Mock declarations (module scope, before dynamic imports):**

```ts
// mutable searchParams pointer — same mutable-variable pattern as ListScreen.test.tsx
let currentSearchParams = new URLSearchParams();

vi.mock('next/navigation', () => ({
  useRouter:       () => mockUseRouter(),
  useSearchParams: () => currentSearchParams,
  useParams:       () => mockUseParams(),
  usePathname:     () => mockUsePathname(),
}));

vi.mock('@/lib/storage/useDiaries', () => ({ useDiaries: vi.fn() }));
```

**Dynamic imports after mocks:**
```ts
const { useDiaries } = await import('@/lib/storage/useDiaries');
const useDiariesMock = useDiaries as ReturnType<typeof vi.fn>;
const { default: StatsPage } = await import('@/app/stats/page');
```

**beforeEach:** `resetNavigationMocks()` + `currentSearchParams = new URLSearchParams()` + `useDiariesMock.mockReturnValue({ entries: [], isReady: true })`.

**afterEach:** `cleanup()`.

**Entry factory:** `makeEntry(date, mood, text = '')` → `{ date, mood, text, photos: [] }`.

| ID | Setup | Action | Assertion |
|----|-------|--------|-----------|
| SS1 | `isReady:true, entries:[]`; no `?month` | render | `getByText('이 달에는 기록이 없어요')` present; `queryByTestId('mood-summary-row')` null; `queryByTestId(/^mood-bar-/)` null; prev/next buttons present |
| SS2 | 5 entries: joy×3, sad×2 for current month | render | `getByTestId('mood-bar-joy')` present first; `getByTestId('mood-bar-sad')` present second; joy bar fill `width` style = `"100%"`; sad bar fill `width` style matches `~67%` (≥ 60%, ≤ 70%); count texts `"3"` and `"2"` visible |
| SS3 | all 10 moods once each for current month | render | `getAllByTestId(/^mood-bar-/)` length === 10; `getByTestId('mood-summary-row')` children count === 10; all count texts = `"1"` |
| SS4 | `currentSearchParams = new URLSearchParams('month=2026-01')`; `isReady:true, entries:[]` | `fireEvent.click(getByRole('button', {name:'이전 달'}))` | screen updates to show `"2025"` and `"12월"` |
| SS5 | `currentSearchParams = new URLSearchParams('month=2026-05')`; `isReady:true, entries:[]` | `fireEvent.click(getByRole('button', {name:'다음 달'}))` | screen shows `"2026"` and `"6월"` |
| SS6 | default setup | `fireEvent.click(getByRole('button', {name:'닫기'}))` | `mockRouter.back` called once |
| SS7 | `currentSearchParams = new URLSearchParams('month=2026-03')` | render | `getByText('3월')` visible; `getByText('2026')` visible |
| SS8 | joy×2, sad×2 for current month | render | `getAllByTestId(/^mood-bar-/)[0]` has `data-testid="mood-bar-joy"` (master-index tiebreak) |
| SS9 | `useDiariesMock.mockReturnValue({ entries:[], isReady:false })` | render | `getByText('불러오는 중…')` present; `queryByTestId('mood-summary-row')` null |
| SS10 | 2 distinct moods (joy×1, sad×1) for current month | render | `getByTestId('mood-summary-row')` has exactly 2 child icons; `queryByTestId('mood-bar-excited')` null |

**Note on SS2 width assertion:** query the `div` inside `getByTestId('mood-bar-joy')` that has `className` matching `rounded-full h-full` (the fill div) and check its `style.width`. Use `within(getByTestId('mood-bar-joy')).getByRole` or direct `querySelector`. The exact value depends on implementation's `Math.max(8, …)` formula: joy is `100%`, sad is `Math.max(8, (2/3)*100)` ≈ `66.67%`. Assert `parseFloat(sadFill.style.width)` is in `[60, 70]`.

---

## Regression Tests

No existing tests are affected. The `addMonths` extraction is a pure refactor; `ListHeader.tsx` will import from the new utility. The full test suite (`npm test`) is run as the regression guard.

---

## Security-Relevant Tests

Not applicable. This feature is read-only rendering of localStorage data; no auth, no API calls, no user-supplied HTML rendered unsanitised.

---

## Fixtures / Mocks Needed

| Item | Source | Notes |
|------|--------|-------|
| `mockRouter`, `mockUseRouter`, `resetNavigationMocks` | `src/lib/navigation/__tests__/setupNextNavigation.ts` | Already exists; no changes |
| Mutable `currentSearchParams` variable | Declared in test file | Same pattern as `ListScreen.test.tsx` |
| `useDiaries` mock | `vi.mock('@/lib/storage/useDiaries', …)` | Per-test `.mockReturnValue()` |
| `makeEntry(date, mood, text?)` factory | Inline in each test file | ~4 lines |
| `vi.useFakeTimers` / `vi.setSystemTime` | Vitest built-in | Not needed for SS1-SS10 because current month default is only used as initial state and tests that care about month use `?month=` param |

---

## Commands to Run

```bash
# Unit tests (isolated)
npm run test -- --reporter=verbose src/lib/utils/__tests__/addMonths.test.ts
npm run test -- --reporter=verbose src/app/stats/_components/__tests__/useMoodStats.test.ts
npm run test -- --reporter=verbose src/app/stats/__tests__/StatsScreen.test.tsx

# Full suite regression guard
npm test

# Type check
npm run typecheck
```

---

## Not Applicable Tests

- **API / HTTP tests**: no backend endpoints.
- **Database / migration tests**: localStorage schema unchanged.
- **E2E tests**: no multi-step user flow that integration tests cannot cover; stats screen has no submission or navigation side-effects beyond `router.back()`.
- **Performance tests**: O(n) in-memory aggregation on diary-scale data; no measurement needed.

---

## Verdict
PASS

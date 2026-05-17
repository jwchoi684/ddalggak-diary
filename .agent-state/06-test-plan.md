# Test Plan — REQ-006

## Summary

REQ-006 introduces the Next.js App Router routing shell: five page files, a Korean `not-found.tsx`, a type-safe `Routes` helper module, and a shared `vi.mock('next/navigation')` test helper. This plan covers all logic worth testing at the unit level across 4 test files (~20 `it()` cases total). Every Caller Invariant from the API contract is mapped to at least one test. E2E navigation behavior (history-stack back-routes, scroll restoration, modal history isolation) is deferred to Phase 13.

No new test dependencies are required. The project already has Vitest 2, `@testing-library/react`, and `happy-dom`.

---

## Runtime & Config

- **Default environment**: `node` (set in `vitest.config.ts`).
- **happy-dom opt-in**: files that render JSX must carry `// @vitest-environment happy-dom` on line 1, following the same convention as `Card.test.tsx`, `BottomSheet.test.tsx`, etc.
- **Path alias**: `@/` resolves to `src/` via `vitest.config.ts` — use in all imports.
- **Global `setupFiles`**: `src/lib/storage/__tests__/setup.ts` is auto-loaded; no new entry needed.
- **`setupNextNavigation.ts` is opt-in per file**: imported and `vi.mock`-ed explicitly at the top of each consuming test, matching the existing storage-shim model. It is NOT added to `setupFiles`.

---

## Unit Tests

### `src/lib/navigation/__tests__/routes.test.ts` (10 cases, node env)

No environment directive needed (default is `node`). No JSX, no DOM, no mocks.

```
describe('Routes — static path constants')
  it('Routes.calendar equals "/"')
  it('Routes.list equals "/list"')
  it('Routes.chat equals "/chat"')
  it('Routes.stats equals "/stats"')

describe('Routes.diary')
  it('Routes.diary("2026-05-17") returns "/diary/2026-05-17"')
  it('Routes.diary(date) always starts with "/diary/" and ends with the date argument unchanged')

describe('Routes.listWithFilter')
  it('empty params object {} returns exactly "/list" with no trailing "?"')
  it('{ month: "2026-04" } returns "/list?month=2026-04"')
  it('{ sort: "asc" } returns "/list?sort=asc"')
  it('{ month: "2026-04", sort: "desc" } returns "/list?month=2026-04&sort=desc" (month precedes sort)')
```

### `src/app/__tests__/diary-date-page.test.tsx` (4 cases, happy-dom)

Directive: `// @vitest-environment happy-dom` on line 1.

The async Server Component is invoked as a plain async function. The returned JSX is rendered with `@testing-library/react`. `notFound` is replaced by the shared helper so throws are catchable. `params` is passed as `Promise.resolve({ date })` to satisfy the Next.js 15 `Promise<{ date: string }>` type.

Mock setup at top of file:
```ts
import {
  mockNotFound, mockUseRouter, mockUseSearchParams,
  mockUseParams, mockUsePathname, resetNavigationMocks,
} from '@/lib/navigation/__tests__/setupNextNavigation';

vi.mock('next/navigation', () => ({
  useRouter:       () => mockUseRouter(),
  useSearchParams: () => mockUseSearchParams(),
  useParams:       () => mockUseParams(),
  usePathname:     () => mockUsePathname(),
  notFound:        mockNotFound,
}));
beforeEach(() => resetNavigationMocks());
```

```
describe('DiaryPage — date format guard')
  it('valid date "2026-05-17": renders heading containing the date; mockNotFound not called')
  it('invalid format "not-a-date": awaiting the page throws Error("NEXT_NOT_FOUND"); mockNotFound called once')
  it('slash-separated "2026/05/17": fails regex, awaiting throws Error("NEXT_NOT_FOUND"); mockNotFound called once')
  it('out-of-range month "2026-13-01": passes /^\d{4}-\d{2}-\d{2}$/, renders without calling notFound (semantic check deferred to REQ-009)')
```

Rendering strategy (cases 1 and 4):
```ts
const jsx = await DiaryPage({ params: Promise.resolve({ date }) });
render(jsx);
expect(screen.getByRole('heading')).toHaveTextContent(date);
expect(mockNotFound).not.toHaveBeenCalled();
```

Catching strategy (cases 2 and 3):
```ts
await expect(
  DiaryPage({ params: Promise.resolve({ date }) })
).rejects.toThrow('NEXT_NOT_FOUND');
expect(mockNotFound).toHaveBeenCalledTimes(1);
```

### `src/app/__tests__/not-found.test.tsx` (3 cases, happy-dom)

Directive: `// @vitest-environment happy-dom` on line 1.

No `next/navigation` mock needed — `NotFound` is a plain Server Component with no hooks or navigation imports.

```
describe('NotFound page')
  it('renders the Korean message "찾을 수 없는 페이지입니다."')
  it('renders an anchor with href="/" and text content "캘린더로 돌아가세요"')
  it('source-guard: src/app/not-found.tsx contains no "use client" directive')
```

Source-guard pattern follows existing `Card.test.tsx`:
```ts
const src = fs.readFileSync(
  path.resolve(process.cwd(), 'src/app/not-found.tsx'),
  'utf8',
);
expect(src).not.toContain('"use client"');
```

Anchor assertion:
```ts
const anchor = screen.getByRole('link', { name: '캘린더로 돌아가세요' });
expect(anchor.getAttribute('href')).toBe('/');
```

### `src/lib/navigation/__tests__/setupNextNavigation.test.ts` (3 cases, happy-dom)

Self-tests for the shared mock helper. Directive: `// @vitest-environment happy-dom` on line 1.

```
describe('setupNextNavigation helper')
  it('mockRouter.push is a callable vi.fn (mock.calls is an array)')
  it('mockNotFound() throws Error with message "NEXT_NOT_FOUND"')
  it('resetNavigationMocks() clears mockRouter.push call history AND re-applies the throw behavior on mockNotFound after a manual mockReset()')
```

Implementation notes:
- Case 1: call `mockRouter.push('/test')`; assert `Array.isArray(mockRouter.push.mock.calls)` and length is 1.
- Case 2: `expect(() => mockNotFound()).toThrow('NEXT_NOT_FOUND')`.
- Case 3: manually call `mockRouter.push('x')` to accumulate a call; call `mockNotFound.mockReset()` to clear its throw; then call `resetNavigationMocks()`; assert `mockRouter.push.mock.calls` is empty AND `expect(() => mockNotFound()).toThrow('NEXT_NOT_FOUND')`.

---

## Integration Tests

Not applicable. The `Routes` helper has no I/O. Page components are Server Components with no cross-module side effects beyond calling `notFound()`. No storage or network calls are introduced in this REQ.

---

## E2E Tests

Not applicable at this phase. Back-navigation routes (list→editor→back = list, AI chat citation→editor→back = AI chat), scroll restoration, and modal history isolation are deferred to Phase 13 (E2E). REQ-006 itself marks these as non-goals.

---

## Regression Tests

All existing test suites (`moods.test.ts`, `personas.test.ts`, `diaries.test.ts`, `conversations.test.ts`, `settings.test.ts`, all design-system tests) must continue to pass unchanged after REQ-006 files are added. Running `npm test` (which executes `vitest run`) exercises all suites together. `src/app/page.tsx` is explicitly unchanged per the technical design; its existing behavior is not retested here.

---

## Security-Relevant Tests

No security-sensitive logic in this REQ (no auth, no user data persisted, no API surface). The source-guard test on `not-found.tsx` (`"use client"` absent) prevents accidental inclusion of client-only hooks in a Server Component — a correctness boundary enforced by the test.

---

## Fixtures / Mocks Needed

- `src/lib/navigation/__tests__/setupNextNavigation.ts` — the shared mock helper (created by the implementation agent, consumed by two test files). This is a production-side utility, not a fixture.
- No additional fixtures. `routes.test.ts` needs no DOM or mocks. `not-found.test.tsx` needs no mocks.
- `node:fs` / `node:path` — used in `not-found.test.tsx` source-guard read; available in happy-dom env (Node.js runtime), same pattern as `Card.test.tsx`.

---

## Coverage Matrix

Maps each Caller Invariant from `04-api-contract.md` (§ "Caller Invariants", 1–10) to the covering test case(s).

| # | Invariant | Covered By |
|---|---|---|
| 1 | `Routes.calendar === '/'` | `routes.test.ts` — "Routes.calendar equals /" |
| 2 | `Routes.diary(date)` starts with `'/diary/'` and ends with `date` unchanged | `routes.test.ts` — two `Routes.diary` cases |
| 3 | `Routes.list === '/list'` | `routes.test.ts` — "Routes.list equals /list" |
| 4 | `Routes.listWithFilter({})` returns exactly `'/list'` (no trailing `?`) | `routes.test.ts` — "empty params returns /list" |
| 5 | `URLSearchParams` encoding; `month` always precedes `sort` | `routes.test.ts` — "month=2026-04&sort=desc" and single-param cases |
| 6 | `Routes.chat === '/chat'` | `routes.test.ts` — "Routes.chat equals /chat" |
| 7 | `Routes.stats === '/stats'` | `routes.test.ts` — "Routes.stats equals /stats" |
| 8 | No REQ-006 page file contains `"use client"` | `not-found.test.tsx` source-guard; diary page guard covered by `npm run typecheck` + `npm run build` |
| 9 | `mockRouter` is the same object reference returned by `mockUseRouter()` | `setupNextNavigation.test.ts` — mockRouter.push is callable vi.fn |
| 10 | `resetNavigationMocks()` is idempotent; safe in any `beforeEach` | `setupNextNavigation.test.ts` — reset clears calls and re-applies throw |

---

## Commands to Run

```bash
# Type-check all files including new test files
npm run typecheck

# Lint
npm run lint

# Full test suite (includes all existing + new REQ-006 files)
npm test

# Build check: validates Next.js can statically prerender all five placeholder pages
npm run build
```

Targeted run for REQ-006 files only (useful during implementation):
```bash
npx vitest run \
  src/lib/navigation/__tests__/routes.test.ts \
  src/lib/navigation/__tests__/setupNextNavigation.test.ts \
  src/app/__tests__/diary-date-page.test.tsx \
  src/app/__tests__/not-found.test.tsx
```

---

## Not Applicable Tests

| Category | Reason |
|---|---|
| Placeholder page content for `/`, `/list`, `/chat`, `/stats` | Trivial JSX with no logic; validated by `npm run build` static prerender, not unit tests |
| E2E navigation (back-routes, scroll restore, modal history) | Deferred to Phase 13; REQ-006 marks these as non-goals |
| Semantic date validation (Feb 31, month > 12 semantics) | Explicitly deferred to REQ-009; case 4 of `diary-date-page.test.tsx` documents this boundary |
| Visual regression / screenshots | No Playwright or snapshot framework in project |
| SSR rendering environment | Next.js SSR env not available in Vitest; structural correctness covered by `npm run build` |
| Security / auth | No auth, no stored user data, no API surface in this REQ |

---

## Verdict
PASS

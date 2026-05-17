# Code Review — REQ-006

## Summary

REQ-006 introduces the Next.js App Router routing shell: seven production files (routes helper, barrel, 5 page stubs including not-found) and four test files (20 `it()` cases). All files new; no existing source modified. Implementation tracks contract + test plan closely. 151/151 tests pass. No blocking issues.

---

## Files Reviewed

| File | Lines | Role |
|---|---|---|
| `src/lib/navigation/routes.ts` | 40 | `Routes` object |
| `src/lib/navigation/index.ts` | 6 | Barrel |
| `src/lib/navigation/__tests__/setupNextNavigation.ts` | 31 | Shared mock helper |
| `src/lib/navigation/__tests__/routes.test.ts` | 51 | 10 cases |
| `src/lib/navigation/__tests__/setupNextNavigation.test.ts` | 29 | 3 cases |
| `src/app/not-found.tsx` | 17 | Korean 404 |
| `src/app/diary/[date]/page.tsx` | 17 | Async Server, date guard |
| `src/app/list/page.tsx` | 8 | Placeholder |
| `src/app/chat/page.tsx` | 8 | Placeholder |
| `src/app/stats/page.tsx` | 8 | Placeholder |
| `src/app/__tests__/diary-date-page.test.tsx` | 62 | 4 cases |
| `src/app/__tests__/not-found.test.tsx` | 30 | 3 cases |

---

## Verdict
PASS

---

## Contract Conformance

All 10 Caller Invariants from `04-api-contract.md` satisfied:

1. `Routes.calendar` = `'/' as const` ✓
2. `Routes.diary(date)` returns `` `/diary/${date}` `` ✓
3. `Routes.list` = `'/list' as const` ✓
4. `Routes.listWithFilter({})` returns `'/list'` (no trailing `?`) via `qs ? ... : '/list'` branch ✓
5. `URLSearchParams` used; `month` set before `sort` ✓
6. `Routes.chat` = `'/chat' as const` ✓
7. `Routes.stats` = `'/stats' as const` ✓
8. Zero `"use client"` in any page file (grep confirmed) ✓
9. `mockUseRouter()` returns module-level `mockRouter` by reference ✓
10. `resetNavigationMocks()` calls `mockReset()` on 6 router fns + re-applies throw on `mockNotFound` — idempotent ✓

Route contracts: all 5 paths + not-found at correct handler files, Server Component classification. `/diary/[date]` uses `async` + `await params` (Next.js 15 pattern). Regex `/^\d{4}-\d{2}-\d{2}$/` exact match to contract. `setupNextNavigation` exports verbatim.

---

## Invariant Correctness

`notFound()` called without `return` (correct — throws never-returns):
```ts
if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) notFound();
```
Type system relies on Next.js's `notFound: () => never` annotation. Build passes.

`listWithFilter` treats `month: ''` as absent (falsy check). Correct per contract ("omit to leave unset").

---

## CLAUDE.md Compliance

All files well under 100 lines. Single responsibility per file. Korean for all user-facing strings (`찾을 수 없는 페이지입니다.`, `캘린더로 돌아가세요`, `일기 리스트`, `AI 채팅`, `통계`). REQ-009/013/014/015 attribution comments in placeholder pages.

Navigation barrel (`index.ts`) is appropriate for `src/lib/navigation/` and mirrors `src/lib/storage/index.ts` convention. The CLAUDE.md no-barrel rule was specific to `src/design-system/` (REQ-005 decision).

---

## Type Safety

No `as any` anywhere. `as const` used correctly on Routes object + properties. `setupNextNavigation` mock fns return concrete types without casts.

---

## Test Quality

20/20 plan cases present. Assertions specific (`toBe`, `toHaveBeenCalledTimes(1)`).

`routes.test.ts` imports via barrel (`@/lib/navigation`), validating re-export.

`diary-date-page.test.tsx` uses top-level `await import` after `vi.mock` — correct Vitest ESM hoisting pattern. Four cases cover regex pass/fail/slashes/out-of-range boundary. `afterEach(cleanup)` prevents DOM accumulation.

`not-found.test.tsx` `getByRole('link', { name: '...' })` covers both ARIA role + Korean text. Source-guard via `fs.readFileSync` pattern matches REQ-005.

`setupNextNavigation.test.ts` self-tests cover: vi.fn call recording, throw behavior, idempotent reset after `mockReset()`.

---

## Backward Compatibility

`src/app/page.tsx`, `layout.tsx`, `globals.css`, `next.config.ts`, `package.json`, and pre-existing source under `src/lib/` + `src/design-system/` are untouched. Git diff shows only new files. 131 baseline tests continue to pass.

---

## Architecture Consistency

Navigation module follows storage conventions: barrel export, opt-in test helpers (not in global `setupFiles`), same `@/` alias. Mock helper pattern mirrors `storage/setup.ts`.

`/list`, `/chat`, `/stats` placeholder pages omit `import React from 'react'`; `not-found.tsx` and `diary/[date]/page.tsx` include it. Intentional: the latter two are consumed by test files that use Vitest's JSX transform. Next.js build handles JSX automatically for all.

Build output: `/diary/[date]` shown as `ƒ` (dynamic), others as `○` (static) — confirms async component signature triggers correct rendering mode.

---

## Non-Blocking Suggestions

1. **`setupNextNavigation.test.ts` lacks `beforeEach(resetNavigationMocks)`**: each case cleans up manually. Future maintainer adding a 4th case might forget. Add `beforeEach(() => resetNavigationMocks())` for self-consistency.
2. **No source-guard test for `diary/[date]/page.tsx`** absence of `"use client"`. Build + typecheck enforce indirectly. A matching source-guard would make the invariant explicit at test level.
3. **`mockNotFound` call-count assertion after throw** (cases 2/3) is mildly redundant — if not called, Promise wouldn't reject with `NEXT_NOT_FOUND`. Harmless, adds debug signal; keep.

## Nits

- `routes.ts` line 30: trailing whitespace for alignment. Style only.
- `not-found.tsx` line 13: period `.` outside the `<a>` tag — produces `... 캘린더로 돌아가세요.` visually. Intentional punctuation.

---

## Positive Notes

- `as const` on outer `Routes` object gives literal types on all constant properties without per-property assertions.
- `URLSearchParams` for query construction — correct percent-encoding, deterministic order.
- `// @vitest-environment happy-dom` on `setupNextNavigation.test.ts` is unnecessary (pure module) but follows the plan exactly.
- Placeholder pages exactly 8 lines, no imports — minimal merge-conflict surface.
- Build output confirms correct dynamic vs static classification.

---

## Blocking Issues

None.

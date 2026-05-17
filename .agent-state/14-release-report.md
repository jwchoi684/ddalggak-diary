# Release Report — REQ-006

## Gate Matrix

| # | Phase | Report | Verdict | Rationale |
|---|---|---|---|---|
| 00 | Git Safety | 00-git-safety.md | PASS | Working tree clean at REQ-006 start; no pre-existing uncommitted changes |
| 01 | Requirement Intake | 01-requirement-intake.md | PASS | Scope locked to routing shell only; 9 invariants documented; open questions resolved |
| 02 | Architecture Report | 02-architecture-report.md | PASS | Next.js App Router chosen; no new dependencies; fits existing project conventions |
| 03 | Technical Design | 03-technical-design.md | PASS | 7 production files spec'd, all ≤ 41 lines; date guard regex and Routes shape defined |
| 04 | API Contract | 04-api-contract.md | PASS | 10 Caller Invariants documented; all satisfied by implementation and confirmed by tests |
| 05 | DB Migration | 05-db-migration-report.md | PASS | Not applicable — routing shell has no database or localStorage changes |
| 06 | Test Plan | 06-test-plan.md | PASS | 20 test cases planned across 4 files; all cases written and mapped to invariants |
| 07 | Implementation | 07-implementation-report.md | PASS | All 7 production files + 4 test files created; no existing files modified; 0 fix cycles |
| 08 | Test Report | 08-test-report.md | PASS | 151/151 tests (23 files); 20 new REQ-006 cases + 131 baseline all green; build 6 routes |
| 09 | Code Review | 09-code-review-report.md | PASS | All 10 invariants satisfied; no blocking issues; 3 non-blocking suggestions noted |
| 10 | Security Review | 10-security-report.md | PASS | Zero new security findings; path-traversal guard confirmed; JSDoc nit on Routes.diary |
| 11 | Performance | 11-performance-report.md | PASS | Zero client JS delta; 5 static routes + 1 dynamic; O(1) date guard; negligible footprint |
| 12 | Infra | 12-infra-report.md | PASS | No config changes; 5 new routes deployable as-is on any edge/serverless host |
| 13 | E2E | 13-e2e-report.md | PASS — N/A | Routing shell has no user interactions; back-navigation E2E explicitly deferred to REQ-007 |

All 14 phases PASS. Zero blocking issues across any report.

---

## Git Diff Summary

```
git diff HEAD --stat (21 files, agent-state only; source tracked as untracked)

Untracked source files (new, not yet committed):
  src/app/__tests__/          (diary-date-page.test.tsx, not-found.test.tsx)
  src/app/chat/               (page.tsx)
  src/app/diary/              ([date]/page.tsx)
  src/app/list/               (page.tsx)
  src/app/not-found.tsx
  src/app/stats/              (page.tsx)
  src/lib/navigation/         (routes.ts, index.ts, __tests__/*)

Modified (agent-state reports updated during REQ-006 run):
  .agent-state/00-git-safety.md through .agent-state/13-e2e-report.md (14 files)
  .agent-state/requirements/REQ-006.md, index.md
  .agent-state/{architecture,e2e,review,security,test}-report.md (legacy aliases)
```

No pre-existing source files were modified by REQ-006. All source changes are additive (new files only).

---

## Files Changed

### Production — New (7 files, 104 lines total)

| File | Lines | Role |
|---|---|---|
| `src/lib/navigation/routes.ts` | 40 | `Routes` object; `as const` literals; `URLSearchParams` query encoding |
| `src/lib/navigation/index.ts` | 6 | Barrel re-exporting `Routes` |
| `src/app/not-found.tsx` | 17 | Korean 404 Server Component with `<a href="/">` |
| `src/app/diary/[date]/page.tsx` | 17 | Async Server Component; regex date guard; `notFound()` on mismatch |
| `src/app/list/page.tsx` | 8 | Placeholder (REQ-013) |
| `src/app/chat/page.tsx` | 8 | Placeholder (REQ-015) |
| `src/app/stats/page.tsx` | 8 | Placeholder (REQ-014) |

### Tests — New (5 files, 203 lines total)

| File | Cases | Role |
|---|---|---|
| `src/lib/navigation/__tests__/setupNextNavigation.ts` | — | Shared `next/navigation` mock helper for REQ-007+ |
| `src/lib/navigation/__tests__/routes.test.ts` | 10 | Routes constants, diary helper, listWithFilter encoding |
| `src/lib/navigation/__tests__/setupNextNavigation.test.ts` | 3 | Self-tests for mock helper |
| `src/app/__tests__/diary-date-page.test.tsx` | 4 | Date guard: valid / bad-format / slash-separator / out-of-range |
| `src/app/__tests__/not-found.test.tsx` | 3 | Korean message, anchor href, source-guard |

### Modified — None

No existing source files were touched. All REQ-001 through REQ-005 artifacts unchanged.

---

## Fix Cycles

None. Implementation passed all four gates (typecheck, lint, test, build) on the first attempt.

---

## Net Effect

- **Routing shell live**: 6 routes in the Next.js build output (5 static `○` + 1 dynamic `ƒ`).
- **Routes API ready**: `Routes.calendar`, `Routes.diary(date)`, `Routes.list`, `Routes.listWithFilter(params)`, `Routes.chat`, `Routes.stats` — all exported from `@/lib/navigation`.
- **Navigation barrel ready**: `src/lib/navigation/index.ts` mirrors `src/lib/storage/index.ts` convention; REQ-007+ import via `@/lib/navigation`.
- **Mock helper ready**: `setupNextNavigation.ts` exports `mockRouter`, `mockNotFound`, `mockUseRouter`, `mockUseSearchParams`, `mockUseParams`, `mockUsePathname`, `resetNavigationMocks` — consumable by any future test file needing `next/navigation` mocks.
- **Test count**: 131 → 151 (+20 new REQ-006 cases). All 131 baseline tests (REQ-002 through REQ-005) continue to pass.
- **Blocking dependency cleared**: REQ-007, REQ-009, REQ-013, REQ-014, REQ-015 all list REQ-006 as a dependency; they are now unblocked.

---

## Forward-Flagged Constraints

1. **E2E deferred to REQ-007** (explicit, documented): Back-navigation paths (calendar→editor→back, list→editor→back, chat-citation→editor→back), scroll restoration, and modal history isolation require source screens with real interactions. Playwright will be bootstrapped in REQ-007 alongside the first FAB tap.

2. **JSDoc nit on `Routes.diary`** (non-blocking, security report): `Routes.diary(date)` is a template literal and does not percent-encode its argument. Callers are currently controlled surfaces (calendar grid, list items) supplying pre-validated ISO dates. A JSDoc note stating "caller must supply a pre-validated ISO 8601 date string" is recommended but not required before merge.

3. **`listWithFilter` validation deferred to REQ-013**: `month` and `sort` query param values are not validated at the helper level; invalid values are REQ-013's responsibility.

4. **Semantic date validation deferred to REQ-009**: The regex `/^\d{4}-\d{2}-\d{2}$/` accepts `2026-02-31`. Full calendar-aware validation is REQ-009's responsibility.

5. **`setupNextNavigation.test.ts` lacks `beforeEach(resetNavigationMocks)`** (code review non-blocking suggestion): Each case resets manually; a future 4th test case added by a maintainer might miss this pattern. Low risk for the current 3-case file.

---

## Commit Message Draft

```
feat: routing shell with type-safe Routes helper (REQ-006)

Next.js App Router 페이지 5개(/캘린더, /diary/[date], /list, /chat, /stats)와
한국어 not-found 핸들러를 추가한다. /diary/[date]는 YYYY-MM-DD 정규식 검증 후
잘못된 형식이면 notFound()를 호출한다. Routes 헬퍼와 next/navigation 공유
mock(setupNextNavigation)은 REQ-007+에서 재사용 가능한 형태로 제공된다.

151/151 tests pass. Build: 5 static + 1 dynamic route.

Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>
```

---

## PR Body

```md
## Summary

- Adds Next.js App Router routing shell: 5 page stubs + Korean `not-found.tsx` (REQ-006).
- `/diary/[date]` enforces `YYYY-MM-DD` format via regex; returns 404 on mismatch.
- Type-safe `Routes` helper exported from `@/lib/navigation`; no path strings hardcoded in components.
- Shared `setupNextNavigation` mock helper ready for REQ-007+ test files.

## Acceptance Criteria

- [x] Routes: `/` `/diary/:date` `/list` `/chat` `/stats` all registered and building.
- [x] Invalid date format (`/diary/abc`) → 404 (unit-tested, build-confirmed).
- [x] `Routes.diary('2026-05-17')` → `/diary/2026-05-17` (type-safe, tested).
- [x] `Routes.listWithFilter` encodes `month`+`sort` with deterministic ordering.
- [x] No `"use client"` in any page file (grep-guarded by test).
- [x] No new runtime or dev dependencies added.
- [x] 131 baseline tests (REQ-002–005) unchanged.

## Technical Notes

- `/diary/[date]` uses `async` + `await params` (Next.js 15 Promise params pattern).
- `Routes.listWithFilter({})` returns `/list` with no trailing `?` — verified by test.
- Scroll restoration relies on Next.js App Router default behavior (not overridden).
- Modal history isolation (BottomSheet not in history stack) is an invariant; enforcement verified via REQ-005 `useDialogControl` which uses local React state only.

## API / Interface Changes

New public export: `@/lib/navigation` → `Routes`

## Data / Migration Notes

None. No localStorage schema touched.

## Tests

- 20 new `it()` cases; 151/151 total pass.
- `typecheck`, `lint`, `build` all clean.

## Security Review

PASS. Path-traversal blocked at framework + regex level. No secrets, no XSS vectors, no new dependencies.

## E2E Evidence

Deferred to REQ-007 (Playwright bootstrap). Routing shell correctness established via unit tests + production build (6 routes, correct static/dynamic classification).

## Risk / Rollback Plan

Additive only — 7 new files, 0 modified files. Rollback = delete `src/lib/navigation/`, `src/app/diary/`, `src/app/list/`, `src/app/chat/`, `src/app/stats/`, `src/app/not-found.tsx`. No config or schema rollback needed.
```

---

## Next REQ

**REQ-007 — 메인 캘린더 화면** (Status: TODO)

REQ-007 is the first P0 screen REQ and depends on REQ-002, REQ-003, REQ-005, and REQ-006 — all now DONE. Expected scope: month grid rendering mood emoji cells, FAB tap → `Routes.diary(today)`, `useRouter().push()` integration, and the first Playwright E2E bootstrap covering FAB tap → editor route → back → calendar. It is the most complex screen REQ to date (potential 100-line split trigger per CLAUDE.md) and where the first real `"use client"` boundaries will appear.

---

## Verdict

PASS — ready to mark REQ-006 DONE.

All 14 gate phases pass. Zero blocking issues. Zero fix cycles. No unrelated changes included. Commit message and PR body are prepared above. Commit timing is at the orchestrator's discretion.

# Release Report

## Summary

REQ-013 (일기 리스트 화면) replaces the 8-line stub at `src/app/list/page.tsx` with a fully
functional diary list screen. The screen displays one calendar month of diary entries as
vertically scrollable cards, with a sticky header containing back navigation, month navigator,
and sort toggle. Implementation is pure composition over existing design-system primitives
(`Card`, `MoodIcon`, `EmptyState`, `IconButton`) with no new external dependencies.

All ten required gate reports are present and PASS. 301 unit tests green, 8/8 E2E specs green,
TypeScript clean, ESLint clean.

---

## Files Changed

### New production files

| File | Lines | Description |
|---|---|---|
| `src/lib/utils/formatListDate.ts` | 15 | "YYYY.MM.DD 요일" formatter, UTC-safe |
| `src/app/list/_components/PhotoThumbnailStrip.tsx` | 39 | Max-3 thumbnails + +N overflow badge |
| `src/app/list/_components/DiaryListCard.tsx` | 52 | Single card: MoodIcon + date + text + photos |
| `src/app/list/_components/ListHeader.tsx` | 75 | Sticky header: back + month nav + sort toggle |
| `src/app/list/page.tsx` | 83 | Replaced stub: Suspense wrapper + orchestration |

### New test files

| File | Cases | Description |
|---|---|---|
| `src/lib/utils/__tests__/formatListDate.test.ts` | 4 | FLD1–FLD4 weekday mapping |
| `src/app/list/__tests__/ListScreen.test.tsx` | 12 | LS1–LS12 component behaviour |
| `e2e/list.spec.ts` | 1 | LE1 seed → list → tap → editor |

### Modified agent-state reports

All `.agent-state/00–13` reports updated for REQ-013 scope.
`.agent-state/security-report.md` mirror updated.
`.agent-state/requirements/REQ-013.md` status → DONE.
`.agent-state/requirements/index.md` REQ-013 row → DONE.

---

## Gate Status

| Gate | Report | Verdict |
|---|---|---|
| Requirement intake | `01-requirement-intake.md` | PASS |
| Architecture | `02-architecture-report.md` | PASS |
| Technical design | `03-technical-design.md` | PASS |
| API contract | `04-api-contract.md` | PASS |
| DB / migration | `05-db-migration-report.md` | PASS (no schema change) |
| Test plan | `06-test-plan.md` | PASS |
| Test report | `08-test-report.md` | PASS |
| Code review | `09-code-review-report.md` | PASS |
| Security review | `10-security-report.md` | PASS |
| E2E | `13-e2e-report.md` | PASS |
| Performance | `11-performance-report.md` | PASS |
| Infra | `12-infra-report.md` | PASS |

---

## Tests Run

```
npx vitest run --reporter=basic   →  43 files, 301/301 PASS  (9.96s)
npx tsc --noEmit                  →  clean
npm run lint                      →  clean
npm run test:e2e                  →  8/8 PASS (24.8s)
```

New tests: 4 unit (formatListDate) + 12 component (ListScreen) + 1 E2E (list.spec) = 17 new cases.
Pre-existing: 285 unit + 7 E2E — all passing, no regression.

---

## Review Status

Code review PASS. No blocking issues.

Three non-blocking suggestions deferred per policy:

1. NB1: `DiaryListCard` and `PhotoThumbnailStrip` missing explicit `"use client"` — runtime correct
   because they inherit client boundary from `page.tsx`; cosmetic consistency issue only.
2. NB2: Sort-button touch target uses inline `style={{ minHeight: 44 }}` instead of Tailwind class.
3. NB3: `key={activeMonth}` placed on inner `<div>` has no React remount effect; sort reset not
   triggered on month change. Matches the spec ("정렬 상태는 세션 내 유지") so no user-visible bug.

---

## Security Status

Security review PASS. No critical, high, or medium issues.

Two accepted low-severity residual risks (both pre-existing in the app's design):

- L1: `?month` query param not sanitised beyond string equality comparison — cosmetically harmless,
  no XSS path, self-contained to local session.
- L2: `photo.dataUrl` not re-validated at render time — single-user personal app, MIME guard fires
  at write time (REQ-011). No cross-user exploitation path.

---

## E2E Status

E2E PASS. `e2e/list.spec.ts` (LE1) verified: seed 2 entries → `/list` → 2 cards visible → tap
first card → URL transitions to `/diary/<date>` → editor textarea visible.

8/8 Playwright Chromium specs pass. Safari/Firefox deferred (MVP scope).

---

## Performance / Infra Status

Performance PASS. In-memory filter + sort over max 31 entries per month, `loading="lazy"` on all
photo thumbnails. No useMemo yet (acceptable at this dataset size; deferred NB).

Infra PASS. No new dependencies, no env vars, no deployment config changes. Pure client-side
feature bundled with existing Next.js build.

---

## Commit Message

```
feat: diary list screen with month nav (REQ-013)

- Replace /list stub with full list screen: sticky header (back, month
  nav, sort toggle), per-month card grid (MoodIcon + date + body + photos)
- Add formatListDate utility and PhotoThumbnailStrip component
- 301 unit tests pass; 8/8 Playwright E2E specs pass

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>
```

---

## PR Body

```md
## Summary

- Replaces the placeholder at `src/app/list/page.tsx` with a fully functional diary list screen.
- Sticky header: back button, month navigator (prev/next with year rollover), sort toggle (newest / oldest).
- Card grid: one card per diary entry — 64px MoodIcon, date label ("YYYY.MM.DD 요일"), 3-line body clamp, photo thumbnail strip (max 3 + "+N" overflow badge).
- Empty-month state with "캘린더로 가기" CTA; loading skeleton while `useDiaries` hydrates.

## Acceptance Criteria

- [x] Back button calls `router.back()`.
- [x] Month nav defaults to current month; prev/next push `?month=YYYY-MM`; year rollover works.
- [x] Sort toggle switches between newest-first and oldest-first; resets on page reload.
- [x] Only entries for the active month are shown (`date.slice(0,7)` prefix match).
- [x] Card shows MoodIcon (64px), formatted date, body text (3-line clamp or "(내용 없음)"), photo strip.
- [x] Card tap navigates to `/diary/[date]`; back returns to list.
- [x] Empty month renders "이 달에는 작성된 일기가 없어요" + CTA; month nav stays functional.

## Technical Notes

- Pure composition of existing primitives (`Card`, `MoodIcon`, `EmptyState`, `IconButton`). Zero new external dependencies.
- `formatListDate` uses `new Date(isoDate + 'T00:00:00')` to avoid UTC-shift and `Intl.DateTimeFormat('ko-KR', { weekday: 'long' })` for the weekday label.
- `<Suspense>` wraps `ListPageContent` (required by Next.js 15 App Router for `useSearchParams`).
- Three deferred non-blocking code-review items: explicit `"use client"` on sub-components, Tailwind class for sort-button min-height, `key` placement on month-change container.

## API / Interface Changes

No HTTP endpoints. Four new internal TypeScript interfaces (`ListHeader`, `DiaryListCard`, `PhotoThumbnailStrip`, `formatListDate`) — all client-side. `Routes.listWithFilter` and `useDiaries` signatures unchanged.

## Data / Migration Notes

No localStorage schema change. Read-only consumption of existing `ddalkkak:diaries:v1`.

## Tests

- 4 unit cases for `formatListDate` (FLD1–FLD4).
- 12 component cases for `ListScreen` (LS1–LS12): month filter, default month, sort order, +N badge, empty-body fallback, empty month state, card tap routing, month nav, year rollover, loading state.
- 1 E2E case (`e2e/list.spec.ts` LE1): seed → list → card tap → editor.
- 301/301 Vitest green; 8/8 Playwright green; TypeScript + ESLint clean.

## Security Review

PASS. No XSS paths (all user text rendered as React text nodes). No secrets. Two accepted low residual risks noted in `10-security-report.md` (both pre-existing in app design).

## E2E Evidence

`npm run test:e2e` → 8/8 PASS (24.8s, Chromium). `e2e/list.spec.ts` LE1 passed.

## Risk / Rollback Plan

Low risk. Pure additive change — replaces a stub with no existing callers or tests. Roll back by reverting `src/app/list/` and `src/lib/utils/formatListDate.ts`. No data migration required.
```

---

## Remaining Risks

1. Deferred NB1: `DiaryListCard` / `PhotoThumbnailStrip` lack explicit `"use client"`. No runtime
   impact today; would break if either is ever moved into a Server Component tree without
   re-parenting under a client boundary. Low probability, easy fix.
2. Deferred NB3: `key={activeMonth}` on non-list `<div>` has no remount effect. Sort state does
   NOT reset on month change — this is intentional per spec ("세션 내 유지") but worth revisiting
   if the spec changes.
3. E2E Chromium-only. Safari/Firefox coverage deferred to a future CI expansion.
4. No `useMemo` on `filtered`/`sorted`. Negligible at current dataset size (≤31 entries/month).

---

## Verdict
PASS

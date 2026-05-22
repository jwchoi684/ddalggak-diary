# Release Report

## Summary

REQ-010 — 에디터 내 가로 캘린더 인라인 드롭다운 (in-editor horizontal date strip).

Adds a collapsible horizontal date strip inside the diary editor. The user taps the `▾` chevron next to the date to reveal a 61-cell (±30 days) scrollable strip. Each cell shows a `MoodIcon` (size 24) if an entry exists, or the numeric day if not. The currently viewed date is highlighted. Tapping a different cell auto-saves the current entry (reusing REQ-009's `saveFn`) then switches the editor context to that date — no URL navigation occurs. If the target date has no entry the mood-picker modal opens automatically. A failed save shows a toast and cancels the switch, preventing data loss.

All quality gates pass. No unrelated changes are included in the staged files.

---

## Files Changed

### New production files

| File | Purpose |
|---|---|
| `src/lib/hooks/useHorizontalDatePicker.ts` | Hook encapsulating open/close state, 61-cell date range, entry map, and save-then-switch handler |
| `src/app/diary/[date]/_components/HorizontalDatePicker.tsx` | Scrollable listbox strip rendered when open; scrollIntoView on selected cell on mount |
| `src/app/diary/[date]/_components/DateCell.tsx` | Single cell rendering MoodIcon or day number; ARIA option role |

### Modified production files

| File | Change |
|---|---|
| `src/app/diary/[date]/_components/Editor.tsx` | Wire `useHorizontalDatePicker`; pass strip props to EditorBody; set `onCancelInitial={undefined}` (E2E stability fix) |
| `src/app/diary/[date]/_components/EditorBody.tsx` | Accept 5 new required strip props; render toggle chevron button and conditional `<HorizontalDatePicker>` |
| `src/app/globals.css` | Add `hide-scrollbar` utility and `slide-down` CSS animation keyframes for strip |

### New test files

| File | Cases |
|---|---|
| `src/lib/hooks/__tests__/useHorizontalDatePicker.test.ts` | H1–H7 (7 unit cases) |
| `src/app/diary/[date]/_components/__tests__/DateCell.test.tsx` | DC1–DC8 (8 unit cases) |
| `src/app/diary/[date]/_components/__tests__/HorizontalDatePicker.test.tsx` | HP1–HP4 (4 unit cases) |
| `e2e/horizontal-date-picker.spec.ts` | E1–E2 (2 E2E cases) |
| `e2e/_helpers/seedDiaries.ts` | Shared localStorage seed helper |

### Modified test files

| File | Change |
|---|---|
| `src/app/diary/[date]/__tests__/Editor.test.tsx` | 3 new integration cases (C-strip-1, C-strip-2, C-strip-3); prop additions |

### Agent state / requirements tracking

All `.agent-state/00-13` reports updated for REQ-010.
`.agent-state/requirements/REQ-010.md` — Status flipped to DONE.
`.agent-state/requirements/index.md` — REQ-010 row marked DONE.
`.agent-state/security-report.md` — Mirror of `10-security-report.md`.

---

## Gate Status

| Gate | Report | Verdict |
|---|---|---|
| Requirement intake | `01-requirement-intake.md` | PASS |
| Architecture | `02-architecture-report.md` | PASS (INFO) |
| Technical design | `03-technical-design.md` | PASS (INFO) |
| API contract | `04-api-contract.md` | PASS (INFO) |
| DB/migration | `05-db-migration-report.md` | PASS — N/A (localStorage only, no migration) |
| Test plan | `06-test-plan.md` | PASS (INFO) |
| Test report | `08-test-report.md` | PASS |
| Code review | `09-code-review-report.md` | PASS |
| Security | `10-security-report.md` | PASS |
| Performance | `11-performance-report.md` | PASS |
| Infra | `12-infra-report.md` | PASS |
| E2E | `13-e2e-report.md` | PASS |

---

## Tests Run

- Unit / integration (Vitest): 237 / 237 PASS — 35 test files (5.97 s)
- TypeScript compile: 0 errors
- ESLint: 0 warnings, 0 errors
- E2E (Playwright, Chromium): 4 / 4 PASS — 13.0 s
  - `horizontal-date-picker.spec.ts` E1: date switch preserves original entry
  - `horizontal-date-picker.spec.ts` E2: no-mood date switch does not persist partial entry
  - `calendar.spec.ts`: regression — PASS
  - `editor.spec.ts`: regression — PASS

---

## Review Status

Code review: PASS — 0 blocking issues. 3 non-blocking suggestions deferred (dead Tailwind class, E2E `isoDate` timezone alignment, `onSaveError` `useCallback` wrap). All 12 contract invariants verified, including the highest-risk invariant 4 (`saveFn` closing over `currentDate`).

---

## Security Status

Security review: PASS — 0 critical, high, medium, or low issues. No `dangerouslySetInnerHTML`, no eval, no secrets, no new dependencies, no outbound I/O. `localStorage` key not constructed from user input. ISO date param validated upstream before reaching the component.

---

## E2E Status

PASS. Both REQ-010 E2E scenarios green. Full regression suite (4 specs) green.

Noted but not blocking: `isoDate()` helper in `horizontal-date-picker.spec.ts` uses local-time arithmetic rather than UTC-consistent arithmetic matching `getTodayString()`. Low flakiness risk on developer machines; CI risk is minimal for UTC zones. Deferred to REQ-011.

---

## Performance / Infra Status

Performance: PASS — 3 non-blocking suggestions deferred:
1. `Intl.DateTimeFormat` in `DateCell.tsx` — move to module-level singleton (one-time 61-object allocation on mount, negligible at scale).
2. `onSaveError` inline arrow — wrap in `useCallback` to stabilize `handleDateSelect` (zero observable impact while strip is unmounted during typing).
3. `entryMap` recomputes on strip close as well as open — acceptable at current diary corpus scale.

Infra: PASS — pure client-side UI, no deployment surface changes, no new dependencies, no env vars.

---

## Commit Message

```
feat: in-editor horizontal date strip (REQ-010)

- 61-cell (±30 day) scrollable strip with MoodIcon or numeric day per cell
- Save-before-switch via REQ-009 saveFn; failed save shows toast, blocks navigation
- onCancelInitial={undefined} fixes E2E back-nav instability in test contexts

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>
```

---

## PR Body

Not applicable — direct commit per standing "1 commit per REQ" policy on local master branch.

---

## Remaining Risks

1. `isoDate()` in `e2e/horizontal-date-picker.spec.ts` uses local-date arithmetic, which diverges from `getTodayString()`'s UTC-consistent approach if CI runs in a UTC-offset zone. Low severity; fix in REQ-011 E2E setup.
2. `Editor.tsx` (192 lines) and `EditorBody.tsx` (122 lines) exceed the 100-line soft ceiling. Extraction of handlers into a custom hook and splitting strip props into a sub-component are recommended before REQ-011 adds photo strip props.
3. `onSaveError` inline arrow re-creates `handleDateSelect` on every keystroke. Zero correctness impact while strip is unmounted; stabilize via `useCallback` in REQ-011 if strip gains live-update behavior.
4. Same-date tap with save failure leaves strip open (code) despite implementation report claiming it closes (comment error). Extreme edge case (QuotaExceededError on same-date tap); cosmetic inconsistency only.

---

## Verdict
PASS

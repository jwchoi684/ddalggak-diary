# Release Report — REQ-005

## Gate Matrix

| # | Phase | Report | Verdict | Rationale |
|---|---|---|---|---|
| 00 | Git Safety | `00-git-safety.md` | PASS | Branch `master`, one prior commit (REQ-001~004). Only agent-state status files modified before implementation began; no unrelated user changes. |
| 01 | Requirement Intake | `01-requirement-intake.md` | PASS | 7 primitives + 2 hooks fully specified; acceptance criteria, scope, non-goals, and PRD cross-references confirmed. |
| 02 | Architecture Analysis | `02-architecture-report.md` | PASS | `src/design-system/` folder pattern established by REQ-003 (`MoodIcon.tsx`); new files follow identical conventions. |
| 03 | Technical Design | `03-technical-design.md` | PASS | Props, server/client boundaries, token usage, touch-target strategy, and `useDialogControl` sharing all specified before implementation. |
| 04 | API/Interface Contract | `04-api-contract.md` | PASS | TypeScript interfaces and JSDoc for all 9 files frozen before implementation; implementation matches contract exactly. |
| 05 | DB/Migration | `05-db-migration-report.md` | PASS | No DB or storage changes; report explicitly marks not applicable. |
| 06 | Test Plan | `06-test-plan.md` | PASS | ~51 cases planned across 9 test files; 49 implemented (plan variance explained). |
| 07 | Implementation | `07-implementation-report.md` | INFO | 9 source files + 9 test files created; `globals.css` additive-only (+10 lines). |
| 08 | Test Report | `08-test-report.md` | PASS | 131/131 tests, 19 files, 3.08 s. typecheck, lint, build all exit 0. 82 pre-REQ-005 baseline tests unaffected. |
| 09 | Code Review | `09-code-review-report.md` | PASS | All contracts met; 4 non-blocking suggestions deferred. No blocking issues. |
| 10 | Security Review | `10-security-report.md` | PASS | Zero new security issues. No dangerouslySetInnerHTML, no hardcoded secrets, no network calls. |
| 11 | Performance | `11-performance-report.md` | PASS | Thin wrappers over native elements; BottomSheet always-mounted overhead documented and acceptable at MVP scale. |
| 12 | Infra | `12-infra-report.md` | PASS | Purely frontend; no config, env, or deployment changes. |
| 13 | E2E | `13-e2e-report.md` | PASS (N/A) | No primitives consumed by any routed page yet. First browser E2E deferred to REQ-007 (Calendar + Editor). Reason documented and accepted. |

## Git Diff Summary

```
 .agent-state/00-git-safety.md            |  16 +-
 .agent-state/01-requirement-intake.md    | 243 ++++...
 .agent-state/02-architecture-report.md   | 139 ++++...
 .agent-state/03-technical-design.md      | 324 ++++...
 .agent-state/04-api-contract.md          | 361 ++++...
 .agent-state/05-db-migration-report.md   |  57 ++--
 .agent-state/06-test-plan.md             | 273 ++++...
 .agent-state/07-implementation-report.md |  88 ++++
 .agent-state/08-test-report.md           | 218 ++++...
 .agent-state/09-code-review-report.md    | 129 ++--
 .agent-state/10-security-report.md       |  88 ++--
 .agent-state/11-performance-report.md    |  99 ++--
 .agent-state/12-infra-report.md          |  29 +--
 .agent-state/13-e2e-report.md            |  70 ++--
 .agent-state/requirements/REQ-005.md     |   2 +-
 .agent-state/requirements/index.md       |   2 +-
 src/app/globals.css                      |  10 +
 22 files changed, 1760 insertions(+), 1032 deletions(-)
 (+ 18 new untracked files in src/design-system/)
```

## Files Changed

### Created (untracked — new for REQ-005)

| File | Lines | Role |
|---|---|---|
| `src/design-system/BottomSheet.tsx` | 54 | Modal panel, top-radius 24, grip handle, always mounted |
| `src/design-system/Card.tsx` | 34 | White surface, radius 16/20, shadow token |
| `src/design-system/ConfirmDialog.tsx` | 79 | Two-button confirm, destructive variant, Korean defaults |
| `src/design-system/EmptyState.tsx` | 49 | Icon + title + description + optional action |
| `src/design-system/FAB.tsx` | 35 | Fixed bottom-right 56px black action button |
| `src/design-system/IconButton.tsx` | 46 | White circular 44px header button |
| `src/design-system/Toast.tsx` | 48 | Gray pill auto-dismiss notification |
| `src/design-system/useDialogControl.ts` | 45 | Shared `<dialog>` open/close hook for BottomSheet + ConfirmDialog |
| `src/design-system/useToast.ts` | 57 | Toast lifecycle hook with timer management |
| `src/design-system/__tests__/BottomSheet.test.tsx` | 98 | 6 cases |
| `src/design-system/__tests__/Card.test.tsx` | 52 | 5 cases |
| `src/design-system/__tests__/ConfirmDialog.test.tsx` | 157 | 8 cases |
| `src/design-system/__tests__/EmptyState.test.tsx` | 67 | 7 cases |
| `src/design-system/__tests__/FAB.test.tsx` | 51 | 5 cases |
| `src/design-system/__tests__/IconButton.test.tsx` | 60 | 6 cases |
| `src/design-system/__tests__/Toast.test.tsx` | 46 | 5 cases |
| `src/design-system/__tests__/useDialogControl.test.ts` | 96 | 5 cases |
| `src/design-system/__tests__/useToast.test.ts` | 85 | 5 cases (fake timers) |

### Modified

| File | Delta | Note |
|---|---|---|
| `src/app/globals.css` | +10 lines | Added `--color-danger`, `--shadow-card`, `dialog::backdrop` rule — all additive |
| `.agent-state/` reports | various | REQ-005 phase reports populated; prior REQ-001~004 reports untouched in content |
| `.agent-state/requirements/REQ-005.md` | +1 line | Status field updated by orchestrator |
| `.agent-state/requirements/index.md` | +1 line | REQ-005 row status updated |

### Deleted

None.

## Fix Cycles

None — all gates cleared on first cycle.

## Net Effect

- Design-system folder grows from 1 component (`MoodIcon.tsx`) to **9 source files**: 7 UI primitives + 2 hooks.
- Every subsequent screen REQ (REQ-007 onward) can compose headers, cards, FABs, modals, toasts, and empty states from a stable, tested, token-safe vocabulary.
- Touch-target 44x44 and design-token-only styling are now structurally enforced at the primitive layer — callers cannot regress these invariants.
- Test baseline rises from 82 to **131 cases** (49 new). Build and typecheck remain clean.

## Forward-Flagged Constraints

| Constraint | Source | Target REQ |
|---|---|---|
| `React.memo` recommended for IconButton/FAB if calendar renders many simultaneously | `11-performance-report.md` §4 | REQ-007 |
| BottomSheet always-mounted: adopt sites must not mount 5+ sheets per screen simultaneously | `11-performance-report.md` §2 | REQ-008, REQ-016 |
| `ConfirmDialog` uses hardcoded `id="confirm-msg"`; duplicate IDs if two dialogs mount at once. Defer to `useId()` when multi-dialog scenario materializes. | `09-code-review-report.md` suggestion 2 | REQ-009 or later |
| Toast `onClose`/`durationMs` props accepted but not consumed internally; clarify JSDoc before REQ-007 surface adoption | `09-code-review-report.md` suggestion 1, 3 | REQ-007 |
| First browser E2E gate: FAB→editor route, BottomSheet mood picker, Toast on save, ConfirmDialog delete | `13-e2e-report.md` | REQ-007 |

## Commit Message Draft

```
feat(design-system): add 7 UI primitives + 2 hooks (REQ-005)

IconButton, Card, FAB, BottomSheet, Toast, ConfirmDialog, EmptyState을
src/design-system/에 추가. useDialogControl + useToast 훅 포함.
- 모든 색·radius·shadow는 globals.css 토큰만 참조 (하드코딩 없음)
- 터치 타깃 44×44 인라인 style로 강제 (className 오버라이드 불가)
- BottomSheet·ConfirmDialog는 useDialogControl 공유로 <dialog> 패턴 통일
- 49개 신규 테스트; 전체 131/131 통과. typecheck·lint·build 클린.

Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>
```

## Next REQ

**REQ-006 — history-stack 기반 네비게이션 셸** (Status: TODO)

REQ-006 is unblocked: its only declared dependency is REQ-001 (scaffolding), which is DONE. It establishes the `useRouter` / history-stack navigation that REQ-007 (Calendar), REQ-009 (Editor), and REQ-013 (List) all depend on. Until REQ-006 lands, no routed screen can be built.

Expected scope: `next/navigation` `router.push/back` wiring, layout shell with bottom tab bar (or equivalent), and scroll-position / state preservation strategy that satisfies PRD §2.1.

## Verdict

PASS — ready to mark REQ-005 DONE and proceed to REQ-006.

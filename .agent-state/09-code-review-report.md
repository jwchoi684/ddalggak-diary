# Code Review Report — REQ-009

## Summary

REQ-009 delivers the diary editor in 14 new/modified files covering the container, four sub-components, two shared hooks, one design-system fix, and a full test suite (5 + 5 + 12 + 2 unit/integration cases, 1 E2E). Overall the implementation is clean, follows established patterns, and all 215 tests pass. Two issues require attention: one contract deviation (save-icon visibility condition), and one file-size violation (two files over the 110-line threshold). Neither rises to blocking given the context explained below.

---

## Files Reviewed

- `src/design-system/useDialogControl.ts` (modified)
- `src/app/diary/[date]/page.tsx` (modified)
- `src/app/diary/[date]/_components/Editor.tsx` (new, 171 lines)
- `src/app/diary/[date]/_components/EditorHeader.tsx` (new, 33 lines)
- `src/app/diary/[date]/_components/EditorBody.tsx` (new, 84 lines)
- `src/app/diary/[date]/_components/EditorToolbar.tsx` (new, 108 lines)
- `src/app/diary/[date]/_components/EditorMoreMenu.tsx` (new, 46 lines)
- `src/lib/hooks/useAutosave.ts` (new, 26 lines)
- `src/lib/hooks/useEditorState.ts` (new, 110 lines)
- `src/lib/hooks/__tests__/useAutosave.test.ts` (new)
- `src/lib/hooks/__tests__/useEditorState.test.ts` (new)
- `src/app/diary/[date]/__tests__/Editor.test.tsx` (new)
- `src/design-system/__tests__/useDialogControl.test.ts` (modified, +2 cases)
- `e2e/editor.spec.ts` (new)
- `e2e/_helpers/seedDiaries.ts` (new)

---

## Blocking Issues

None.

---

## Non-Blocking Suggestions

**NB-1 — Save icon visibility deviates from one sentence in the API contract**

The contract states: "Rendered only when the textarea is focused AND `isDirty === true`." The implementation renders the icon on `isDirty` alone. The technical design specified `isDirty`-only, so this matches the design. The contract sentence is the outlier and should be corrected. The behavior is actually better UX (user can tap save without re-focusing).

**NB-2 — `Editor.tsx` is 171 lines (file-size rule says ~100, warn at 110)**

Container wires two `ConfirmDialog` instances, `MoodPickerSheet`, `Toast`, and five sub-components. Extract `EditorDialogs.tsx` to bring it to ~140 lines. Not blocking — CLAUDE.md acknowledges the 100-line cap is a strong signal, not absolute.

**NB-3 — `EditorToolbar.tsx` is 108 lines (five inline SVG constants inflate count)**

Moving the 5 SVG constants to a shared icons file would drop the component to ~60 lines. REQ-011 will need GalleryIcon anyway.

**NB-4 — `handleSaveAndBack` does not guard against `isLoaded === false`**

Practically impossible (dialog only opens after user interaction), but defensive `state.isLoaded` check would be safer.

**NB-5 — C7 (save icon absent when not dirty) does not test the post-save state**

No explicit assertion that save icon disappears after explicit save. C9 implicitly exercises the path.

**NB-6 — `EditorMoreMenu` "일기 리스트 보기" button has no `aria-label`**

Inconsistent with the delete button which has `aria-label="일기 삭제"`. Not blocking.

---

## Nits

1. `page.tsx` has `import React from 'react'` — harmless in Next.js 15.
2. `useAutosave.ts` and `useEditorState.ts` carry `"use client"` directives. Correct for Next.js 15 App Router hooks.
3. `Editor.tsx` uses `style={{ height: '100dvh' }}` (inline) rather than `h-[100dvh]` Tailwind class. Equivalent.
4. `EditorMoreMenu.tsx` uses `style={{ color: 'var(--color-danger)' }}` for delete button. Inconsistent with `bg-danger` utility elsewhere. Both work.
5. `useEditorState.ts` module-level `EMPTY_SNAPSHOT` const — safe shared reference.
6. E2E test uses `page.getByRole('button', { name: new RegExp(dateStr) })` — brittle but works.

---

## Positive Notes

- `useDialogControl` NB-1 fix is elegant: `onCloseRef` assign-on-render pattern correctly solves stale-closure problem.
- Cancel listener scoped only to `open=true` branch, cleaned up via return value. Test D2 validates correctly.
- `useEditorState` LOAD_ENTRY correct on both branches with `textAlign ?? 'left'` fallback (INV-13).
- `MARK_SAVED` captures CURRENT state into new snapshot.
- `saveFn` uses `state.persistedId ?? generateId()` with stable memoization — no duplicate entries across autosave cycles.
- `createdAt` preserved via `state.persistedCreatedAt ?? new Date().toISOString()`.
- C9 uses `invocationCallOrder` for save-then-back order — strongest possible assertion.
- `useAutosave` timer cleanup verified by A4 (mount/unmount race covered).
- Autosave silence triple-asserted in C4.
- Korean copy consistent throughout.
- No `any`, no `@ts-ignore`.
- All 5 existing primitives reused as-is.

---

## Invariant Walkthrough

| # | Contract Invariant (Section 7) | Status |
|---|---|---|
| 1 | `Editor` receives valid ISO date; page.tsx validates | Met |
| 2 | `useAutosave`'s `saveFn` wrapped in `useCallback` | Met |
| 3 | `useAutosave`'s `value` memoized with `useMemo` | Met |
| 4 | Autosave fires at most once per 1000ms | Met (A1-A3) |
| 5 | Autosave is silent | Met (C4) |
| 6 | Explicit save shows toast | Met (C6) |
| 7 | Empty-body save allowed when mood set | Met |
| 8 | Save with `mood === undefined` is no-op | Met (C5) |
| 9 | `removeDiary(id)` requires persisted id | Met |
| 10 | `MoodPickerSheet` `onCancelInitial` calls `router.back()` | Met |
| 11 | `LOAD_ENTRY` dispatched once per mount | Met |
| 12 | `isDirty` is `false` while `isLoaded === false` | Met |
| 13 | `DiaryEntry.textAlign ?? 'left'` fallback | Met |
| 14 | `moodSheetMode` one-directional transitions | Met |

All 14 invariants satisfied.

---

## File Size Audit

| File | Lines | Status |
|---|---|---|
| `Editor.tsx` | 171 | Over — extract EditorDialogs would help. Not blocking. |
| `EditorToolbar.tsx` | 108 | Borderline — extract SVG icons. |
| `useEditorState.ts` | 110 | At threshold — reducer naturally cohesive. |
| `EditorBody.tsx` | 84 | OK |
| `EditorHeader.tsx` | 33 | OK |
| `EditorMoreMenu.tsx` | 46 | OK |
| `useAutosave.ts` | 26 | OK |
| `useDialogControl.ts` | 64 | OK |

---

## Architecture Consistency

`"use client"` correctly placed. `useReducer` consistent with hydration-guard pattern. Storage functions used directly. Route-scoped `_components/`. Shared hooks in `src/lib/hooks/`. No new dependencies.

---

## Contract Consistency

13 of 14 contract invariants met exactly. NB-1 divergence is a contract/design discrepancy where implementation correctly follows design. Dialog copy, saveFn algorithm, MARK_SAVED behavior, persisted ID preservation, onCancelInitial wiring, isDirty formula all match.

---

## Verdict
PASS

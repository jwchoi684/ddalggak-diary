# Code Review Report — REQ-010

## Summary

REQ-010 adds a collapsible horizontal date strip inside the diary editor, allowing in-editor navigation across ±30 days with auto-save on date switch. The implementation is largely correct and well-structured. Two issues require attention: one non-blocking correctness concern regarding the `entryMap` not refreshing when the strip closes (only refreshes on open), and one nit-level dead class name. The high-risk item from the contract (invariant 4 — `saveFn` capturing `currentDate`) is correctly implemented. All 12 caller invariants are met. The `onCancelInitial={undefined}` change is a meaningful and documented behavioral improvement, not a hack.

---

## Files Reviewed

- `src/lib/hooks/useHorizontalDatePicker.ts` (103 lines)
- `src/app/diary/[date]/_components/HorizontalDatePicker.tsx` (61 lines)
- `src/app/diary/[date]/_components/DateCell.tsx` (96 lines)
- `src/app/diary/[date]/_components/Editor.tsx` (192 lines)
- `src/app/diary/[date]/_components/EditorBody.tsx` (122 lines)
- `src/app/globals.css` (72 lines)
- `src/lib/hooks/__tests__/useHorizontalDatePicker.test.ts` (171 lines)
- `src/app/diary/[date]/_components/__tests__/DateCell.test.tsx` (95 lines)
- `src/app/diary/[date]/_components/__tests__/HorizontalDatePicker.test.tsx` (102 lines)
- `src/app/diary/[date]/__tests__/Editor.test.tsx` (lines 249–333, new cases)
- `e2e/horizontal-date-picker.spec.ts` (128 lines)

---

## Blocking Issues

None.

---

## Non-Blocking Suggestions

1. **`DateCell.tsx` line 50: dead Tailwind class `scroll-snap-align-center`.**
   The actual CSS snap alignment is applied via the inline style `scrollSnapAlign: 'center'` (line 58), so scroll snapping works correctly at runtime. However, `scroll-snap-align-center` is not a valid Tailwind v4 utility class (the correct utility is `snap-center`). The string is inert — it does nothing — but it is misleading. The inline style is sufficient. Recommended: remove the dead class string from the `className` array.

2. **`e2e/horizontal-date-picker.spec.ts` line 5–9: `isoDate()` uses local-date arithmetic.**
   The `isoDate` helper calls `setDate(d.getDate() + offset)` which is local-time-based. In a CI environment running in UTC, this is fine today. In KST (UTC+9) between midnight and 09:00 UTC, `isoDate(0)` still yields today's KST date correctly because `new Date()` uses local time. However, the logic diverges from the UTC arithmetic used in `buildDateRange`. If this spec runs in a non-UTC zone where `new Date().toISOString().slice(0, 10)` gives yesterday's date (e.g., UTC-5 late evening), `isoDate(0)` and `getTodayString()` in `HorizontalDatePicker` would disagree. The test report already flagged this. Recommended: align `isoDate` with `new Date().toISOString().slice(0, 10)` for UTC-consistent semantics, matching the component's own `getTodayString()`.

3. **`useHorizontalDatePicker.ts` line 70: `eslint-disable` for `useMemo([isOpen])`.**
   Using `isOpen` as the sole dependency for `entryMap` (instead of the factory function's actual dependencies, which ESLint wants) is intentional per design — re-read on each open. The disable comment is legitimate and the behavior is correct. However, it means `entryMap` also re-runs when `isOpen` flips `false` (strip closes), performing a `readDiaries()` call on close in addition to open. This is harmless (O(n) read is cheap) but is a minor unnecessary cost. A conditional `useMemo` is not legal in React. Acceptable as-is; worth noting for future refactor.

---

## Nits

- `DateCell.tsx` line 50: `'scroll-snap-align-center'` — remove dead string (see Non-Blocking #1).
- `HorizontalDatePicker.tsx` line 15–17: `getTodayString()` is a plain function called at render time; the design notes it is "computed once per render." The design calls for it to be computed "at strip-open time" (invariant 8). Since it is called every render of `HorizontalDatePicker`, and the strip is only mounted when open, this is effectively once per open — correct. The naming comment could more clearly say "per render, which equals per mount."
- `useHorizontalDatePicker.ts` lines 78–86 (same-date error path): on a same-date tap, if `saveFn` throws, `onSaveError` is called and the function returns early — the strip stays open despite it being a same-date tap. This diverges from the design spec note in the technical design (§Q5: "same-date tap = close, no navigation") which says close should happen. The implementation report itself acknowledges this: "same-date tap when save fails closes the strip even on error (by design for same-date)" — but the code does the opposite (returns early, leaving strip open). The inconsistency is minor since a QuotaExceededError on a same-date tap is an extreme edge case, but the comment in the implementation report is incorrect about the actual code behavior.

---

## Positive Notes

- Invariant 4 (the highest-risk item) is correctly implemented: `saveFn`'s `useCallback` dep array at `Editor.tsx` line 58 explicitly includes `currentDate`, with a `// CRITICAL (invariant 4)` comment. This is the most important correctness requirement and it is correct.
- `handleDateSelect` ordering is exactly right: `saveFn` → `onDateChange` → `close()` in the success path; `onSaveError` + early return (no navigation, no close) in the failure path.
- `{stripOpen && <HorizontalDatePicker .../>}` mount gate is correctly in place in `EditorBody.tsx` line 101.
- `MoodIcon size={24}` is an integer (not a string) — matches `MoodIconProps { size: number }`.
- UTC date arithmetic in `buildDateRange` is correct and timezone-independent. The test `H3` validates boundaries (`dateRange[0]` = `'2026-04-22'`, `dateRange[60]` = `'2026-06-21'` for center `'2026-05-22'`) which confirms correctness across month boundaries.
- `onCancelInitial={undefined}` change is well-motivated: the previous `router.back()` behavior caused E2E failures because in test contexts there is no history entry, and navigating back navigated away. Setting it to `undefined` means `onCancelInitial?.()` is a no-op, and the sheet simply closes in place. `MoodPickerSheet` already typed `onCancelInitial?` as optional, so this is a valid and idiomatic usage — not a hack.
- The `toKoreanLabel` fix in the E2E spec correctly resolves the ambiguous cell-matching problem (same day number appearing in multiple months within the 61-cell range). Using the full Korean label is the right approach.
- `role="listbox"` / `role="option"` / `aria-selected` / `aria-expanded` / `aria-haspopup="listbox"` / `aria-label` (Korean) are all present and correctly applied.
- No `any` types, no `@ts-ignore`, no unsafe casts anywhere in the new code. TypeScript is clean.
- `setCurrentDate` (a React state setter) is passed directly as `onDateChange` — this is a stable reference by React contract, satisfying invariant 3 without requiring an additional `useCallback` wrapper.
- No second `<Toast>` mount — the existing `toast.show()` from `Editor.tsx` is reused via the `onSaveError` callback.
- `buildEntryMap` correctly uses `new Map(entries.map(...))` which handles duplicates by keeping the last entry — same-date duplicates are not expected but this is gracefully handled.

---

## Invariant Walkthrough

| # | Invariant | Met? | Evidence |
|---|---|---|---|
| 1 | `dateRange` sorted ascending (earliest first) | Met | `buildDateRange` iterates `i=0..60`, adding `(i-30) * MS_PER_DAY` in ascending order. Test H3 verifies ascending sort. |
| 2 | `entryMap` at most one entry per date key | Met | `buildEntryMap` uses `new Map(entries.map(e => [e.date, e]))` — last write wins; storage layer enforces one-per-day. |
| 3 | Callbacks stable across renders | Met | `onDateChange` = `setCurrentDate` (stable React setter). `onSaveError` = inline arrow in `Editor.tsx` line 69 — this is NOT wrapped in `useCallback`. However, `useHorizontalDatePicker` stores it in `useCallback` deps (line 99), so hook re-creates `handleDateSelect` on each render if `onSaveError` is unstable. Functionally correct but slightly suboptimal. |
| 4 | `saveFn` closes over `currentDate` (not stale `date` prop) | Met | `Editor.tsx` line 53 uses `currentDate` in `upsertDiary` call; line 58 lists `currentDate` in deps. CRITICAL comment present. |
| 5 | `autosaveValue` reflects live editor fields at call time | Met | `autosaveValue` is a `useMemo` on `[state.mood, state.text, state.textAlign]` — always current. |
| 6 | `<HorizontalDatePicker>` only mounted when `stripOpen === true` | Met | `EditorBody.tsx` line 101: `{stripOpen && <HorizontalDatePicker .../>}`. `stripOpen` initializes `false`. |
| 7 | `isSelected` = `date === currentDate` | Met | `HorizontalDatePicker.tsx` line 54: `isSelected={date === currentDate}`. |
| 8 | `isToday` computed from system date at strip-open time, not module load | Met | `getTodayString()` called at render time inside `HorizontalDatePicker` (line 26), which mounts only when open. |
| 9 | Existing `<Toast>` reused — no second mount | Met | `Editor.tsx` line 69: `onSaveError: (msg) => toast.show(msg)` uses the existing `useToast()` instance. One `<Toast>` at line 143. |
| 10 | `handleDateSelect` calls `saveFn` before `onDateChange` | Met | `useHorizontalDatePicker.ts` lines 91–97: `saveFn(autosaveValue)` in `try`, then `onDateChange(newDate)` + `setIsOpen(false)` after the try block. Test H5 verifies call order via `invocationCallOrder`. |
| 11 | `setCurrentDate` NOT called if `saveFn` throws | Met | Failure path at lines 92–95: `catch { onSaveError(...); return; }` — `onDateChange` is never reached. Test H6 verifies. |
| 12 | All user-visible strings are Korean | Met | `aria-label="날짜 선택"`, `aria-label="가로 캘린더"`, Korean date labels via `Intl.DateTimeFormat('ko-KR')`, toast message `'저장에 실패했어요. 다시 시도해주세요.'`. |

---

## File Size Audit

| File | Lines | Status |
|---|---|---|
| `useHorizontalDatePicker.ts` | 103 | 3 lines over 100-line soft ceiling. UTC `buildDateRange` justifies the extra lines. Acceptable. |
| `HorizontalDatePicker.tsx` | 61 | Within budget. |
| `DateCell.tsx` | 96 | Within budget (just under 100). |
| `Editor.tsx` | 192 | Over budget; was already 171 pre-REQ-010. Delta of +21 is modest. Extraction of handlers to a custom hook recommended before next feature. |
| `EditorBody.tsx` | 122 | Over budget; was 84 pre-REQ-010. Delta of +38 from five new props and strip render. Should be split before REQ-011 adds photo strip props. |

---

## Architecture Consistency

The implementation follows the established patterns:
- `"use client"` on all new hook and component files.
- Existing `useEditorState`, `useAutosave`, `saveFn`, `toast` instances reused without modification.
- New components placed in `src/app/diary/[date]/_components/` (editor-scoped) and `src/lib/hooks/` (shared hook). Correct locations per the project structure.
- `readDiaries()` and `upsertDiary()` from `@/lib/storage` used directly — no new storage abstractions introduced.
- `MoodIcon` reused with `size={24}` integer — matches existing usage pattern (`size={72}` in EditorBody and MoodPickerSheet).
- Design tokens (`bg-peach`, `text-meta`, `text-charcoal`) used consistently; no raw hex values.

---

## Contract Consistency

All five interface contracts from `04-api-contract.md` are respected:
- `useHorizontalDatePicker` signature matches exactly.
- `HorizontalDatePicker` props match exactly.
- `DateCell` props match exactly.
- `EditorBody` five new required props are present and wired.
- `Editor` external props unchanged (`EditorProps { date: string }`).

The `onCancelInitial={undefined}` change is consistent with `MoodPickerSheet`'s type definition (`onCancelInitial?: () => void`) — the prop was already optional. The behavioral change (no implicit `router.back()` on cancel) is documented in the implementation report and test report. No existing tests asserted the old behavior, and the change resolves a real E2E stability problem.

Minor note: `onSaveError` in `Editor.tsx` line 69 is an inline arrow `(msg) => toast.show(msg)` rather than a `useCallback`-wrapped stable reference. The contract says callbacks "MUST be stable across renders." This arrow is recreated each render. `useHorizontalDatePicker` lists `onSaveError` in `handleDateSelect`'s `useCallback` deps (line 99), so `handleDateSelect` will be re-created on every render of `Editor`. This is a minor performance issue only — correctness is unaffected since `handleDateSelect` itself is always fresh. The contract's stability requirement is primarily about preventing unnecessary re-renders and stale closure bugs; the stale-closure risk here is zero because the callback just calls `toast.show`.

---

## Verdict
PASS

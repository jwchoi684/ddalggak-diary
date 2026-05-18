# Architecture Report — REQ-008

## Summary

REQ-008 adds `MoodPickerSheet`, a composite client component wrapping the existing `BottomSheet` primitive. All building blocks already in place (BottomSheet, Toast, useToast, IconButton, MoodIcon, MOODS). Work is purely compositional — no new primitives, no new libraries, no data-layer changes. Main structural decisions: correct Toast placement inside `<dialog>` subtree, single internal `handleCancel()` branching on `mode`, local date formatter (no third-party dep).

---

## Frontend Findings

**Stack:** Next.js 15 / React 19 / Tailwind 4 / TypeScript strict.

**Relevant existing components:**
- `BottomSheet` — `{ open, onClose, children, className }`. Renders `<dialog>` via `useDialogControl`. Backdrop click + Escape handled inside. Grip handle unconditional above `{children}`. `className` applies to inner wrapper `<div>`, not `<dialog>`.
- `Toast` — pure controlled, `open=false → null`; `open=true` renders `fixed bottom-24 z-50` pill. z-50 irrelevant inside `<dialog>` top-layer; positioning works because Toast lives in dialog's DOM subtree.
- `useToast` — per-instance, non-singleton. `{ message, open, show, hide }`. Auto-dismiss 1800ms default. `show()` before expiry resets timer.
- `IconButton` — `{ icon, label, onClick, disabled?, className? }`. 44×44 inline style.
- `MoodIcon` — Server Component, `{ id, size, className? }`. Size 72 matches REQ-008 spec.
- `MOODS` (REQ-003) — length 10, order joy→embarrassed. Grid iteration via `MOODS.map(...)`.
- `MoodId` — 10-literal union from `@/lib/storage` barrel.

**Tailwind tokens confirmed:** `bg-paper`, `bg-cream`, `text-charcoal`, `text-meta`, `bg-peach`, `bg-peach-light`, `--radius-card`, `--shadow-card`, `--container-mobile`.

**Date formatter:** `Intl.DateTimeFormat('ko-KR', { weekday: 'short' })` returns single Korean weekday (월/화/수/목/금/토/일). `date` prop arrives as ISO `'YYYY-MM-DD'`. `date.replace(/-/g, '.')` → `YYYY.MM.DD`. Weekday from `new Date(date + 'T00:00:00')` (LOCAL TZ — see Risks). No external lib.

**Tab styling:** No existing `Tabs` primitive. Inline Tailwind correct. Active: `border-b-2 border-charcoal text-charcoal font-medium`. Inactive: `text-meta`. Inactive tabs must NOT be `disabled` — must remain pointer-event-capable to trigger toast.

**Selected mood highlight:** `ring-2 ring-peach bg-peach-light/30` on matching cell when `selectedMoodId` set. Graceful fallback when undefined (initial mode passes undefined).

**`mode` branching:** Single internal `handleCancel()` function. `initial` → `onCancelInitial?.()` then `onClose()`. `change` → `onClose()` only. Mood cell tap → `onSelect(moodId)` then `onClose()`, never `handleCancel`.

**File size risk:** Header + 2-level tabs + 10-cell grid + Toast likely 120–150 lines. Per intake, may split tabs into sub-component (`MoodPickerTabs`) if exceeds ~100 lines. Decision at implementation.

---

## Backend Findings

None. Purely frontend. No API routes, no server actions, no storage calls. Component only emits callbacks upward.

---

## Data Model Findings

No schema changes. `MoodId` already defined. `DiaryEntry.mood` is REQ-009's persistence target. REQ-008 only emits `onSelect(moodId: MoodId)`.

---

## Test Structure Findings

**Vitest:** env per-file `// @vitest-environment happy-dom`. Global default `node`.

**Test library:** `@testing-library/react@^16` + `render` + `screen` + `fireEvent` + `cleanup` in `afterEach`. No `userEvent` in existing tests — `fireEvent` is project convention.

**Timer mocking:** `vi.useFakeTimers()` in `beforeEach` + `vi.useRealTimers()` in `afterEach` for Toast auto-dismiss (pattern from `useToast.test.ts`).

**`showModal`/`close` mocking:** `BottomSheet.test.tsx` mocks `HTMLDialogElement.prototype.{showModal, close}` in `beforeEach`. MoodPickerSheet tests must replicate (wraps BottomSheet which calls them).

**No `next/navigation` mock needed** — component has no router dep.

**Source-guard pattern:** `fs.readFileSync` assert `"use client"` presence — must include since MoodPickerSheet is client.

**Test location:** `src/design-system/__tests__/MoodPickerSheet.test.tsx`.

---

## Tooling and Commands

Standard project commands (typecheck, lint, test, build, test:e2e). Path alias `@/*` → `src/*` in both tsconfig and vitest.config.

---

## Existing Patterns to Reuse

1. **BottomSheet composition** — pass body as `children`. No new dialog/animation.
2. **Per-instance useToast** — `useToast()` inside MoodPickerSheet; `<Toast>` as last child inside BottomSheet children fragment.
3. **IconButton for X close** — `icon={<svg .../>}` with `label="닫기"` and `onClick={handleCancel}`.
4. **MOODS array iteration** — `MOODS.map(mood => ...)`; never hardcode.
5. **Tailwind tokens** from globals.css theme.
6. **`vi.useFakeTimers`** from `useToast.test.ts`.
7. **`HTMLDialogElement.prototype` mocking** from `BottomSheet.test.tsx`.
8. **`// @vitest-environment happy-dom`** directive.
9. **`fs.readFileSync` source-guard** for `"use client"` assertion.

---

## Files Likely to Change

**New:**
- `src/design-system/MoodPickerSheet.tsx` — component
- `src/design-system/__tests__/MoodPickerSheet.test.tsx` — tests

**Possibly new (only if line count forces split):**
- `src/design-system/MoodPickerTabs.tsx` — tab strip sub-component

**No existing files modified** for REQ-008. REQ-009 will later import + wire MoodPickerSheet into editor.

---

## Risks

1. **Toast z-index inside dialog.** `Toast.tsx` uses `fixed bottom-24 z-50`. Inside `showModal()` top-layer, `fixed` is relative to dialog's containing block, not viewport. Pill will appear within sheet, near bottom of content area. Acceptable given sheet covers 60–80% of screen, but exact position should be verified. `className` escape hatch (`!bottom-6`) available if needed.

2. **MoodIcon (Server Component) imported into Client Component.** Legal in Next.js 15 — client boundary at MoodPickerSheet, MoodIcon is leaf with no server-only APIs. No risk in practice.

3. **Date constructor timezone.** `new Date('YYYY-MM-DD')` parses as UTC midnight, may shift weekday by one in TZs behind UTC. Safe pattern: `new Date(date + 'T00:00:00')` (local) or `new Date(year, month-1, day)` from sliced parts. Must apply correctly in formatter.

4. **`handleCancel` double-call guard.** If BottomSheet fires `onClose` (backdrop/Escape) AND X button `onClick` fires in same interaction, `handleCancel` could fire twice. `useDialogControl` calls `onClose` only on `e.target === ref.current` (backdrop), not children — so X click doesn't bubble to backdrop handler. Low risk, worth a test case.

---

## Unknowns

1. Whether `Toast` `fixed bottom-24` positioning renders visibly within sheet or clips behind sheet's rounded-top edge needs runtime/visual verification. `className` escape hatch available.
2. Whether `MoodPickerTabs` sub-component split is needed — determined at implementation once line count is known.

---

## Verdict
PASS

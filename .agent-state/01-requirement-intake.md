# Requirement Intake — REQ-008

## Restatement

REQ-008 delivers `MoodPickerSheet`, a reusable bottom-sheet modal that lets the user pick one of the 10 fixed moods (PRD §3.4) for a given diary date. It is composed on top of REQ-005's `BottomSheet` primitive — not a new dialog implementation. The sheet has **two entry modes** that share the **same UI** and differ only in close behavior: `initial` (auto-opened by the editor on an empty entry — cancel must propagate up so the editor steps back to its previous screen) and `change` (user re-tapped the mood icon to swap — cancel just dismisses the sheet, keeping the existing mood). MVP exposes only the "기본 > 기분" category; the inactive top tab ("테마") and inactive sub-tab ("일상") render but show a "곧 만나요!" Toast on tap (v2 preview). REQ-008 is also the **first real consumer** of the REQ-005 `BottomSheet` primitive, so its build doubles as a smoke test for that primitive's API surface.

## In Scope

- One new file: `MoodPickerSheet.tsx` exposing a single React component.
- Composition over `BottomSheet` from REQ-005 (grip handle, slide-up, dim backdrop, Escape/backdrop close are all delegated — no re-implementation).
- Header inside the sheet: date label "YYYY.MM.DD 요일" (Korean weekday) + title "오늘은 어떤 하루였나요?".
- Two-level tab strip: top "기본 / 테마" + sub "기분 / 일상". Only "기본" + "기분" active; inactive tabs are visually muted and, when tapped, trigger a "곧 만나요!" Toast.
- 3-column grid of all 10 moods from REQ-003 `MOODS` (in array order). Each cell = `MoodIcon size={72}` + Korean label below. Cell-to-cell gap 16–24px.
- `mode: 'initial' | 'change'` prop branching the close-callback dispatch.
- Caller-supplied callbacks: `onSelect(mood: MoodId)` (always), `onClose()` (always, fires for the `change`-mode cancel paths), `onCancelInitial()` (only fires for the `initial`-mode cancel paths).
- Optional `selectedMoodId?: MoodId` to visually highlight the current pick when the sheet is opened in `change` mode.
- Korean copy throughout; touch targets ≥ 44×44 (mood cells and tab buttons).

## Out of Scope (deferred to owner REQ)

- Editor integration / the auto-open-on-empty-entry trigger — REQ-009.
- "테마" category content (seasonal mood packs) — v2, see PRD §3.4.1.
- "일상" sub-category (activity/state stickers) — v2.
- User-defined custom moods — not in PRD.
- Mood-selection-driven LLM context, statistics, or chart wiring — owned by REQ-014/017.
- Persistence of the picked mood into a `DiaryEntry` — REQ-009 owns the save flow; this REQ only emits `onSelect(mood)` upward.
- Routing / `router.back()` calls — REQ-009 owns navigation; this REQ only emits `onCancelInitial()`.
- New shared primitives in `src/design-system/` — REQ-005 already supplies BottomSheet, Toast, MoodIcon, useToast, useDialogControl.

## Invariants

1. **Composes REQ-005's `BottomSheet`** — no new `<dialog>`, no new slide animation, no new backdrop. `MoodPickerSheet` body is rendered inside `<BottomSheet>{...}</BottomSheet>`.
2. **Single component, not two.** PRD §4.2.1 explicitly mandates the same modal for both trigger paths. The `mode` prop is the only differentiator; do not fork into `InitialMoodPickerSheet` + `ChangeMoodPickerSheet`.
3. **Mood source of truth is REQ-003's `MOODS` array.** Do not hardcode emoji/label/color/ids locally; iterate `MOODS` to render the 10 cells in declared order.
4. **Date header format**: `YYYY.MM.DD 요일` where 요일 ∈ {월, 화, 수, 목, 금, 토, 일}. Local timezone applies.
5. **Title text**: "오늘은 어떤 하루였나요?" (no truncation, no variants).
6. **Inactive tabs are tappable**: tapping "테마" or "일상" fires `Toast("곧 만나요!")` and does NOT change the active tab. Do not disable the element — it must still receive pointer events so the toast can fire.
7. **Close-behavior dispatch**: every close path (grip drag down — handled by BottomSheet, backdrop click — handled by BottomSheet, explicit X — owned here) must funnel through a single internal `handleCancel()` that branches on `mode`. `initial` → calls `onCancelInitial?.()` then `onClose()`. `change` → calls `onClose()` only.
8. **Item tap = commit + close**: tapping a mood cell calls `onSelect(moodId)` and then `onClose()`. It must NOT call `onCancelInitial()` even in `initial` mode (selection is not a cancel).
9. **Toast must render inside the dialog DOM subtree**, per REQ-005's note that `<div>` cannot exceed `showModal()`'s top layer.
10. **Touch targets ≥ 44×44**: each mood cell (including label region) and each tab pill meets this.
11. **Achromatic UI; mood color from icons only.** Selected-cell highlight, if any, must come from peach (`#F5C896`) ring/background — never a custom mood-color background that would clash with the icon.
12. **All user-facing text is Korean.**

## Open Questions and Recommended Defaults

1. **Component file location** — `src/design-system/MoodPickerSheet.tsx` vs `src/app/_components/MoodPickerSheet.tsx`?
   - **Recommend** `src/design-system/MoodPickerSheet.tsx`. It is a reusable composite consumed by the editor (REQ-009) and a likely candidate for re-use in any future "change mood in past entry" flow. Aligns with CLAUDE.md's "UI 컴포넌트 재사용 규칙" — register in design system on first appearance even when only one caller exists today.

2. **Props signature shape** — one `onCancel(mode)` callback vs explicit `onClose` + `onCancelInitial`?
   - **Recommend** explicit two callbacks. Contract reads:
     ```ts
     interface MoodPickerSheetProps {
       open: boolean;
       date: string;                       // ISO 'YYYY-MM-DD'
       mode: 'initial' | 'change';
       selectedMoodId?: MoodId;            // highlight in 'change' mode
       onSelect: (moodId: MoodId) => void;
       onClose: () => void;                // always fires on close
       onCancelInitial?: () => void;       // only fires when mode === 'initial' AND closed without selecting
     }
     ```
     Explicit names make the call-site contract self-documenting and remove the caller's need to branch on a `mode` argument inside its handler.

3. **Toast scoping** — global vs per-instance?
   - **Recommend** per-instance. Use REQ-005's `useToast()` inside `MoodPickerSheet`; render `<Toast>` as a child of the sheet body (which lives inside `<dialog>`), satisfying the z-index note in REQ-005. No new global toast queue.

4. **Date-string formatting** — pull in `date-fns`/`dayjs` or hand-roll?
   - **Recommend** hand-roll a 5-line helper using `Intl.DateTimeFormat('ko-KR', { weekday: 'short' })` for the Korean weekday and string slicing of the ISO `'YYYY-MM-DD'` input for the date portion. No new dependency; the formatter is local to MoodPickerSheet and can graduate to a shared util when REQ-009's editor needs the same format.

5. **Tab styling** — new `Tabs` primitive in design system or inline Tailwind?
   - **Recommend** inline Tailwind only. The tab pattern (charcoal underline on active, meta gray on inactive) is small and currently used in just one place. Promote to a `Tabs` primitive when a second consumer appears (per CLAUDE.md "UI 컴포넌트 재사용 규칙" step 3). No primitive in REQ-008.

6. **Selected-mood highlight in `change` mode** — what visual?
   - **Recommend** optional 2px peach (`#F5C896`) ring + subtle peach-tint background on the selected cell. PRD does not specify, but a visible "current pick" cue is necessary for the change path to feel correct. Falls back to plain rendering when `selectedMoodId` is undefined (i.e. always in `initial` mode).

7. **Explicit close (X) button** — present or rely on backdrop/grip?
   - PRD §4.2.3 explicitly lists "명시적 닫기 X 버튼" as one of three close affordances. **Recommend** including a small `IconButton` (X) in the top-right of the sheet body. All three close paths (X tap, backdrop click, Escape key) funnel through the same `handleCancel()`.

## Dependency Check

| Dep | Status | Used for |
|---|---|---|
| REQ-002 (`MoodId`, types) | DONE | Type import from `@/lib/storage` for the `onSelect` payload and `selectedMoodId` prop. |
| REQ-003 (`MOODS`, `MoodIcon`) | DONE | Grid iteration source + 72px icon renderer. |
| REQ-005 (`BottomSheet`, `Toast`, `useToast`, `useDialogControl`, `IconButton`) | DONE | `BottomSheet` for sheet shell, `Toast` + `useToast` for inactive-tab feedback, `IconButton` for the X close. |
| REQ-001 (Option B scaffold: Next.js / Tailwind / `'use client'`) | DONE | Required for any new client component. |

No forward dependency on REQ-009 (the editor); REQ-008 ships as a stand-alone reusable component with its props as the only integration surface.

## Verdict
PASS

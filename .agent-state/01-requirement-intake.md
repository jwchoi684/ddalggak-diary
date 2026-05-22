# Requirement Intake — REQ-009

## Restatement

REQ-009 delivers the diary editor: a single React component that handles both new-entry creation and existing-entry editing without branching into separate screens or routes. The route `src/app/(routes)/diary/[date]/page.tsx` (stubbed in REQ-006) becomes the host. On entry the component checks storage (REQ-002 `getDiaryByDate`) to determine which of four contexts applies — empty-cell new entry (auto-opens `MoodPickerSheet` in `mode='initial'`; delete hidden), or existing-entry via calendar, list, or AI-citation (prefills data; delete shown; no sheet auto-open). The editor provides a mood icon tap (→ `MoodPickerSheet mode='change'`), a full-height textarea, a bottom toolbar (alignment toggle, current-time insert, and a conditional save icon), 1-second debounce autosave to localStorage, and explicit save with a "일기를 저장했어요!" toast. Back navigation is guarded: if unsaved changes remain, a confirm dialog fires before `router.back()`.

## In Scope

- Route file `src/app/(routes)/diary/[date]/page.tsx` wired to render the editor container (replaces the current stub).
- Single editor container component at `src/app/(routes)/diary/[date]/_components/Editor.tsx` (route-scoped, split into sub-components per 100-line rule). Sub-components: `EditorHeader`, `EditorBody` (textarea), `EditorToolbar`, `EditorMoreMenu` (wraps BottomSheet), `UnsavedChangesDialog` (wraps ConfirmDialog), plus hooks `useEditorState` and `useAutosave`.
- Four entry contexts per PRD §4.3.8:
  - Calendar empty date: all fields blank, `MoodPickerSheet` auto-opens `mode='initial'`, delete menu item hidden.
  - Calendar existing date: data prefilled from storage, no auto-open, delete shown.
  - List item tap: same as above.
  - AI chat citation tap: same as above (the editor only consumes the `date` route param; REQ-017 handles producing the citation link).
- Header: left = `IconButton` (back arrow, 44×44, white circular) that checks dirty state and either navigates via `router.back()` or fires `UnsavedChangesDialog`; right = `IconButton` (⋯, white circular) that opens `BottomSheet` with "📋 일기 리스트 보기" (→ `Routes.list`) and "🗑 일기 삭제" (only when a saved entry exists → `ConfirmDialog` → REQ-002 `deleteDiary` + `router.back()`).
- Mood area: `MoodIcon` centered, `size={64}` (at minimum, up to 80px per PRD §4.3.3), tappable. Tap opens `MoodPickerSheet mode='change' selectedMoodId={currentMood}`.
- Date display below mood: Korean format "2026년 5월 15일 ▾" (static text for this REQ; the ▾ tap for horizontal calendar dropdown is REQ-010 — render the ▾ affordance but leave it inert for now so REQ-010 can hook in).
- Textarea body: `<textarea>` with placeholder "오늘 어떤 하루였나요?" (PRD §4.3.6; note: REQ-008 sheet header uses "오늘은 어떤 하루였나요?" — the editor placeholder is the shorter form from §4.3.6). CSS class toggled for left vs center alignment. 5000-character soft limit (per PRD §9 row 6). Auto-scroll behavior when keyboard rises (CSS `resize: none` + scroll-padding or similar).
- Bottom toolbar: always-visible 3-icon set (🖼 gallery stub, ☰ alignment, 🕐 time insert) + conditional 4th icon (✓ save) that appears only when the editor is focused AND there are unsaved changes. Gallery icon is present but calls a stub/noop for this REQ (REQ-011 wires it). Toolbar sticks above keyboard when keyboard is open.
- Alignment toggle: single icon, toggles `text-left` / `text-center` CSS class on the textarea, state persisted to `DiaryEntry.textAlign` on save (see Open Questions for field addition).
- Current-time insert: reads `HH:MM ` from `new Date()` and inserts it at `textarea.selectionStart`, replacing any selected range (`selectionStart`/`selectionEnd` API).
- Explicit save (✓): calls REQ-002 `upsertDiary`, then shows `Toast("일기를 저장했어요!")` for ~1800ms, then blurs the textarea (keyboard closes).
- Autosave: 1-second debounce on any state change (`body`, `mood`, `textAlign`), calls `upsertDiary` silently. Resets the debounce timer on each keystroke. No toast.
- Unsaved-changes guard: when dirty state is true and user taps the back arrow, `ConfirmDialog` opens with two actions — "저장" (explicit save then navigate) and "취소" (dismiss dialog, stay on screen). PRD §4.3.2 says "확인 → 저장 후 복귀 / 취소 → 머무름"; confirm = save+back, cancel = stay. No "discard without saving" third option.
- 1-per-day enforcement: `page.tsx` runs `getDiaryByDate(date)` on mount; if a record exists, treats entry as existing regardless of how the route was reached. Future dates allowed.
- Empty-body save: allowed per PRD §9 row 3 and §13.2 row 4. A mood-only entry is valid. No blocking toast for empty body.
- Delete flow: `ConfirmDialog` (no specific copy locked in PRD — see Open Questions) → `deleteDiary(date)` → `router.back()`.
- Tests: four entry-context initial state tests, autosave debounce test, explicit-save toast test, back-navigation guard test, current-time insert test.
- E2E: "캘린더 빈 셀 → 무드 선택 → 본문 입력 → 자동 저장 → 뒤로 → 캘린더에 무드 표시".

## Out of Scope (with pointer to owner REQ if known)

- Horizontal calendar inline dropdown (▾ tap) — REQ-010. The ▾ affordance renders but is inert.
- Photo carousel, long-press delete, gallery picker wiring — REQ-011. The 🖼 toolbar icon renders but calls a noop.
- Fullscreen photo viewer — REQ-012.
- Diary list screen itself — REQ-013. The ⋯ menu item "📋 일기 리스트 보기" navigates to `Routes.list`, but REQ-013 builds that screen.
- AI chat citation production (the link that opens the editor) — REQ-017. This REQ only needs to handle incoming `date` route param.
- Text search and filter — v2, not in PRD MVP scope.
- Persona / AI chat — REQ-015–018.
- JSON export — REQ-019.
- Sharing, exporting entry — v2 (noted as such in PRD §4.3.2).

## Invariants

1. **Editor is one component for both new and edit.** The only behavioral differences are: (a) initial field values (empty vs fetched), (b) mood sheet auto-opens in new-entry context, (c) delete menu item visible only when a saved record exists. Do not create separate `NewEditor` and `EditEditor` components or routes.
2. **Autosave is silent; explicit save shows toast.** 1-second debounce `upsertDiary` calls make no UI noise. Only the ✓ icon tap triggers `Toast("일기를 저장했어요!")`.
3. **Mood reselect uses `MoodPickerSheet mode='change'`.** Never open it as `mode='initial'` when there is already a selected mood. `selectedMoodId` must be the current mood.
4. **Header pattern is single ⋯ menu.** PRD §13.2 row 2 recommends ⋯ single menu (레퍼런스 일치). Adopting two separate icons instead requires explicit user re-confirmation; proceed with ⋯ as the locked default.
5. **Korean copy throughout.** User-facing strings:
   - Toolbar save toast: `"일기를 저장했어요!"`
   - Textarea placeholder: `"오늘 어떤 하루였나요?"`
   - More-menu items: `"📋 일기 리스트 보기"`, `"🗑 일기 삭제"`
   - Unsaved-changes dialog confirm action: `"저장"`, cancel action: `"취소"` (dialog body copy — see Open Questions for exact wording).
   - Delete confirm dialog copy — see Open Questions.
6. **`DiaryEntry.updatedAt` always refreshed on save.** Every `upsertDiary` call — whether autosave or explicit — must set `updatedAt` to the current ISO timestamp. Defined in REQ-002 contract.
7. **1 entry per date (upsert keyed by `date`).** `upsertDiary` is always an upsert on `DiaryEntry.date`, never a create with a new id on the same date. A "new entry" route for a date that already has a record silently becomes an edit.
8. **Back navigation preserves originating screen state.** `router.back()` uses REQ-006's history-stack model; the editor must not push to history manually or replace state. The calendar, list, or AI chat restores its own scroll/sort state on re-render.
9. **No new third-party dependencies.** `selectionStart`/`selectionEnd` for time-insert, `setTimeout`/`clearTimeout` for debounce, `Intl` for any formatting — all native.
10. **File size rule: each file ≤ ~100 lines.** The container `Editor.tsx` must be split across `EditorHeader`, `EditorBody`, `EditorToolbar`, `EditorMoreMenu`, and `UnsavedChangesDialog`. Hooks `useEditorState` and `useAutosave` are separate files.
11. **Reuse existing primitives only.** `BottomSheet`, `Toast`, `useToast`, `ConfirmDialog`, `IconButton`, `MoodIcon`, `MoodPickerSheet`, `Routes`, `useRouterBack` (or `router.back()` from `next/navigation`), `upsertDiary`, `deleteDiary`, `getDiaryByDate` from `@/lib/storage`.

## Open Questions and Recommended Defaults

1. **Editor sub-component file location** — `src/app/(routes)/diary/[date]/_components/` vs `src/app/_components/`?
   - **Recommend** route-scoped: `src/app/(routes)/diary/[date]/_components/`. The editor is not re-used from any other route today; REQ-010 and REQ-011 extend it in place. Route-scoping keeps the concern local. If a future REQ creates a second editor consumer, promote to `src/app/_components/` at that time per CLAUDE.md UI reuse rules.

2. **Form state shape** — separate `useState` calls vs `useReducer` vs a custom `useEditorState` hook?
   - **Recommend** a custom `useEditorState` hook with `useReducer` internally. The editor manages at least: `mood: MoodId | undefined`, `body: string`, `textAlign: 'left' | 'center'`, `isDirty: boolean`, `isSaved: boolean`, `moodSheetOpen: boolean`, `moreMenuOpen: boolean`, `unsavedDialogOpen: boolean`. Eight interacting fields with defined transitions are better served by named reducer actions than eight `useState` calls scattered across the container.

3. **`isDirty` derivation** — snapshot diff or explicit setter on every mutating action?
   - **Recommend** snapshot diff. On mount, capture `initialSnapshot = { mood, body, textAlign }` (from fetched data or empty defaults). After each change, `isDirty = JSON.stringify(current) !== JSON.stringify(initialSnapshot)`. Reset snapshot after every successful save (autosave or explicit). This prevents drift where a user types then deletes back to original and the guard still fires.

4. **Autosave debounce wiring** — inline `useEffect` with `setTimeout` in the editor vs a standalone `useAutosave` hook?
   - **Recommend** a standalone `useAutosave(value, delay, saveFn)` hook in `src/lib/hooks/useAutosave.ts`. Reasons: (a) isolatable and testable on its own, (b) REQ-019 (JSON export) and REQ-017 (chat input auto-draft) may need a similar primitive, (c) separates timing logic from editor business logic per the file-responsibility rule.

5. **Current-time insert behavior** — insert at cursor start only, or replace the selection range?
   - **Recommend** replace the selection range. Behavior: read `selectionStart` and `selectionEnd`, splice `"HH:MM "` into `body` string at that range (replacing any selected text), then programmatically set `selectionStart === selectionEnd === insertionEnd`. This is the standard text-editor idiom and avoids surprising behavior when text is selected before tapping the clock icon.

6. **Save toast component** — which `Toast` and `useToast` instance?
   - **Recommend** a per-instance `useToast()` inside `EditorToolbar` (or hoisted to `Editor` and passed down), rendering `<Toast>` outside the keyboard-attached toolbar (e.g. in the screen body, below the textarea), following the REQ-005/REQ-008 pattern. Do not use a global singleton — there is none in the current codebase.

7. **Confirm dialog for both unsaved-changes guard and delete confirm** — share `ConfirmDialog` with different props?
   - **Recommend** yes: reuse `ConfirmDialog` from REQ-005 for both. Pass different `title`, `confirmLabel`, `cancelLabel` props. Do not fork into two separate component files.

8. **Back-navigation guard implementation** — `beforeunload` event vs in-app back-button intercept?
   - **Recommend** in-app intercept only. `beforeunload` fires on browser tab close — outside the scope of the PRD guard (which is about the in-app back arrow). Intercept by replacing the back `IconButton`'s `onClick`: if `isDirty`, open `UnsavedChangesDialog`; else call `router.back()`. The autosave should already have resolved most dirty states within 1 second of the last change, making this guard rare in practice.

9. **Unsaved-changes dialog and delete-confirm dialog copy** — PRD §4.3.2 describes behavior but does not specify exact dialog body text.
   - **Recommend defaults**:
     - Unsaved-changes dialog: title `"저장되지 않은 변경사항이 있어요"`, confirm `"저장하고 나가기"`, cancel `"계속 작성"`.
     - Delete dialog: title `"일기를 삭제할까요?"`, body `"삭제한 일기는 복구할 수 없어요."`, confirm `"삭제"`, cancel `"취소"`.
   - These can be tuned during implementation without re-asking the user since they are copy choices, not feature decisions.

10. **`textAlign` field on `DiaryEntry`** — PRD §4.3.6 specifies alignment, but REQ-002's `DiaryEntry` schema may not include a `textAlign` field. If it does not exist, adding it is a minor schema extension (no migration needed for localStorage append).
    - **Recommend** add `textAlign?: 'left' | 'center'` to `DiaryEntry` type and default to `'left'` on read. This is additive and backward-compatible since old entries without the field will read as `undefined` and fall back to `'left'`.

11. **Gallery toolbar icon behavior** — REQ-011 is not yet done. Should the 🖼 icon be visible but inert, visible with a "곧 만나요!" toast, or hidden?
    - **Recommend** visible but fires a `Toast("곧 만나요!")` noop, consistent with the inactive-tab pattern used in REQ-008. This avoids a dead tap with no feedback. REQ-011 will replace the noop with the real handler.

## Dependency Check

| Dep | Status in index | What REQ-009 uses from it |
|---|---|---|
| REQ-002 | DONE | `DiaryEntry` type, `upsertDiary(entry)`, `deleteDiary(date)`, `getDiaryByDate(date)`, `MoodId` type |
| REQ-003 | DONE | `MoodIcon` component (mood display in editor body), `MOODS` array (passed to `MoodPickerSheet` via that component) |
| REQ-005 | DONE | `BottomSheet` (⋯ more menu shell), `Toast` + `useToast` (save toast), `ConfirmDialog` (unsaved-changes guard + delete confirm), `IconButton` (header buttons, toolbar buttons) |
| REQ-006 | DONE | `Routes` constants (`Routes.list` for the list-nav menu item), history-stack navigation model (`router.back()` from `next/navigation`, same pattern as `useRouterBack` established in REQ-006) |
| REQ-008 | DONE | `MoodPickerSheet` (both `mode='initial'` auto-open and `mode='change'` re-open), `MoodPickerSheetProps` interface |

All five declared dependencies are DONE in the index. No forward dependencies are blocked. REQ-009 is the first real consumer of `MoodPickerSheet` (REQ-008) — the integration is expected and the API contract is fully documented in `/Users/jay/Documents/Projects/ai_diary/.agent-state/04-api-contract.md`.

Carry-forward items from REQ-008 code review (noted in `/Users/jay/Documents/Projects/ai_diary/.agent-state/00-git-safety.md`):
- NB-1: Escape key may not fire `onCancelInitial` in `mode='initial'` — the editor's `onCancelInitial` handler calls `router.back()`, so if Escape does not fire it, the back-navigation guard is bypassed. Implementer should verify and fix opportunistically.
- NB-2: `MoodPickerSheet.tsx` is 129 lines — extract `MoodPickerTabs` if REQ-009 integration adds further lines to the file.
- NB-3: Minor test-quality issue in REQ-008 TC-2; fix when convenient.

## Verdict
PASS

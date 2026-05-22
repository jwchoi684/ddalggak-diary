# Requirement Intake — REQ-010

## Restatement

REQ-010 adds an inline horizontal date-strip that drops down inside the diary editor when the user taps the date text (or its `▾` chevron). The strip shows 7–10 days at a time, scrollable left/right. Each day cell renders a small MoodIcon if a diary entry exists for that date, or a plain day number if not; the currently viewed date is highlighted. Tapping a different day triggers an autosave of any unsaved changes (reusing REQ-009's existing save logic) and then loads that day's entry — opening the mood-picker modal automatically if no entry exists yet. The strip closes when tapped again. No data loss is permitted at any point during date switching.

## In Scope

- `HorizontalDatePicker` component (new component, added to `src/design-system/` or `src/app/diary/[date]/_components/` depending on generality) that renders the scrollable date strip
- Toggle open/close state managed within the editor (local UI state, no router change)
- Per-cell display logic: `MoodIcon` (small size variant, REQ-003) when entry exists; numeric day label otherwise
- Current-date cell highlight using the primary brand color `#F5C896`
- Date-switch flow: call REQ-009's save function → await completion → load target date's entry (or blank + mood modal)
- Integration point in `src/app/diary/[date]/page.tsx` or its child component

## Out of Scope (with pointer to owner REQ if known)

- Month/year picker — explicitly deferred to P1 (no REQ assigned yet; noted in PRD §13.2 exclusion list)
- Virtual/windowed list rendering — explicitly marked non-goal in REQ-010
- Photo carousel in the editor — REQ-011
- Full-screen photo viewer — REQ-012
- Any backend, database, or API changes — none required

## Invariants

1. Save-before-switch is mandatory and must be atomic from the user's perspective: the target date must not load until the save of the current date's entry has resolved successfully. No optimistic switch.
2. The save function invoked during date-switch must be the same function (or exported module) used by REQ-009's 1-second debounce and explicit ✓ save — no parallel save implementation.
3. Switching to a date with no existing entry must trigger the mood-picker modal (REQ-008) automatically, mirroring the "calendar empty date" entry context defined in REQ-009 §4.3.8.
4. MoodIcon must be used at a "small" size variant — the same `MoodIcon` component from REQ-003, not a re-implementation. Size prop or variant must match whatever the calendar (REQ-007) already uses for small rendering.
5. The dropdown is inline (no overlay, no history-stack push, no URL change). Closing returns state to the parent editor screen with no navigation event.
6. Highlighted current date uses `#F5C896` (primary brand accent) consistent with the "today's date underline / active save state" usage documented in CLAUDE.md §Visual language constraints.
7. All UI copy (e.g., any labels, aria descriptions) must be Korean.
8. The strip component must stay within the 100-line file-size rule; if it grows beyond that, split cells, scroll container, and toggle hook into separate files.
9. The 1-per-day rule (PRD §9, CLAUDE.md confirmed decisions) applies: if a target date already has an entry, load it; never create a second entry.
10. Future dates are allowed as navigation targets (consistent with REQ-009 allowing future-date writing).

## Open Questions and Recommended Defaults

1. **Drawer height and animation**: PRD §4.3.4 says "inline dropdown" but gives no height or animation spec. Recommended default: fixed height ~72px (single row of day cells), slide-down CSS transition ~150ms, no spring/bounce. This keeps it lightweight and consistent with the bottom-sheet pattern from REQ-008.

2. **Scroll range bounds**: How many days back/forward should the strip extend? PRD says "7–10 days visible" but doesn't cap the scrollable range. Recommended default: center on the current date, allow scrolling 30 days in either direction (roughly one month each way), consistent with a natural mental model. No lazy loading needed.

3. **Today highlight vs. selected-date highlight**: Two potentially different emphases (today's calendar date vs. the date currently being edited). Recommended default: the currently edited date gets the `#F5C896` underline/pill highlight; today's calendar date (if different) gets a subtle dot indicator below the number, using the same secondary dot pattern the main calendar (REQ-007) likely already uses.

4. **Autosave-vs-confirm on date switch**: REQ-010 says "자동 저장 후 이동 또는 확인 모달" — the PRD gives both options. Recommended default: always autosave silently (no confirm dialog), matching the spirit of the autosave-first principle in REQ-009 and eliminating friction. Reserve the confirm modal for cases where save fails.

5. **Save failure handling**: What happens if the autosave throws (e.g., localStorage quota exceeded)? Recommended default: show an error toast ("저장에 실패했어요. 다시 시도해주세요."), block the date switch, keep the strip open. Do not lose the unsaved text.

6. **Strip position in DOM relative to the date line**: Does the strip push content down (reflow) or overlay it? Recommended default: push content down (reflow), so the textarea scrolls naturally below the expanded strip. An absolute overlay would obscure the mood icon or text.

7. **Empty mood for existing entry**: If an entry exists but has no mood set (data edge case), what renders in the cell? Recommended default: render a neutral placeholder (e.g., `•` dot), never crash. MoodIcon should already handle an undefined/null mood gracefully per REQ-003.

8. **Keyboard / accessibility**: No explicit a11y requirement in the PRD for this strip. Recommended default: add `role="listbox"`, `aria-label="날짜 선택"`, and `aria-selected` on the active cell. Minimal but correct.

## CLAUDE.md Constraints in Effect

- **UI reuse rule**: Check `src/design-system/` first. `MoodIcon` (REQ-003) must be reused at small size. Any scroll container or pill/chip pattern already in the design system must be reused before creating new ones.
- **File size rule**: Each new file must stay under ~100 lines. Natural splits: `HorizontalDatePicker.tsx` (container + scroll), `DateCell.tsx` (individual cell), `useHorizontalDatePicker.ts` (toggle + save-then-switch logic).
- **Visual language**: Background `#FAF6EE`, text `#2A2A2A`, accent `#F5C896` for selected state. Pastel mood colors from the 10-mood master table — no new colors invented. Card radius 16–20px if the strip has a container card.
- **Korean copy**: All user-visible strings in Korean.
- **No new storage keys**: REQ-002 fixed the localStorage schema. This feature reads existing diary entries — it must not introduce new keys.

## Risks / Edge Cases

- **Data loss on date switch**: The primary risk (rated Medium in REQ-010). The save-before-switch invariant (Invariant 1) must be enforced by the implementation, not assumed.
- **Concurrent autosave + manual switch**: If the 1-second debounce timer is mid-flight when the user taps a new date, the manual switch must cancel or flush the debounce and await the resulting save before switching.
- **MoodIcon size consistency**: If REQ-007 (calendar) and REQ-003 define the "small" size variant differently, this feature could produce visual inconsistency. The design agent should verify the existing size prop values before specifying new ones.
- **First-launch no entries**: If the user has no diary entries at all, the entire visible strip renders only numeric labels. This must not trigger any error path — the strip should degrade gracefully to all-numbers.
- **Very old / very future dates in strip**: Date cells at the edges of a 60-day scrollable window will almost certainly have no entries. This is fine and expected per the default in OQ-2.

## Dependency Check

| Dependency | Status in Index | Assessment |
|---|---|---|
| REQ-002 (data layer / localStorage) | DONE | Confirmed. Storage keys and diary schema are locked. |
| REQ-003 (MoodIcon component) | DONE | Confirmed. Small-size variant must be verified in existing implementation. |
| REQ-005 (design system primitives) | DONE | Confirmed. Tokens and component patterns are available. |
| REQ-009 (editor, save logic) | DONE | Confirmed. The save function exists and must be reused. |

All four dependencies are DONE. No blocked prerequisite.

## Verdict
PASS

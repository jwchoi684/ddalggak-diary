# Architecture Report — REQ-020

## Summary
Additive feature. Existing `MOODS` array and `MoodIcon` system are mature and the right extension points. No new infra. Storage type widens to a union; no migration.

## Codebase Map

- `src/lib/storage/types.ts` — `MoodId`, `Mood`, `DiaryEntry.mood`. Need to add `ActivityId`, `PickerId` union, widen `DiaryEntry.mood`.
- `src/lib/storage/index.ts` — barrel; add new exports.
- `src/design-system/moods.ts` (47 lines) — `MOODS` / `MOOD_MAP` / `getMood`. Add `ACTIVITIES` to new `activities.ts` sibling (avoid 100-line growth here).
- `src/design-system/activities.ts` — **NEW** — mirror moods.ts pattern.
- `src/design-system/picker.ts` — **NEW** — `getPickerItem` unified lookup + helpers.
- `src/design-system/MoodIcon.tsx` (69) — widen `id` prop to `PickerId`; use `getPickerItem`.
- `src/design-system/MoodPickerSheet.tsx` (130) — already over 100 line guideline. Need: activate 일상 sub-tab, render grid based on selected sub-tab, rename `selectedMoodId` → `selectedId`, widen callback type.
- `src/lib/ai/serializeDiaries.ts` — swap `MOOD_MAP` for `getPickerItem`.

## Consumer impact (callers of `MoodId`)
- `EditorBody.tsx` — reads `state.mood: PickerId` → passes to `<MoodIcon id={...} />`. Just type widening.
- `CalendarDayCell.tsx`, `DateCell.tsx`, `DiaryListCard.tsx`, `PhotoCarousel.tsx` (irrelevant) — render `<MoodIcon>` from `entry.mood`. Type widening is sufficient.
- `useMoodStats.ts` — counts by mood id. Activities counted same way. Resulting `mood.color` lookup must use `getPickerItem`.
- `Editor.tsx` — `state.mood` → `upsertDiary({...mood: state.mood})`. Type widening only.
- `useEditorState.ts` — `EditorState.mood: PickerId | undefined`.

## Test impact
- `moods.test.ts` — unchanged (10 items remain).
- New `activities.test.ts` — 8 items, ACTIVITY_MAP completeness, getActivityItem throws on unknown.
- `MoodPickerSheet.test.tsx` — must add cases for 일상 sub-tab content + selection callback.
- `useEditorState.test.ts` — should accept activity ID in LOAD_ENTRY / SET_MOOD.
- E2E: existing specs use feeling moods only, should continue passing.

## File budget
- New: `activities.ts` ~50 lines, `picker.ts` ~25 lines.
- Modified: `moods.ts` unchanged structurally, `types.ts` +5 lines, `MoodPickerSheet.tsx` +20-30 lines (sub-tab state + activity grid render). Total `MoodPickerSheet.tsx` ~160 — already over budget; acceptable per pattern of editor screens.

## Risks
- Color collisions between feeling and activity palettes — pick distinct pastels (see intake Q2).
- LLM serializer must use new unified lookup or it'll throw "Unknown MoodId" for activities. Single line swap.
- Stats chart: now mixes feelings + activities — visually OK, label clarity could be a UX concern. Accepted per intake Q7.

## Verdict
PASS

# Frontend Implementation — REQ-020

## Summary

REQ-020 (daily activity icons in mood picker) is fully implemented. The feature activates the previously-stub "일상" sub-tab in `MoodPickerSheet` by shipping 8 fixed daily-activity items (식사/운동/공부/카페/산책/여행/휴식/일/업무). A unified `PickerId = MoodId | ActivityId` type threads through the storage layer, editor state, picker sheet, mood icon renderer, and AI serializer. All 417 existing tests continue to pass; 19 new test cases were added across 3 new/updated test files.

## Files Changed

### New files (2 source + 2 test)
| File | Lines |
|---|---|
| `src/design-system/activities.ts` | 45 |
| `src/design-system/picker.ts` | 32 |
| `src/design-system/__tests__/activities.test.ts` | 55 |
| `src/design-system/__tests__/picker.test.ts` | 54 |

### Modified files (9)
| File | Lines | Change |
|---|---|---|
| `src/lib/storage/types.ts` | 220 | Added `ActivityId`, `Activity`, `PickerId`; widened `DiaryEntry.mood` from `MoodId` to `PickerId` |
| `src/lib/storage/index.ts` | 48 | Exported `ActivityId`, `Activity`, `PickerId` from barrel |
| `src/design-system/MoodIcon.tsx` | 74 | Widened `id` prop to `PickerId`; uses `getPickerItem` instead of `MOOD_MAP` |
| `src/design-system/MoodPickerSheet.tsx` | 163 | Renamed `selectedMoodId`→`selectedId`; added `activeCategory` state; wired 일상 sub-tab; renders ACTIVITIES or MOODS grid based on active category |
| `src/design-system/__tests__/MoodPickerSheet.test.tsx` | 158 | Renamed prop; removed stale 일상-toast expectation; added MPS-N and MPS-N+1 |
| `src/lib/ai/serializeDiaries.ts` | 36 | Replaced `MOOD_MAP` lookup with `getPickerItem` |
| `src/lib/hooks/useEditorState.ts` | 119 | Widened `EditorState.mood` and `SET_MOOD` action to `PickerId` |
| `src/lib/hooks/useHorizontalDatePicker.ts` | 104 | Widened `AutosaveValue.mood` to `PickerId` |
| `src/app/stats/_components/useMoodStats.ts` | 46 | Widened accumulator to `Partial<Record<PickerId, number>>` |

Implicitly covered by type propagation (no logic change, just type annotation updates):
- `src/app/diary/[date]/_components/Editor.tsx` — `selectedMoodId` → `selectedId` rename at MoodPickerSheet call site
- `src/app/diary/[date]/_components/EditorBody.tsx` — `mood` prop type widened from `MoodId` to `PickerId`

## Behavior Added

- **"일상" sub-tab is now active.** Tapping it switches the picker grid from the 10 feeling moods to the 8 daily-activity icons. Tapping "기분" switches back.
- **Sheet always resets to "기분" sub-tab** on each open (spec invariant Q4 — implemented via `useRef`-tracked open transition).
- **Selecting an activity** writes an `ActivityId` (e.g. `'meal'`) into `DiaryEntry.mood` via the same `SET_MOOD` → `upsertDiary` path as moods. No localStorage migration required.
- **MoodIcon renders activity emoji** — `getPickerItem` is the single lookup boundary; all callers unchanged.
- **AI serializer** now handles activity entries without throwing; falls back to raw id string on completely unknown values.
- **"테마" tab** continues to show the 곧 만나요! toast (unchanged).
- **Stats hook** continues to count only mood entries; activity entries accumulate in the raw map but are silently excluded because `MOODS.filter` drives the output array (per intake Q7).

## Existing Patterns Reused

- `MOODS` / `MOOD_MAP` / `getMood` pattern mirrored exactly in `activities.ts` (`ACTIVITIES` / `ACTIVITY_MAP` / `getActivityItem`).
- `satisfies readonly T[]` TypeScript pattern from `moods.ts` applied to `ACTIVITIES`.
- `useToast` + `Toast` component for inactive-tab feedback — no new UI library.
- `BottomSheet` / `IconButton` from design system — no new modal primitives.
- `useAutosave` + `useEditorState` reducer pattern — type-widened only.

## Tests Added / Updated

| File | Cases | Description |
|---|---|---|
| `src/design-system/__tests__/activities.test.ts` | 5 | AC1–AC4 from plan + Korean label check |
| `src/design-system/__tests__/picker.test.ts` | 7 | PC1–PC3 + exhaustive isActivityId coverage for all 18 ids |
| `src/design-system/__tests__/MoodPickerSheet.test.tsx` | +2 new | MPS-N: 일상 grid shows 8 activities; MPS-N+1: onSelect fires with ActivityId |
| `src/design-system/__tests__/MoodPickerSheet.test.tsx` | 1 updated | `selectedMoodId` → `selectedId`; 일상-toast test scoped to 테마 only |

Total: 417 tests passed (62 test files, up from 398 / 59 in REQ-019).

## Commands Run

```
npx tsc --noEmit            # 0 errors
npm run lint                # 0 warnings, 0 errors
npx vitest run --reporter=basic  # 417 passed / 0 failed (62 files)
```

## Risks / Follow-ups

- **`useMoodStats` activity exclusion**: Activity-tagged entries are silently ignored in the counts output because the output array is driven by `MOODS.filter`. If a future REQ wants a combined or split chart, the hook will need rework. Accepted per intake Q7.
- **`moods.test.ts` acceptance grep**: Guards that mood emoji don't appear outside `moods.ts`. Activity emoji (🍽️ 🏃 📚 etc.) live in `activities.ts` and are not covered by this guard. A follow-up guard for activity emoji could be added.
- **`MoodPickerSheet.tsx` is 163 lines** — slightly over the 100-line soft guideline. Acceptable per architecture report note; the internal `MoodPickerTabs` sub-component could be extracted if it grows further.

## Verdict
PASS

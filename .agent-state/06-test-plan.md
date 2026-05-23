# Test Plan — REQ-020

## New unit tests

### `src/design-system/__tests__/activities.test.ts` (~4 cases)
- AC1: ACTIVITIES has exactly 8 unique ids
- AC2: All colors are valid 6+1 hex (#XXXXXX or 7-char incl '#')
- AC3: ACTIVITY_MAP completeness and equality with ACTIVITIES.length
- AC4: getActivityItem throws on unknown id (bypass via `as any`)

### `src/design-system/__tests__/picker.test.ts` (~3 cases)
- PC1: getPickerItem('joy') returns the joy Mood
- PC2: getPickerItem('meal') returns the meal Activity
- PC3: isActivityId('joy')=false, isActivityId('meal')=true

## Extended tests

### `src/design-system/__tests__/MoodPickerSheet.test.tsx`
- Add MPS-N: tap "일상" sub-tab → grid shows 8 ACTIVITIES items (not the 10 moods)
- Add MPS-N+1: selecting an activity fires onSelect with the ActivityId
- Existing cases remain valid (selectedMoodId → selectedId rename)

## Compatibility / regression
- All existing tests pass after prop rename + type widening.
- `MoodIcon`, `serializeDiariesForLLM`, `Editor`, `useEditorState` tests should remain green.

## Mock strategy
- Pure constant tests need no mocks.
- MoodPickerSheet test uses existing happy-dom + showModal mock pattern.

## Verdict
PASS

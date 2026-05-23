# Technical Design — REQ-020

## Implementation Strategy
Type-widening + additive lookup. Single union type `PickerId = MoodId | ActivityId`. All mood-handling code uses unified `getPickerItem`. No migration.

## Files

### NEW
**`src/lib/storage/types.ts`** additions:
```ts
export type ActivityId =
  | 'meal' | 'exercise' | 'study' | 'cafe'
  | 'walk' | 'travel' | 'rest' | 'work';
export type PickerId = MoodId | ActivityId;

export interface Activity {
  id: ActivityId;
  emoji: string;
  label: string;
  color: string;
}

// DiaryEntry.mood: MoodId  → MoodId | ActivityId  (widen)
mood: PickerId;
```

**`src/design-system/activities.ts`** (mirror moods.ts):
```ts
export const ACTIVITIES = [
  { id: 'meal',    emoji: '🍽️', label: '식사',   color: '#FFD6A5' },
  { id: 'exercise',emoji: '🏃', label: '운동',   color: '#CAFFBF' },
  { id: 'study',   emoji: '📚', label: '공부',   color: '#BDE0FE' },
  { id: 'cafe',    emoji: '☕', label: '카페',   color: '#D4A5A5' },
  { id: 'walk',    emoji: '🚶', label: '산책',   color: '#B9FBC0' },
  { id: 'travel',  emoji: '✈️', label: '여행',   color: '#A0C4FF' },
  { id: 'rest',    emoji: '😴', label: '휴식',   color: '#E0BBE4' },
  { id: 'work',    emoji: '💼', label: '일/업무', color: '#C8C8C8' },
] satisfies readonly Activity[];

export const ACTIVITY_MAP = Object.fromEntries(
  ACTIVITIES.map((a) => [a.id, a])
) as Record<ActivityId, Activity>;

export function getActivityItem(id: ActivityId): Activity { … }
```

**`src/design-system/picker.ts`**:
```ts
export type PickerItem = Mood | Activity;
export function getPickerItem(id: PickerId): PickerItem { … }
export function isActivityId(id: PickerId): id is ActivityId { … }
```

### MODIFIED
- **`src/lib/storage/index.ts`** — export `ActivityId`, `PickerId`, `Activity`.
- **`src/design-system/MoodIcon.tsx`** — `id: PickerId`, uses `getPickerItem`.
- **`src/design-system/MoodPickerSheet.tsx`** — add `activeCategory: 'feeling' | 'activity'` local state (default 'feeling'). Activate "일상" sub-tab. Render grid from `MOODS` or `ACTIVITIES` based on category. Rename `selectedMoodId` → `selectedId: PickerId`. Widen `onSelect: (id: PickerId) => void`.
- **`src/lib/ai/serializeDiaries.ts`** — replace `MOOD_MAP[entry.mood]` with `getPickerItem(entry.mood)`.
- **`useEditorState.ts`** — `EditorState.mood: PickerId | undefined`. SET_MOOD action carries `PickerId`.
- **`Editor.tsx`** — `selectedId={state.mood}` instead of `selectedMoodId`.

## Implementation Order
1. `types.ts` — new types + widen DiaryEntry.mood
2. `activities.ts` + tests
3. `picker.ts` + tests
4. `storage/index.ts` exports
5. `MoodIcon.tsx`
6. `serializeDiaries.ts`
7. `useEditorState.ts` + Editor.tsx prop rename
8. `MoodPickerSheet.tsx` — sub-tab activation
9. MoodPickerSheet test extensions
10. Full verification

## Backward Compatibility
- Existing diary entries (`mood: MoodId`) continue to load — MoodId is a subtype of PickerId.
- Stored values never change; only the runtime widens.
- No JSON schema change, no migration.

## Risks
- `MoodPickerSheet.selectedMoodId` rename — callers update simultaneously (single caller: `Editor.tsx`).
- File-size on MoodPickerSheet grows; acceptable for MVP.

## Performance / Infra
- Not relevant (additive constants, no I/O changes).

## Verdict
PASS

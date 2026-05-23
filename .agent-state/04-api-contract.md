# API Contract — REQ-020

## Type Surface (TypeScript only, no HTTP)

### `src/lib/storage/types.ts`
```ts
export type ActivityId = 'meal'|'exercise'|'study'|'cafe'|'walk'|'travel'|'rest'|'work';
export type PickerId   = MoodId | ActivityId;

export interface Activity {
  id: ActivityId;
  emoji: string;
  label: string;
  color: string;   // pastel hex
}

export interface DiaryEntry {
  // …
  mood: PickerId;  // widened from MoodId
}
```

### `src/design-system/activities.ts`
```ts
export const ACTIVITIES: readonly Activity[]
export const ACTIVITY_MAP: Record<ActivityId, Activity>
export function getActivityItem(id: ActivityId): Activity  // throws on unknown
```

### `src/design-system/picker.ts`
```ts
export type PickerItem = Mood | Activity
export function getPickerItem(id: PickerId): PickerItem    // throws on unknown
export function isActivityId(id: PickerId): id is ActivityId
```

### `src/design-system/MoodIcon.tsx`
```ts
interface MoodIconProps { id: PickerId; size: number; className?: string; }
```

### `src/design-system/MoodPickerSheet.tsx` (prop rename)
```ts
interface MoodPickerSheetProps {
  open: boolean;
  date: string;
  selectedId?: PickerId;             // was selectedMoodId?: MoodId
  mode: 'initial' | 'change';
  onSelect: (id: PickerId) => void;  // widened from MoodId
  onClose: () => void;
  onCancelInitial?: () => void;
}
```

## Storage
- localStorage key unchanged.
- `DiaryEntry.mood` value space grows from 10 MoodIds to 18 PickerIds.
- Existing entries valid.
- No new keys / no migration.

## Korean Strings
- Sub-tab labels existing: 기분 / 일상 (no change).
- New activity labels: 식사 / 운동 / 공부 / 카페 / 산책 / 여행 / 휴식 / 일/업무.

## Caller Invariants
1. `MoodIcon` is sole emoji rendering boundary. Callers pass `PickerId` only.
2. `getPickerItem` is the canonical mood/activity lookup. Direct `MOOD_MAP` access deprecated.
3. `MoodPickerSheet.onSelect` receives `PickerId`.
4. `DiaryEntry.mood` always set (required field unchanged).

## Backward Compatibility
- MoodId is a subtype of PickerId — all existing call sites compile without change.
- One rename (`selectedMoodId` → `selectedId`) — single call site in `Editor.tsx`.

## Verdict
PASS

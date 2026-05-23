import type { Mood, Activity, ActivityId, PickerId } from '@/lib/storage';
import { MOOD_MAP } from '@/design-system/moods';
import { ACTIVITY_MAP } from '@/design-system/activities';

/**
 * Union display record returned by getPickerItem.
 * Callers that need to distinguish feeling vs activity should use isActivityId.
 */
export type PickerItem = Mood | Activity;

/**
 * Unified lookup for both moods and activities.
 * This is the canonical accessor — prefer this over direct MOOD_MAP / ACTIVITY_MAP access.
 *
 * @param id  - Any PickerId (MoodId or ActivityId).
 * @returns     The matching Mood or Activity record.
 * @throws {Error} "Unknown PickerId: ${id}" when the id is not recognised at runtime.
 */
export function getPickerItem(id: PickerId): PickerItem {
  const item = (MOOD_MAP as Record<string, Mood>)[id] ?? (ACTIVITY_MAP as Record<string, Activity>)[id];
  if (!item) {
    throw new Error(`Unknown PickerId: ${id}`);
  }
  return item;
}

/**
 * Type guard: returns true when id is one of the 8 ActivityId literals.
 */
export function isActivityId(id: PickerId): id is ActivityId {
  return id in ACTIVITY_MAP;
}

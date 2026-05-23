import type { Activity, ActivityId } from '@/lib/storage';

/**
 * Master list of all 8 daily-activity records defined in REQ-020.
 * Order is preserved (meal → work) for picker UIs that iterate.
 *
 * Invariants:
 *   - ACTIVITIES.length === 8 (enforced by satisfies)
 *   - Every ActivityId literal appears exactly once
 *   - Every color is a 6-digit pastel HEX
 */
export const ACTIVITIES = [
  { id: 'meal',     emoji: '🍽️', label: '식사',   color: '#FFD6A5' },
  { id: 'exercise', emoji: '🏃', label: '운동',   color: '#CAFFBF' },
  { id: 'study',    emoji: '📚', label: '공부',   color: '#BDE0FE' },
  { id: 'cafe',     emoji: '☕', label: '카페',   color: '#D4A5A5' },
  { id: 'walk',     emoji: '🚶', label: '산책',   color: '#B9FBC0' },
  { id: 'travel',   emoji: '✈️', label: '여행',   color: '#A0C4FF' },
  { id: 'rest',     emoji: '😴', label: '휴식',   color: '#E0BBE4' },
  { id: 'work',     emoji: '💼', label: '일/업무', color: '#C8C8C8' },
] satisfies readonly Activity[];

/**
 * Record<ActivityId, Activity> derived from ACTIVITIES via Object.fromEntries at module load.
 * Use for O(1) lookups when an ActivityId is already in hand.
 */
export const ACTIVITY_MAP = Object.fromEntries(
  ACTIVITIES.map((a) => [a.id, a]),
) as Record<ActivityId, Activity>;

/**
 * Returns the Activity record for the given id.
 *
 * @param id  - An ActivityId literal.
 * @returns     The matching Activity record.
 * @throws {Error} "Unknown ActivityId: ${id}" — only reachable if the caller
 *                  bypasses TypeScript (e.g. `as unknown as ActivityId`).
 */
export function getActivityItem(id: ActivityId): Activity {
  const activity = ACTIVITY_MAP[id];
  if (!activity) {
    throw new Error(`Unknown ActivityId: ${id}`);
  }
  return activity;
}

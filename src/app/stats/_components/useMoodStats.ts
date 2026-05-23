import { useMemo } from 'react';
import type { DiaryEntry, MoodId, PickerId } from '@/lib/storage';
import { MOODS } from '@/design-system/moods';

export interface MoodCount {
  mood: MoodId;
  count: number;
}

export interface MoodStats {
  counts: MoodCount[];   // sorted count DESC, tiebreak MOODS master-array index ASC
  hasData: boolean;      // true iff counts.length > 0
  maxCount: number;      // counts[0].count, or 0 when empty
}

/**
 * Aggregates diary entries for a given month into per-mood counts.
 * Activity entries (PickerId that is not a MoodId) are excluded from the stats.
 *
 * Always call this hook unconditionally — pass [] when entries are not yet
 * ready (rules of hooks).
 *
 * @param entries   - Full DiaryEntry[] from useDiaries(). May be [] during load.
 * @param yearMonth - "YYYY-MM" string identifying the target month.
 * @returns MoodStats with counts sorted count DESC, tiebreak MOODS index ASC.
 */
export function useMoodStats(entries: DiaryEntry[], yearMonth: string): MoodStats {
  return useMemo(() => {
    const monthEntries = entries.filter((e) => e.date.slice(0, 7) === yearMonth);
    const raw: Partial<Record<PickerId, number>> = {};
    for (const e of monthEntries) {
      raw[e.mood] = (raw[e.mood] ?? 0) + 1;
    }
    const counts: MoodCount[] = MOODS
      .filter((m) => (raw[m.id] ?? 0) > 0)
      .map((m) => ({ mood: m.id, count: raw[m.id]! }))
      .sort(
        (a, b) =>
          b.count - a.count ||
          MOODS.findIndex((m) => m.id === a.mood) -
            MOODS.findIndex((m) => m.id === b.mood),
      );
    const maxCount = counts.length > 0 ? counts[0].count : 0;
    return { counts, hasData: counts.length > 0, maxCount };
  }, [entries, yearMonth]);
}

import type { Mood, MoodId } from '@/lib/storage';

/**
 * Master list of all 10 mood records matching PRD §3.4 verbatim.
 * Order is preserved (joy → embarrassed) for picker UIs that iterate.
 *
 * Invariants:
 *   - MOODS.length === 10 (enforced by satisfies)
 *   - Every MoodId literal appears exactly once
 *   - Every color is a 6-digit HEX matching --color-mood-<id> in globals.css
 */
export const MOODS = [
  { id: 'joy',        emoji: '😊', label: '기쁨', color: '#FFE066' },
  { id: 'love',       emoji: '🥰', label: '사랑', color: '#FFB3C1' },
  { id: 'excited',    emoji: '🤩', label: '설렘', color: '#FFC09F' },
  { id: 'calm',       emoji: '😌', label: '평온', color: '#B4E4B4' },
  { id: 'grateful',   emoji: '🙏', label: '감사', color: '#A8DCC9' },
  { id: 'sad',        emoji: '😢', label: '슬픔', color: '#A8C5E8' },
  { id: 'angry',      emoji: '😠', label: '화남', color: '#F4A6A6' },
  { id: 'anxious',    emoji: '😰', label: '불안', color: '#C4B5E0' },
  { id: 'tired',      emoji: '😪', label: '피곤', color: '#C8CCD4' },
  { id: 'embarrassed',emoji: '😳', label: '당황', color: '#F5C896' },
] satisfies readonly Mood[];

/**
 * Record<MoodId, Mood> derived from MOODS via Object.fromEntries at module load.
 * Use for O(1) lookups when a MoodId is already in hand.
 */
export const MOOD_MAP = Object.fromEntries(
  MOODS.map((m) => [m.id, m]),
) as Record<MoodId, Mood>;

/**
 * Returns the Mood record for the given id.
 *
 * @param id  - A MoodId literal. Enforced by TypeScript at call sites.
 * @returns     The matching Mood record.
 * @throws {Error} "Unknown MoodId: ${id}" — only reachable if the caller
 *                  bypasses TypeScript (e.g. `as unknown as MoodId`).
 */
export function getMood(id: MoodId): Mood {
  const mood = MOOD_MAP[id];
  if (!mood) {
    throw new Error(`Unknown MoodId: ${id}`);
  }
  return mood;
}

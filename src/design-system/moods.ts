import type { Mood, MoodId } from '@/lib/storage';

/**
 * Master list of 20 mood records — the illustrated set shipped under
 * /public/moods/<id>.png. Order is the user-facing picker order.
 *
 * The legacy 'grateful' id (PRD §3.4) stays in the MoodId union for backward
 * compatibility with already-saved entries, but it is intentionally absent
 * from MOODS so the picker never offers it again.
 *
 * Invariants:
 *   - MOODS.length === 20
 *   - Every entry's `id` maps to /public/moods/<id>.png
 *   - emoji is a fallback used when the image fails to load
 */
export const MOODS = [
  { id: 'joy',         emoji: '😊', label: '행복', color: '#FFE066' },
  { id: 'excited',     emoji: '🥰', label: '설렘', color: '#FFB3C1' },
  { id: 'calm',        emoji: '😌', label: '평온', color: '#B4E4B4' },
  { id: 'sleepy',      emoji: '😴', label: '졸림', color: '#B6E0FA' },
  { id: 'tired',       emoji: '😪', label: '피곤', color: '#C4B5E0' },
  { id: 'annoyed',     emoji: '😤', label: '짜증', color: '#F8C97A' },
  { id: 'angry',       emoji: '😠', label: '화남', color: '#F4A6A6' },
  { id: 'sad',         emoji: '😢', label: '슬픔', color: '#A8C5E8' },
  { id: 'depressed',   emoji: '😞', label: '우울', color: '#86B886' },
  { id: 'anxious',     emoji: '😰', label: '걱정', color: '#9CDDDD' },
  { id: 'embarrassed', emoji: '😳', label: '당황', color: '#FFB3D9' },
  { id: 'hurt',        emoji: '🤕', label: '아픔', color: '#E0BEAA' },
  { id: 'sick',        emoji: '😷', label: '감기', color: '#D9CAB3' },
  { id: 'shy',         emoji: '☺️', label: '민망', color: '#C9B6E0' },
  { id: 'surprised',   emoji: '😮', label: '놀람', color: '#B5D6F5' },
  { id: 'love',        emoji: '🥰', label: '심쿵', color: '#FFB3C1' },
  { id: 'listless',    emoji: '😑', label: '무기력', color: '#8FA4B9' },
  { id: 'frustrated',  emoji: '😣', label: '답답', color: '#F2A286' },
  { id: 'proud',       emoji: '😊', label: '뿌듯', color: '#FFD966' },
  { id: 'focused',     emoji: '😐', label: '집중', color: '#A9D5B5' },
] satisfies readonly Mood[];

export const MOOD_MAP = Object.fromEntries(
  MOODS.map((m) => [m.id, m]),
) as Record<MoodId, Mood>;

/**
 * Legacy fallback for ids no longer in MOODS (currently only 'grateful').
 * Returned by getMood so old entries don't blow up the renderer.
 */
const LEGACY_MOODS: Record<string, Mood> = {
  grateful: { id: 'grateful', emoji: '🙏', label: '감사', color: '#A8DCC9' },
};

export function getMood(id: MoodId): Mood {
  const mood = MOOD_MAP[id] ?? LEGACY_MOODS[id];
  if (!mood) {
    throw new Error(`Unknown MoodId: ${id}`);
  }
  return mood;
}

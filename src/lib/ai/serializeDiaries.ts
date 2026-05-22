import type { DiaryEntry } from '@/lib/storage';
import { MOOD_MAP } from '@/design-system/moods';

/**
 * Serializes diary entries to a plain-text string for LLM context injection.
 *
 * Format per entry (PRD §4.6.5):
 *   [YYYY-MM-DD] 기분: {moodLabel}({moodEmoji}) | 본문: {text}
 *
 * Entries are sorted ascending by date so the LLM sees chronological context.
 * Returns an empty string when the entries array is empty.
 *
 * @param entries - DiaryEntry array. Order is not assumed; sorted internally.
 * @returns Multi-line string with one entry per line, or '' when empty.
 */
export function serializeDiariesForLLM(entries: DiaryEntry[]): string {
  if (entries.length === 0) return '';

  const sorted = [...entries].sort((a, b) => a.date.localeCompare(b.date));

  return sorted
    .map((entry) => {
      const mood = MOOD_MAP[entry.mood];
      const moodLabel = mood ? mood.label : entry.mood;
      const moodEmoji = mood ? mood.emoji : '';
      const text = entry.text.trim();
      return `[${entry.date}] 기분: ${moodLabel}(${moodEmoji}) | 본문: ${text}`;
    })
    .join('\n');
}

import type { DiaryEntry } from '@/lib/storage';
import { getPickerItem } from '@/design-system/picker';

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
      let moodLabel: string = entry.mood;
      let moodEmoji = '';
      try {
        const item = getPickerItem(entry.mood);
        moodLabel = item.label;
        moodEmoji = item.emoji;
      } catch {
        // Unknown picker id — fall back to raw id string
      }
      const text = entry.text.trim();
      return `[${entry.date}] 기분: ${moodLabel}(${moodEmoji}) | 본문: ${text}`;
    })
    .join('\n');
}

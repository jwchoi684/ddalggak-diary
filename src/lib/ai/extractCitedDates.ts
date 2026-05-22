/**
 * Extracts diary entry IDs from an LLM response text by matching YYYY-MM-DD dates
 * against the set of known diary entry dates.
 *
 * Algorithm (PRD §REQ-017):
 *   1. Find all \d{4}-\d{2}-\d{2} patterns in responseText.
 *   2. Cross-reference each matched date against entryDateMap keys.
 *   3. Collect the corresponding entry IDs (deduplicated, order-preserving).
 *
 * @param responseText - The raw assistant response string.
 * @param entryDateMap - Map from "YYYY-MM-DD" → entry id for all existing entries.
 * @returns Array of diary entry ids that were cited. May be empty.
 */
export function extractCitedDates(
  responseText: string,
  entryDateMap: Map<string, string>,
): string[] {
  const DATE_PATTERN = /\d{4}-\d{2}-\d{2}/g;
  const matches = responseText.match(DATE_PATTERN) ?? [];

  const seen = new Set<string>();
  const result: string[] = [];

  for (const date of matches) {
    const entryId = entryDateMap.get(date);
    if (entryId !== undefined && !seen.has(entryId)) {
      seen.add(entryId);
      result.push(entryId);
    }
  }

  return result;
}

/**
 * Builds the entryDateMap required by extractCitedDates from a flat array
 * of {id, date} records (typically DiaryEntry[]).
 *
 * @param entries - Array of objects with at least `id` and `date` fields.
 * @returns Map<"YYYY-MM-DD", entryId>.
 */
export function buildEntryDateMap(
  entries: Array<{ id: string; date: string }>,
): Map<string, string> {
  const map = new Map<string, string>();
  for (const entry of entries) {
    map.set(entry.date, entry.id);
  }
  return map;
}

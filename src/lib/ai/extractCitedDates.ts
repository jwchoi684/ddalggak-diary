/**
 * Extracts diary entry IDs from an LLM response text by matching date references
 * (in either ISO or Korean form) against the set of known diary entry dates.
 *
 * Algorithm (PRD §REQ-017):
 *   1. Find date references in responseText:
 *      - ISO form: YYYY-MM-DD or YYYY.M.D / YYYY.MM.DD
 *      - Korean form: "YYYY년 M월 D일" (year optional — falls back to entry year)
 *      - Short Korean: "M월 D일" without explicit year
 *   2. Normalize each match to ISO YYYY-MM-DD and cross-reference entryDateMap.
 *   3. Collect entry IDs (deduplicated, order-preserving).
 *
 * @param responseText - The raw assistant response string.
 * @param entryDateMap - Map from "YYYY-MM-DD" → entry id for all existing entries.
 * @returns Array of diary entry ids that were cited. May be empty.
 */
export function extractCitedDates(
  responseText: string,
  entryDateMap: Map<string, string>,
): string[] {
  const candidates: string[] = [];

  // 1. ISO with dashes (YYYY-MM-DD)
  for (const m of responseText.matchAll(/(\d{4})-(\d{1,2})-(\d{1,2})/g)) {
    candidates.push(toIso(m[1], m[2], m[3]));
  }

  // 2. ISO with dots (YYYY.M.D or YYYY.MM.DD)
  for (const m of responseText.matchAll(/(\d{4})\.(\d{1,2})\.(\d{1,2})/g)) {
    candidates.push(toIso(m[1], m[2], m[3]));
  }

  // 3. Korean with year ("YYYY년 M월 D일")
  for (const m of responseText.matchAll(/(\d{4})년\s*(\d{1,2})월\s*(\d{1,2})일/g)) {
    candidates.push(toIso(m[1], m[2], m[3]));
  }

  // 4. Korean without year ("M월 D일") — try every distinct year present in the entryDateMap
  const yearsInMap = new Set<string>();
  for (const key of entryDateMap.keys()) yearsInMap.add(key.slice(0, 4));
  for (const m of responseText.matchAll(/(?<![\d년])(\d{1,2})월\s*(\d{1,2})일/g)) {
    for (const year of yearsInMap) {
      candidates.push(toIso(year, m[1], m[2]));
    }
  }

  const seen = new Set<string>();
  const result: string[] = [];
  for (const date of candidates) {
    const entryId = entryDateMap.get(date);
    if (entryId !== undefined && !seen.has(entryId)) {
      seen.add(entryId);
      result.push(entryId);
    }
  }
  return result;
}

function toIso(year: string, month: string, day: string): string {
  return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
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

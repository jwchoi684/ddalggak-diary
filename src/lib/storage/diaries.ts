import { DIARIES_KEY } from './keys';
import { safeGet, safeSet } from './ssr';
import type { DiaryEntry } from './types';

/**
 * Reads all diary entries from localStorage.
 *
 * @returns Parsed array of DiaryEntry. Returns `[]` when the key is absent,
 *          when JSON is corrupt, or when the parsed value is not an array.
 *          Returns `[]` during SSR (server-side rendering) without error.
 * @throws  Never. All parse and access errors are caught internally.
 */
export function readDiaries(): DiaryEntry[] {
  const raw = safeGet(DIARIES_KEY);
  if (raw === null) return [];
  try {
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed as DiaryEntry[];
  } catch {
    return [];
  }
}

/**
 * Replaces the entire diaries collection in localStorage with the given array.
 *
 * @param entries - The complete replacement array. Pass `[]` to clear all entries.
 * @returns void
 * @throws  `DOMException` (`QuotaExceededError`) when localStorage quota is
 *          exhausted. Not caught — propagates to caller.
 *          No-op during SSR.
 */
export function writeAllDiaries(entries: DiaryEntry[]): void {
  safeSet(DIARIES_KEY, JSON.stringify(entries));
  // Same-tab notify — `storage` event only fires in OTHER tabs by spec, so we
  // dispatch one ourselves. Hooks (useDiaries, useConversations, …) listen for
  // it to refresh after the editor writes. Guarded for node test env (no
  // window) and for envs where the StorageEvent constructor isn't mocked.
  if (typeof window !== 'undefined' && typeof StorageEvent === 'function') {
    try {
      window.dispatchEvent(new StorageEvent('storage', { key: DIARIES_KEY }));
    } catch {
      // ignore — best-effort
    }
  }
}

/**
 * Inserts or replaces a single diary entry using a two-step deduplication rule
 * to enforce the one-entry-per-day invariant (PRD §9).
 *
 * Dedup logic (applied in order):
 *   1. If an existing entry shares `entry.id` → replace that entry (edit path).
 *   2. Else if an existing entry shares `entry.date` → replace that entry
 *      (1-per-day enforcement; handles delete-and-recreate flows).
 *   3. Otherwise → append.
 *
 * @param entry - The DiaryEntry to insert or update. Must have a valid `id` and
 *                a `date` in "YYYY-MM-DD" format.
 * @returns void
 * @throws  `DOMException` (`QuotaExceededError`) when localStorage quota is
 *          exhausted. Not caught — propagates to caller.
 *          No-op during SSR.
 */
export function upsertDiary(entry: DiaryEntry): void {
  const current = readDiaries();

  const idIndex = current.findIndex((e) => e.id === entry.id);
  if (idIndex !== -1) {
    current[idIndex] = entry;
    writeAllDiaries(current);
    return;
  }

  const dateIndex = current.findIndex((e) => e.date === entry.date);
  if (dateIndex !== -1) {
    current[dateIndex] = entry;
    writeAllDiaries(current);
    return;
  }

  writeAllDiaries([...current, entry]);
}

/**
 * Removes the diary entry with the given id. No-op if no entry with that id exists.
 *
 * @param id - The `DiaryEntry.id` of the entry to remove.
 * @returns void
 * @throws  `DOMException` (`QuotaExceededError`) on the subsequent write.
 *          Not caught — propagates to caller.
 *          No-op during SSR.
 */
export function removeDiary(id: string): void {
  const current = readDiaries();
  const filtered = current.filter((e) => e.id !== id);
  if (filtered.length !== current.length) {
    writeAllDiaries(filtered);
  }
}

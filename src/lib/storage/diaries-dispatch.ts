"use client";

import type { DiaryEntry, StorageBackend } from '@/lib/storage';
import {
  readDiaries as readLocalDiaries,
  writeAllDiaries as writeAllLocalDiaries,
  upsertDiary as upsertLocalDiary,
  removeDiary as removeLocalDiary,
} from '@/lib/storage';
import {
  listDiariesRemote,
  upsertDiaryRemote,
  removeDiaryRemote,
} from '@/lib/storage/diaries-remote';

/**
 * Reads diaries from BOTH backends and merges. Each entry carries a
 * `_storedIn` marker so UI can show a badge. If the same id exists in both
 * (shouldn't happen normally), cloud wins.
 */
export async function listDiariesBoth(): Promise<DiaryEntry[]> {
  const [cloud, local] = await Promise.all([
    listDiariesRemote().catch(() => [] as DiaryEntry[]),
    Promise.resolve(readLocalDiaries()),
  ]);
  const map = new Map<string, DiaryEntry>();
  for (const e of local) map.set(e.id, { ...e, _storedIn: 'local' });
  for (const e of cloud) map.set(e.id, { ...e, _storedIn: 'cloud' }); // cloud wins
  return Array.from(map.values()).sort((a, b) => b.date.localeCompare(a.date));
}

/**
 * Writes to the user-selected backend. When updating an entry that already
 * lives in the OTHER backend (user toggled between writes), we move it: write
 * to the new backend, delete from the old.
 */
export async function upsertDiaryDispatch(
  entry: DiaryEntry,
  target: StorageBackend,
  previousBackend?: StorageBackend,
): Promise<void> {
  // Strip the read-only marker before persisting.
  const { _storedIn, ...payload } = entry;
  void _storedIn;

  if (target === 'cloud') {
    await upsertDiaryRemote(payload);
    if (previousBackend === 'local') {
      try { removeLocalDiary(payload.id); } catch { /* ignore */ }
    }
  } else {
    upsertLocalDiary(payload);
    if (previousBackend === 'cloud') {
      try { await removeDiaryRemote(payload.id); } catch { /* ignore */ }
    }
  }
}

export async function removeDiaryDispatch(
  id: string,
  backend: StorageBackend,
): Promise<void> {
  if (backend === 'cloud') {
    await removeDiaryRemote(id);
  } else {
    removeLocalDiary(id);
  }
}

// Re-exports for callers that don't need dispatching
export { writeAllLocalDiaries };

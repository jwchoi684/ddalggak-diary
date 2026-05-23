"use client";

import { useEffect, useState, useCallback } from 'react';
import type { DiaryEntry } from '@/lib/storage';
import {
  readDiaries as readLocalDiaries,
  writeAllDiaries as writeAllLocalDiaries,
} from '@/lib/storage';
import { listDiariesRemote, upsertDiaryRemote } from '@/lib/storage/diaries-remote';

const MIGRATED_KEY = 'ddalkkak:diaries:migrated-to-supabase:v1';
const DIARIES_CHANGED_EVENT = 'ddalkkak:diaries-changed';

/**
 * Diary list hook, Supabase-backed.
 *
 * - First mount: pushes any pre-existing localStorage entries to Supabase once,
 *   then reads from Supabase.
 * - Subscribes to a synthetic 'ddalkkak:diaries-changed' event so a write in
 *   the editor triggers a refresh in the calendar/list mounted earlier.
 *
 * Returns `entries: []` while in-flight (isReady=false), then the fetched list.
 */
export function useDiaries(): {
  entries: DiaryEntry[];
  isReady: boolean;
  refresh: () => Promise<void>;
} {
  const [entries, setEntries] = useState<DiaryEntry[]>([]);
  const [isReady, setIsReady] = useState(false);

  const refresh = useCallback(async () => {
    try {
      const fresh = await listDiariesRemote();
      setEntries(fresh);
    } finally {
      setIsReady(true);
    }
  }, []);

  useEffect(() => {
    let cancelled = false;

    async function init() {
      // One-time migration: push localStorage entries to Supabase, then drain.
      try {
        if (
          typeof window !== 'undefined' &&
          window.localStorage.getItem(MIGRATED_KEY) !== '1'
        ) {
          const local = readLocalDiaries();
          if (local.length > 0) {
            for (const entry of local) {
              try {
                await upsertDiaryRemote(entry);
              } catch (err) {
                // Network/auth failure — bail without marking migrated so we retry.
                console.warn('[useDiaries] migration upsert failed', err);
                return;
              }
            }
          }
          window.localStorage.setItem(MIGRATED_KEY, '1');
          writeAllLocalDiaries([]); // empty the legacy store so it can't drift
        }
      } catch (err) {
        console.warn('[useDiaries] migration check failed', err);
      }

      if (cancelled) return;
      await refresh();
    }

    init();

    function handleRefresh() {
      void refresh();
    }
    window.addEventListener(DIARIES_CHANGED_EVENT, handleRefresh);
    return () => {
      cancelled = true;
      window.removeEventListener(DIARIES_CHANGED_EVENT, handleRefresh);
    };
  }, [refresh]);

  return { entries, isReady, refresh };
}

/** Fired by Editor after every successful Supabase write. */
export function emitDiariesChanged(): void {
  if (typeof window === 'undefined') return;
  try {
    window.dispatchEvent(new CustomEvent(DIARIES_CHANGED_EVENT));
  } catch {
    // best-effort
  }
}

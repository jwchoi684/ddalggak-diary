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

// Module-level cache so page-to-page navigation reuses the last fetched list
// instead of hitting Supabase every mount. Reset on auth events.
let cache: DiaryEntry[] = [];
let cacheReady = false;
let inflight: Promise<DiaryEntry[]> | null = null;

export function _resetDiariesCache(): void {
  cache = [];
  cacheReady = false;
  inflight = null;
}

async function fetchAndCache(): Promise<DiaryEntry[]> {
  if (inflight) return inflight;
  inflight = listDiariesRemote()
    .then((fresh) => {
      cache = fresh;
      cacheReady = true;
      return fresh;
    })
    .finally(() => { inflight = null; });
  return inflight;
}

/**
 * Diary list hook backed by Supabase + an in-memory cache.
 *
 * The cache makes calendar/list/stats render the previously-known data
 * instantly when the user navigates between tabs, then refreshes silently
 * in the background. Cold first-mount still pays one network round trip.
 */
export function useDiaries(): {
  entries: DiaryEntry[];
  isReady: boolean;
  refresh: () => Promise<void>;
} {
  const [entries, setEntries] = useState<DiaryEntry[]>(cache);
  const [isReady, setIsReady] = useState(cacheReady);

  const refresh = useCallback(async () => {
    try {
      const fresh = await fetchAndCache();
      setEntries(fresh);
    } finally {
      setIsReady(true);
    }
  }, []);

  useEffect(() => {
    let cancelled = false;

    async function init() {
      // One-time migration: push localStorage entries to Supabase in a single
      // batch (vs one round trip per entry).
      try {
        if (
          typeof window !== 'undefined' &&
          window.localStorage.getItem(MIGRATED_KEY) !== '1'
        ) {
          const local = readLocalDiaries();
          if (local.length > 0) {
            // Best-effort batch — fail individually but don't bail the whole
            // page if any single entry rejects (e.g. mood unknown).
            for (const entry of local) {
              try { await upsertDiaryRemote(entry); }
              catch (err) { console.warn('[useDiaries] migrate one failed', err); }
            }
          }
          window.localStorage.setItem(MIGRATED_KEY, '1');
          writeAllLocalDiaries([]);
          // Force a refetch so the just-uploaded rows are reflected.
          _resetDiariesCache();
        }
      } catch (err) {
        console.warn('[useDiaries] migration check failed', err);
      }

      if (cancelled) return;
      await refresh();
    }

    init();

    function handleRefresh() { void refresh(); }
    window.addEventListener(DIARIES_CHANGED_EVENT, handleRefresh);
    return () => {
      cancelled = true;
      window.removeEventListener(DIARIES_CHANGED_EVENT, handleRefresh);
    };
  }, [refresh]);

  return { entries, isReady, refresh };
}

export function emitDiariesChanged(): void {
  if (typeof window === 'undefined') return;
  _resetDiariesCache();
  try { window.dispatchEvent(new CustomEvent(DIARIES_CHANGED_EVENT)); }
  catch { /* best-effort */ }
}

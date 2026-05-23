// React hook — client-only. Direct import only;
// NOT re-exported from @/lib/storage/index.ts (that barrel is SSR-safe).
"use client";

import { useEffect, useState } from 'react';
import { readDiaries, type DiaryEntry } from '@/lib/storage';

/**
 * Reads all diary entries from localStorage once on mount.
 *
 * Returns `isReady: false` on initial SSR/hydration render so callers can
 * suppress hydration-mismatch content. Transitions to `isReady: true`
 * synchronously after first effect.
 *
 * Never throws. If localStorage unavailable, `readDiaries()` returns [] and
 * `isReady` still becomes true.
 *
 * Always import via: import { useDiaries } from '@/lib/storage/useDiaries'
 */
export function useDiaries(): { entries: DiaryEntry[]; isReady: boolean } {
  const [entries, setEntries] = useState<DiaryEntry[]>([]);
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    setEntries(readDiaries());
    setIsReady(true);

    // Stay in sync with edits made in another tab AND with same-tab writes
    // dispatched as a synthetic 'storage' event by the writer. Without this,
    // a calendar/list screen rendered earlier kept showing the pre-edit mood
    // even after returning from the editor.
    function handleStorage(e: StorageEvent) {
      if (e.key === null || e.key.includes('diaries')) {
        setEntries(readDiaries());
      }
    }
    window.addEventListener('storage', handleStorage);
    return () => window.removeEventListener('storage', handleStorage);
  }, []);

  return { entries, isReady };
}

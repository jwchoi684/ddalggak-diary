import type { DiaryEntry } from '@/lib/storage/types';

const DIARIES_KEY = 'ddalkkak:diaries:v1';

/**
 * Returns an init script function (suitable for page.addInitScript) that
 * pre-seeds localStorage with the given diary entries before any page script runs.
 *
 * Usage:
 *   await page.addInitScript(seedDiariesScript([entry]));
 *   await page.goto('/diary/2026-05-15');
 */
export function seedDiariesScript(entries: DiaryEntry[]): () => void {
  const json = JSON.stringify(entries);
  // Note: this function is serialized and run in the browser context.
  // Do NOT reference any outer-scope variables (they won't be available).
  return new Function(
    `localStorage.setItem('${DIARIES_KEY}', ${JSON.stringify(json)})`,
  ) as () => void;
}

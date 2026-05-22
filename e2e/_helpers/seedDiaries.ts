import type { DiaryEntry } from '@/lib/storage/types';

const DIARIES_KEY = 'ddalkkak:diaries:v1';

/**
 * Returns an init script function (suitable for page.addInitScript) that
 * pre-seeds localStorage with the given diary entries before any page script runs.
 *
 * Overwrites the key on every navigation (including reloads).
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

/**
 * Like seedDiariesScript but only writes to localStorage when the key is absent.
 * Use this when the test navigates (or reloads) after modifying localStorage,
 * and the seed must not overwrite data the app just wrote.
 *
 * Usage:
 *   await page.addInitScript(seedDiariesOnceScript([entry]));
 *   await page.goto('/diary/2026-05-15');
 *   // ... app writes to localStorage ...
 *   await page.reload(); // seed does NOT overwrite on reload
 */
export function seedDiariesOnceScript(entries: DiaryEntry[]): () => void {
  const json = JSON.stringify(entries);
  return new Function(
    `if (!localStorage.getItem('${DIARIES_KEY}')) { localStorage.setItem('${DIARIES_KEY}', ${JSON.stringify(json)}); }`,
  ) as () => void;
}

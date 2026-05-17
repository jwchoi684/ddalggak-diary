/**
 * SSR-safe localStorage primitives.
 *
 * All collection files (diaries.ts, conversations.ts, settings.ts) call only
 * these helpers — never `window.localStorage` directly. This makes the
 * no-direct-access constraint grep-enforceable at the module level.
 */

/** Returns true when running in a server-side (non-browser) environment. */
export const isServer = (): boolean => typeof window === 'undefined';

/**
 * Safely reads a value from localStorage.
 * Returns null on SSR, on missing key, or if localStorage access throws
 * (e.g. SecurityError inside a sandboxed iframe).
 */
export const safeGet = (key: string): string | null => {
  if (isServer()) return null;
  try {
    return window.localStorage.getItem(key);
  } catch {
    return null;
  }
};

/**
 * Safely writes a value to localStorage.
 * No-op during SSR.
 * Intentionally does NOT catch QuotaExceededError — propagates to caller.
 */
export const safeSet = (key: string, value: string): void => {
  if (isServer()) return;
  window.localStorage.setItem(key, value);
};

/**
 * Safely removes a key from localStorage.
 * No-op during SSR.
 */
export const safeRemove = (key: string): void => {
  if (isServer()) return;
  window.localStorage.removeItem(key);
};

"use client";

import { useEffect } from 'react';

/**
 * useAutosave — 1-shot debounce that calls saveFn after delayMs of inactivity.
 *
 * Each render where value/delayMs/saveFn changes cancels the previous timer and
 * schedules a new one. On unmount the pending timer is cancelled — saveFn will
 * NOT be called after unmount.
 *
 * Caller invariants:
 *   INV-A1: saveFn MUST be wrapped in useCallback.
 *   INV-A2: If value is an object, memoize it with useMemo.
 *   INV-A3: delayMs should be a stable constant.
 */
export function useAutosave<T>(
  value: T,
  delayMs: number,
  saveFn: (v: T) => void,
): void {
  useEffect(() => {
    const t = setTimeout(() => saveFn(value), delayMs);
    return () => clearTimeout(t);
  }, [value, delayMs, saveFn]);
}

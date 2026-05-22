"use client";

import { useEffect, useState, useCallback } from 'react';
import { readSettings, writeSettings } from './settings';
import type { Settings } from './types';

/**
 * SSR-safe React hook that loads the user Settings object from localStorage
 * on mount and exposes a small `update` helper that shallow-merges a patch
 * back into storage and refreshes local state.
 *
 * Mirrors the read-once-on-mount pattern of useDiaries / useConversations.
 * Not re-exported from the SSR-safe `@/lib/storage` barrel — import directly.
 */
export function useSettings(): {
  settings: Settings;
  isReady: boolean;
  update: (patch: Partial<Settings>) => void;
} {
  const [settings, setSettings] = useState<Settings>({});
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    setSettings(readSettings());
    setIsReady(true);
  }, []);

  const update = useCallback((patch: Partial<Settings>) => {
    writeSettings(patch);
    setSettings((prev) => ({ ...prev, ...patch }));
  }, []);

  return { settings, isReady, update };
}

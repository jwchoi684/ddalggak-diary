"use client";

import { useEffect, useState, useCallback } from 'react';
import { readSettings, writeSettings } from './settings';
import type { Settings } from './types';

const SETTINGS_CHANGED_EVENT = 'ddalkkak:settings-changed';

/**
 * SSR-safe React hook for the user Settings object.
 *
 * Multiple components can mount this hook (e.g. OnboardingGate at the root
 * layout AND a page that calls update()) — they stay in sync via a synthetic
 * window event dispatched inside update(). Without that, only the calling
 * instance's local state was updated, which produced a redirect loop between
 * the gate and the page after the user finished onboarding.
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

    function refresh() {
      setSettings(readSettings());
    }
    // Other tabs' writes
    window.addEventListener('storage', refresh);
    // Same-tab writes (our own update())
    window.addEventListener(SETTINGS_CHANGED_EVENT, refresh);
    return () => {
      window.removeEventListener('storage', refresh);
      window.removeEventListener(SETTINGS_CHANGED_EVENT, refresh);
    };
  }, []);

  const update = useCallback((patch: Partial<Settings>) => {
    writeSettings(patch);
    setSettings((prev) => ({ ...prev, ...patch }));
    if (typeof window !== 'undefined') {
      try {
        window.dispatchEvent(new CustomEvent(SETTINGS_CHANGED_EVENT));
      } catch {
        // best-effort
      }
    }
  }, []);

  return { settings, isReady, update };
}

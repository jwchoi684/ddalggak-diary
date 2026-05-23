"use client";

import { useEffect, useState, useCallback } from 'react';
import { readSettings as readLocalSettings, writeAllSettings as writeAllLocalSettings } from './settings';
import { readSettingsRemote, writeSettingsRemote } from './settings-remote';
import type { Settings } from './types';

const SETTINGS_CHANGED_EVENT = 'ddalkkak:settings-changed';
const MIGRATED_KEY = 'ddalkkak:settings:migrated-to-supabase:v1';

/**
 * Settings hook, Supabase-backed. One row per user keyed by auth.uid.
 *
 * Same patterns as useDiaries / useConversations:
 *   - one-time migration from localStorage on first mount
 *   - cross-instance sync via 'ddalkkak:settings-changed'
 *   - update() merges + writes + broadcasts
 */
export function useSettings(): {
  settings: Settings;
  isReady: boolean;
  update: (patch: Partial<Settings>) => void;
} {
  const [settings, setSettings] = useState<Settings>({});
  const [isReady, setIsReady] = useState(false);

  const refresh = useCallback(async () => {
    try {
      const fresh = await readSettingsRemote();
      setSettings(fresh);
    } finally {
      setIsReady(true);
    }
  }, []);

  useEffect(() => {
    let cancelled = false;

    async function init() {
      try {
        if (
          typeof window !== 'undefined' &&
          window.localStorage.getItem(MIGRATED_KEY) !== '1'
        ) {
          const local = readLocalSettings();
          if (Object.keys(local).length > 0) {
            try {
              await writeSettingsRemote(local);
            } catch (err) {
              console.warn('[useSettings] migration write failed', err);
              return;
            }
          }
          window.localStorage.setItem(MIGRATED_KEY, '1');
          writeAllLocalSettings({});
        }
      } catch (err) {
        console.warn('[useSettings] migration check failed', err);
      }

      if (cancelled) return;
      await refresh();
    }

    init();

    function handleRefresh() {
      void refresh();
    }
    window.addEventListener(SETTINGS_CHANGED_EVENT, handleRefresh);
    return () => {
      cancelled = true;
      window.removeEventListener(SETTINGS_CHANGED_EVENT, handleRefresh);
    };
  }, [refresh]);

  const update = useCallback((patch: Partial<Settings>) => {
    // Optimistic local update for snappy UI.
    setSettings((prev) => ({ ...prev, ...patch }));
    void (async () => {
      try {
        await writeSettingsRemote(patch);
        if (typeof window !== 'undefined') {
          window.dispatchEvent(new CustomEvent(SETTINGS_CHANGED_EVENT));
        }
      } catch (err) {
        console.warn('[useSettings] update failed', err);
      }
    })();
  }, []);

  return { settings, isReady, update };
}

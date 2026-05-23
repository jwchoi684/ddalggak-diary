"use client";

import { useEffect, useState, useCallback } from 'react';
import { readSettings as readLocalSettings, writeAllSettings as writeAllLocalSettings } from './settings';
import { readSettingsRemote, writeSettingsRemote } from './settings-remote';
import type { Settings } from './types';

const SETTINGS_CHANGED_EVENT = 'ddalkkak:settings-changed';
const MIGRATED_KEY = 'ddalkkak:settings:migrated-to-supabase:v1';

let cache: Settings = {};
let cacheReady = false;
let inflight: Promise<Settings> | null = null;

function _resetCache() { cache = {}; cacheReady = false; inflight = null; }

async function fetchAndCache(): Promise<Settings> {
  if (inflight) return inflight;
  inflight = readSettingsRemote()
    .then((fresh) => { cache = fresh; cacheReady = true; return fresh; })
    .finally(() => { inflight = null; });
  return inflight;
}

export function useSettings(): {
  settings: Settings;
  isReady: boolean;
  update: (patch: Partial<Settings>) => void;
} {
  const [settings, setSettings] = useState<Settings>(cache);
  const [isReady, setIsReady] = useState(cacheReady);

  const refresh = useCallback(async () => {
    try {
      const fresh = await fetchAndCache();
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
            try { await writeSettingsRemote(local); }
            catch (err) { console.warn('[useSettings] migration write failed', err); }
          }
          window.localStorage.setItem(MIGRATED_KEY, '1');
          writeAllLocalSettings({});
          _resetCache();
        }
      } catch (err) {
        console.warn('[useSettings] migration check failed', err);
      }
      if (cancelled) return;
      await refresh();
    }

    init();

    function handleRefresh() { void refresh(); }
    window.addEventListener(SETTINGS_CHANGED_EVENT, handleRefresh);
    return () => {
      cancelled = true;
      window.removeEventListener(SETTINGS_CHANGED_EVENT, handleRefresh);
    };
  }, [refresh]);

  const update = useCallback((patch: Partial<Settings>) => {
    // Optimistic local update + cache write for snappy UI.
    setSettings((prev) => {
      const next = { ...prev, ...patch };
      cache = next;
      cacheReady = true;
      return next;
    });
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

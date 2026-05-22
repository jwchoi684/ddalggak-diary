import { SETTINGS_KEY } from './keys';
import { safeGet, safeSet } from './ssr';
import type { Settings } from './types';

/**
 * Reads the settings object from localStorage.
 *
 * @returns The stored Settings object, or `{}` when the key is absent or
 *          the stored value is not a non-null object.
 *          Returns `{}` during SSR.
 * @throws  Never.
 */
export function readSettings(): Settings {
  const raw = safeGet(SETTINGS_KEY);
  if (raw === null) return {};
  try {
    const parsed: unknown = JSON.parse(raw);
    if (
      typeof parsed !== 'object' ||
      parsed === null ||
      Array.isArray(parsed)
    ) {
      return {};
    }
    return parsed as Settings;
  } catch {
    return {};
  }
}

/**
 * Shallow-merges `patch` into the existing settings object and writes back.
 *
 * Equivalent to: `writeAll({ ...readSettings(), ...patch })`.
 * Keys in `patch` overwrite matching stored keys; unrelated stored keys are preserved.
 *
 * @param patch - Partial settings to merge. Must be a non-null object.
 * @returns void
 * @throws  `DOMException` (`QuotaExceededError`). Not caught.
 *          No-op during SSR.
 */
export function writeSettings(patch: Partial<Settings>): void {
  const current = readSettings();
  const merged: Settings = { ...current, ...patch };
  safeSet(SETTINGS_KEY, JSON.stringify(merged));
}

/**
 * Replaces the entire settings object with the given value.
 * Used by the backup restore flow to apply a full settings snapshot.
 *
 * @param settings - Complete replacement object.
 * @returns void
 * @throws  `DOMException` (`QuotaExceededError`). Not caught.
 *          No-op during SSR.
 */
export function writeAllSettings(settings: Settings): void {
  safeSet(SETTINGS_KEY, JSON.stringify(settings));
}

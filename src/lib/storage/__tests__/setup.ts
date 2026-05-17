import { beforeEach } from 'vitest';

/**
 * In-memory localStorage shim for Node test environment.
 *
 * Installed on both `globalThis` and `globalThis.window` so that:
 * - `typeof window !== 'undefined'` resolves to `true` (SSR guard passes)
 * - `window.localStorage` resolves to this shim
 *
 * The shim is reset before each test via `localStorage.clear()`.
 */

class LocalStorageShim {
  private store = new Map<string, string>();

  getItem(key: string): string | null {
    return this.store.has(key) ? (this.store.get(key) ?? null) : null;
  }

  setItem(key: string, value: string): void {
    this.store.set(key, value);
  }

  removeItem(key: string): void {
    this.store.delete(key);
  }

  clear(): void {
    this.store.clear();
  }

  get length(): number {
    return this.store.size;
  }

  key(index: number): string | null {
    const keys = Array.from(this.store.keys());
    return index < keys.length ? (keys[index] ?? null) : null;
  }
}

const shim = new LocalStorageShim();

// Make `typeof window !== 'undefined'` return true in the Node test environment.
// Casting through `unknown` avoids the need for the @typescript-eslint plugin.
if (typeof globalThis.window === 'undefined') {
  (globalThis as unknown as Record<string, unknown>).window = globalThis;
}

// Install the localStorage shim on globalThis and globalThis.window.
(globalThis as unknown as Record<string, unknown>).localStorage = shim;
(globalThis.window as unknown as Record<string, unknown>).localStorage = shim;

beforeEach(() => {
  shim.clear();
});

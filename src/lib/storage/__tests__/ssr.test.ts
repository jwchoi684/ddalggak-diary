import { describe, it, expect, vi, afterEach } from 'vitest';
import { isServer, safeGet, safeSet } from '@/lib/storage/ssr';

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('isServer', () => {
  it('returns false when window is defined on globalThis', () => {
    // setup.ts installs window on globalThis, so this passes by default
    expect(isServer()).toBe(false);
  });

  it('returns true when window is removed from globalThis', () => {
    vi.stubGlobal('window', undefined);
    expect(isServer()).toBe(true);
  });
});

describe('safeGet — SSR path', () => {
  it('returns null when window is undefined (SSR path)', () => {
    vi.stubGlobal('window', undefined);
    expect(safeGet('any-key')).toBeNull();
  });
});

describe('safeSet — SSR path', () => {
  it('is a no-op when window is undefined (SSR path)', () => {
    vi.stubGlobal('window', undefined);
    expect(() => safeSet('k', 'v')).not.toThrow();
  });
});

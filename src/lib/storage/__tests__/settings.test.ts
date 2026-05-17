import { describe, it, expect } from 'vitest';
import { readSettings, writeSettings } from '@/lib/storage';

const SETTINGS_KEY = 'ddalkkak:settings:v1';

describe('readSettings — resilience', () => {
  it('returns {} when the key is absent', () => {
    expect(readSettings()).toEqual({});
  });

  it('returns {} when stored value is corrupt JSON', () => {
    localStorage.setItem(SETTINGS_KEY, '{broken');
    expect(readSettings()).toEqual({});
  });

  it('returns {} when stored value is a JSON array, not an object', () => {
    localStorage.setItem(SETTINGS_KEY, '[1,2]');
    expect(readSettings()).toEqual({});
  });

  it('returns {} when stored value is JSON null', () => {
    localStorage.setItem(SETTINGS_KEY, 'null');
    expect(readSettings()).toEqual({});
  });
});

describe('writeSettings — merge behavior', () => {
  it('writes and reads back a single key', () => {
    writeSettings({ foo: 1 });
    expect(readSettings()).toEqual({ foo: 1 });
  });

  it('merges two successive writeSettings calls (both keys present)', () => {
    writeSettings({ foo: 1 });
    writeSettings({ bar: 2 });
    expect(readSettings()).toEqual({ foo: 1, bar: 2 });
  });

  it('overwrites an existing key on collision', () => {
    writeSettings({ foo: 1 });
    writeSettings({ foo: 2 });
    expect(readSettings()).toEqual({ foo: 2 });
  });

  it('preserves unrelated keys when overwriting one', () => {
    writeSettings({ a: 1, b: 1 });
    writeSettings({ b: 2 });
    expect(readSettings()).toEqual({ a: 1, b: 2 });
  });
});

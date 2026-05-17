import { describe, it, expect } from 'vitest';
import { generateId } from '@/lib/storage';

const UUID_V4_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

describe('generateId', () => {
  it('returns a non-empty string', () => {
    const result = generateId();
    expect(typeof result).toBe('string');
    expect(result.length).toBeGreaterThan(0);
  });

  it('two successive calls return different values', () => {
    expect(generateId()).not.toBe(generateId());
  });

  it('output matches UUID v4 format', () => {
    const result = generateId();
    expect(result).toMatch(UUID_V4_REGEX);
  });
});

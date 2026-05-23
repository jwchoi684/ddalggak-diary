import { describe, it, expect } from 'vitest';
import {
  MAX_PHOTO_DATAURL_BYTES,
  MAX_PHOTOS_PER_ENTRY,
} from '@/lib/storage';

describe('storage capacity constants', () => {
  it('MAX_PHOTO_DATAURL_BYTES equals 500 * 1024 (post-compression cap for iPhone uploads)', () => {
    expect(MAX_PHOTO_DATAURL_BYTES).toBe(500 * 1024);
  });

  it('MAX_PHOTOS_PER_ENTRY equals 10', () => {
    expect(MAX_PHOTOS_PER_ENTRY).toBe(10);
  });

  it('both constants are re-exported from the public index', () => {
    // Import is from '@/lib/storage' (public index) — verified by the import above.
    // If either constant were missing from index.ts this file would fail to compile.
    expect(typeof MAX_PHOTO_DATAURL_BYTES).toBe('number');
    expect(typeof MAX_PHOTOS_PER_ENTRY).toBe('number');
  });
});

import { describe, it, expect } from 'vitest';
import {
  readDiaries,
  writeAllDiaries,
  upsertDiary,
  removeDiary,
} from '@/lib/storage';
import { makeDiary } from './fixtures';

// Access the underlying key for corrupt-JSON tests
const DIARIES_KEY = 'ddalkkak:diaries:v1';

describe('readDiaries — resilience', () => {
  it('returns [] when the key is absent (cold storage)', () => {
    const result = readDiaries();
    expect(result).toEqual([]);
  });

  it('returns [] when stored value is corrupt JSON', () => {
    localStorage.setItem(DIARIES_KEY, '{not json');
    const result = readDiaries();
    expect(result).toEqual([]);
    // Key must NOT be cleared — corrupt data left in place
    expect(localStorage.getItem(DIARIES_KEY)).toBe('{not json');
  });

  it('returns [] when stored value is valid JSON but not an array', () => {
    localStorage.setItem(DIARIES_KEY, '{"foo":1}');
    const result = readDiaries();
    expect(result).toEqual([]);
  });

  it('returns [] when stored value is null literal', () => {
    localStorage.setItem(DIARIES_KEY, 'null');
    const result = readDiaries();
    expect(result).toEqual([]);
  });
});

describe('readDiaries / writeAllDiaries — round-trip', () => {
  it('round-trips a non-empty array through writeAllDiaries + readDiaries', () => {
    const e1 = makeDiary();
    const e2 = makeDiary();
    writeAllDiaries([e1, e2]);
    const result = readDiaries();
    expect(result).toEqual([e1, e2]);
  });
});

describe('upsertDiary — append path', () => {
  it('appends an entry when storage is empty (first call)', () => {
    const e1 = makeDiary();
    upsertDiary(e1);
    const result = readDiaries();
    expect(result).toHaveLength(1);
    expect(result[0]).toEqual(e1);
  });

  it('appends a second entry with a different id and different date', () => {
    const e1 = makeDiary();
    const e2 = makeDiary();
    upsertDiary(e1);
    upsertDiary(e2);
    const result = readDiaries();
    expect(result).toHaveLength(2);
  });
});

describe('upsertDiary — id-match (edit path)', () => {
  it('replaces an existing entry when id matches', () => {
    const e1 = makeDiary();
    upsertDiary(e1);
    const e1Updated = { ...e1, text: 'Updated text' };
    upsertDiary(e1Updated);
    const result = readDiaries();
    expect(result).toHaveLength(1);
    expect(result[0]).toEqual(e1Updated);
  });

  it('does not create a duplicate when upserting the same id twice', () => {
    const e1 = makeDiary();
    upsertDiary(e1);
    upsertDiary(e1);
    expect(readDiaries()).toHaveLength(1);
  });
});

describe('upsertDiary — date-match (1-per-day rule)', () => {
  it('replaces an existing entry when date matches but id differs', () => {
    const e1 = makeDiary({ id: 'A', date: '2026-05-17' });
    const e2 = makeDiary({ id: 'B', date: '2026-05-17' });
    upsertDiary(e1);
    upsertDiary(e2);
    const result = readDiaries();
    expect(result).toHaveLength(1);
    expect(result[0]?.id).toBe('B');
  });

  it('enforces id-match precedence over date-match', () => {
    // e1: id='A', date='2026-05-17'
    // e2: id='B', date='2026-05-18'
    const e1 = makeDiary({ id: 'A', date: '2026-05-17' });
    const e2 = makeDiary({ id: 'B', date: '2026-05-18' });
    writeAllDiaries([e1, e2]);

    // eEdited: same id as e1 (A), same date as e2 (2026-05-18)
    // id-match fires first → replaces e1 in-place, e2 is left untouched
    const eEdited = makeDiary({ id: 'A', date: '2026-05-18', text: 'Edited' });
    upsertDiary(eEdited);

    const result = readDiaries();
    expect(result).toHaveLength(2);

    const entryA = result.find((e) => e.id === 'A');
    const entryB = result.find((e) => e.id === 'B');
    expect(entryA?.date).toBe('2026-05-18');
    expect(entryA?.text).toBe('Edited');
    expect(entryB?.id).toBe('B');
    expect(entryB?.date).toBe('2026-05-18');
  });
});

describe('removeDiary', () => {
  it('removes an entry that exists', () => {
    const e1 = makeDiary();
    upsertDiary(e1);
    removeDiary(e1.id);
    expect(readDiaries()).toEqual([]);
  });

  it('is a no-op when the id does not exist', () => {
    const e1 = makeDiary();
    upsertDiary(e1);
    removeDiary('nonexistent-id');
    const result = readDiaries();
    expect(result).toHaveLength(1);
    expect(result[0]).toEqual(e1);
  });
});

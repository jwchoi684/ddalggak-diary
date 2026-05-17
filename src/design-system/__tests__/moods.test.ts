import { execSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { describe, it, expect } from 'vitest';
import type { MoodId } from '@/lib/storage';
import { MOODS, MOOD_MAP, getMood } from '@/design-system/moods';

const EXPECTED_IDS: MoodId[] = [
  'joy', 'love', 'excited', 'calm', 'grateful',
  'sad', 'angry', 'anxious', 'tired', 'embarrassed',
];

describe('MOODS master data', () => {
  it('has exactly 10 entries', () => {
    expect(MOODS.length).toBe(10);
  });

  it('contains every MoodId literal exactly once — no duplicates', () => {
    const ids = MOODS.map((m) => m.id);
    const idSet = new Set(ids);
    expect(idSet.size).toBe(10);
    for (const id of EXPECTED_IDS) {
      expect(idSet.has(id)).toBe(true);
    }
  });

  it('every Mood.color is a 6-digit HEX string', () => {
    for (const mood of MOODS) {
      expect(mood.color).toMatch(/^#[0-9A-Fa-f]{6}$/);
    }
  });

  it('every Mood.label is a non-empty string', () => {
    for (const mood of MOODS) {
      expect(mood.label.length).toBeGreaterThan(0);
    }
  });

  it('every Mood.emoji is a non-empty string', () => {
    for (const mood of MOODS) {
      expect(mood.emoji.length).toBeGreaterThan(0);
    }
  });

  it('MOODS order matches PRD §3.4 sequence', () => {
    expect(MOODS.map((m) => m.id)).toEqual(EXPECTED_IDS);
  });
});

describe('MOOD_MAP', () => {
  it('spot-check: MOOD_MAP["joy"].label === "기쁨"', () => {
    expect(MOOD_MAP['joy'].label).toBe('기쁨');
  });
});

describe('getMood', () => {
  it('returns the same record as MOOD_MAP for a valid id', () => {
    expect(getMood('joy')).toEqual(MOOD_MAP['joy']);
  });

  it('throws "Unknown MoodId: <id>" for an unrecognised id', () => {
    expect(() => getMood('unknown' as unknown as MoodId)).toThrow(
      'Unknown MoodId: unknown',
    );
  });

  it('does not throw for all 10 valid ids', () => {
    for (const id of EXPECTED_IDS) {
      expect(() => getMood(id)).not.toThrow();
    }
  });
});

describe('CSS token drift guard', () => {
  it('every Mood.color matches its --color-mood-<id> token in globals.css', () => {
    const css = fs.readFileSync(
      path.resolve(process.cwd(), 'src/app/globals.css'),
      'utf8',
    );
    const tokenMap: Record<string, string> = {};
    for (const match of css.matchAll(/--color-mood-(\w+):\s*(#[0-9A-Fa-f]{6})/g)) {
      tokenMap[match[1]!] = match[2]!;
    }
    for (const mood of MOODS) {
      expect(tokenMap[mood.id]).toBe(mood.color);
    }
  });
});

describe('acceptance grep', () => {
  it('no raw emoji literals appear outside moods.ts', () => {
    let result = '';
    try {
      result = execSync(
        'grep -rn --include="*.ts" --include="*.tsx" ' +
          '"😊\\|😢\\|😠\\|🥰\\|🤩\\|😌\\|🙏\\|😰\\|😪\\|😳" src/',
        { cwd: process.cwd(), encoding: 'utf8' },
      );
    } catch {
      // grep exits non-zero when no match is found — that means no leaks, which is PASS
      result = '';
    }
    // Remove lines that refer to moods.ts itself, test files, or upstream
    // storage types (which contain emoji only in JSDoc comments and are out of
    // scope for this REQ). The invariant we enforce here is that design-system
    // and app product code does not hardcode raw emoji outside moods.ts.
    const leaks = result
      .split('\n')
      .filter((line) => line.trim() !== '')
      .filter((line) => !line.includes('src/design-system/moods.ts'))
      .filter((line) => !line.includes('__tests__'))
      .filter((line) => !line.includes('src/lib/storage/'));
    expect(leaks).toHaveLength(0);
  });
});

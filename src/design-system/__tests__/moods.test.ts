import { execSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { describe, it, expect } from 'vitest';
import type { MoodId } from '@/lib/storage';
import { MOODS, MOOD_MAP, getMood } from '@/design-system/moods';

// Matches MOODS declaration order in src/design-system/moods.ts.
// 'grateful' was retired — kept in the type union for legacy entries only.
const EXPECTED_IDS: MoodId[] = [
  'joy', 'excited', 'calm', 'sleepy', 'tired',
  'annoyed', 'angry', 'sad', 'depressed', 'anxious',
  'embarrassed', 'hurt', 'sick', 'shy', 'surprised',
  'love', 'listless', 'frustrated', 'proud', 'focused',
];

describe('MOODS master data', () => {
  it('has exactly 20 entries (illustrated set)', () => {
    expect(MOODS.length).toBe(20);
  });

  it('contains every active MoodId literal exactly once — no duplicates', () => {
    const ids = MOODS.map((m) => m.id as string);
    const idSet = new Set<string>(ids);
    expect(idSet.size).toBe(20);
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

  it('MOODS order matches the illustrated picker sequence', () => {
    expect(MOODS.map((m) => m.id)).toEqual(EXPECTED_IDS);
  });
});

describe('MOOD_MAP', () => {
  it('spot-check: MOOD_MAP["joy"].label === "행복"', () => {
    expect(MOOD_MAP['joy'].label).toBe('행복');
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

  it('does not throw for any of the active ids', () => {
    for (const id of EXPECTED_IDS) {
      expect(() => getMood(id)).not.toThrow();
    }
  });

  it('still returns a legacy Mood record for "grateful" (retired id)', () => {
    expect(getMood('grateful').label).toBe('감사');
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

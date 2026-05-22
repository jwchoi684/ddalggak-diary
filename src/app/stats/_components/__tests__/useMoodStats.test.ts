// @vitest-environment happy-dom
import { describe, it, expect } from 'vitest';
import { renderHook } from '@testing-library/react';
import type { DiaryEntry, MoodId } from '@/lib/storage';
import { useMoodStats } from '../useMoodStats';

function makeEntry(date: string, mood: MoodId, text = ''): DiaryEntry {
  return {
    id: `entry-${date}-${mood}`,
    date,
    mood,
    text,
    textAlign: 'left',
    photos: [],
    createdAt: `${date}T00:00:00.000Z`,
    updatedAt: `${date}T00:00:00.000Z`,
  };
}

describe('useMoodStats', () => {
  it('UMS1: empty entries returns empty stats', () => {
    const { result } = renderHook(() => useMoodStats([], '2026-05'));
    expect(result.current).toEqual({ counts: [], hasData: false, maxCount: 0 });
  });

  it('UMS2: entries in other month are excluded', () => {
    const entries = [
      makeEntry('2026-04-01', 'joy'),
      makeEntry('2026-04-02', 'sad'),
    ];
    const { result } = renderHook(() => useMoodStats(entries, '2026-05'));
    expect(result.current).toEqual({ counts: [], hasData: false, maxCount: 0 });
  });

  it('UMS3: joy×3 and sad×2 → sorted desc with correct maxCount', () => {
    const entries = [
      makeEntry('2026-05-01', 'joy'),
      makeEntry('2026-05-02', 'joy'),
      makeEntry('2026-05-03', 'joy'),
      makeEntry('2026-05-04', 'sad'),
      makeEntry('2026-05-05', 'sad'),
    ];
    const { result } = renderHook(() => useMoodStats(entries, '2026-05'));
    const { counts, hasData, maxCount } = result.current;
    expect(hasData).toBe(true);
    expect(maxCount).toBe(3);
    expect(counts[0]).toEqual({ mood: 'joy', count: 3 });
    expect(counts[1]).toEqual({ mood: 'sad', count: 2 });
  });

  it('UMS4: tiebreak by MOODS master index (joy index 0 < sad index 5)', () => {
    const entries = [
      makeEntry('2026-05-01', 'joy'),
      makeEntry('2026-05-02', 'joy'),
      makeEntry('2026-05-03', 'sad'),
      makeEntry('2026-05-04', 'sad'),
    ];
    const { result } = renderHook(() => useMoodStats(entries, '2026-05'));
    expect(result.current.counts[0].mood).toBe('joy');
    expect(result.current.counts[1].mood).toBe('sad');
  });

  it('UMS5: all 10 moods once each → counts.length===10, maxCount===1, hasData===true', () => {
    const moods: MoodId[] = [
      'joy', 'love', 'excited', 'calm', 'grateful',
      'sad', 'angry', 'anxious', 'tired', 'embarrassed',
    ];
    const entries = moods.map((mood, i) =>
      makeEntry(`2026-05-${String(i + 1).padStart(2, '0')}`, mood),
    );
    const { result } = renderHook(() => useMoodStats(entries, '2026-05'));
    const { counts, hasData, maxCount } = result.current;
    expect(counts.length).toBe(10);
    expect(maxCount).toBe(1);
    expect(hasData).toBe(true);
    expect(counts.every((c) => c.count === 1)).toBe(true);
  });
});

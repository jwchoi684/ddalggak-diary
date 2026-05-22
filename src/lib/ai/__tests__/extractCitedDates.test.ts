import { describe, it, expect } from 'vitest';
import { extractCitedDates, buildEntryDateMap } from '@/lib/ai/extractCitedDates';

describe('extractCitedDates', () => {
  it('ECD1: extracts a single matching date from response text', () => {
    const entryDateMap = buildEntryDateMap([
      { id: 'entry-abc', date: '2026-05-15' },
    ]);

    const result = extractCitedDates(
      '2026-05-15에 기록된 일기를 보면 기분이 좋았네요.',
      entryDateMap,
    );

    expect(result).toEqual(['entry-abc']);
  });

  it('ECD2: returns empty array when no dates in response', () => {
    const entryDateMap = buildEntryDateMap([
      { id: 'entry-abc', date: '2026-05-15' },
    ]);

    const result = extractCitedDates('날짜가 전혀 없는 응답 텍스트입니다.', entryDateMap);

    expect(result).toEqual([]);
  });

  it('ECD3: returns empty array when dates in response do not match any diary entry', () => {
    const entryDateMap = buildEntryDateMap([
      { id: 'entry-abc', date: '2026-05-15' },
    ]);

    const result = extractCitedDates(
      '2025-01-01에 뭔가가 있었지만 일기에는 없어요.',
      entryDateMap,
    );

    expect(result).toEqual([]);
  });

  it('ECD4: extracts multiple matching dates, deduplicates, and preserves order', () => {
    const entryDateMap = buildEntryDateMap([
      { id: 'entry-1', date: '2026-05-01' },
      { id: 'entry-2', date: '2026-05-10' },
      { id: 'entry-3', date: '2026-05-20' },
    ]);

    const result = extractCitedDates(
      '2026-05-10과 2026-05-01, 그리고 2026-05-10은 중요한 날이었어요. 2026-05-20도요.',
      entryDateMap,
    );

    // 2026-05-10 appears twice but should be deduplicated
    expect(result).toHaveLength(3);
    expect(result).toContain('entry-1');
    expect(result).toContain('entry-2');
    expect(result).toContain('entry-3');
    // entry-2 (2026-05-10) appears first in text → first in result
    expect(result[0]).toBe('entry-2');
  });
});

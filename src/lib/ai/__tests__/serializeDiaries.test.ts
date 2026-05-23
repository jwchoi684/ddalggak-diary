import { describe, it, expect } from 'vitest';
import { serializeDiariesForLLM } from '@/lib/ai/serializeDiaries';
import type { DiaryEntry } from '@/lib/storage';

function makeDiary(overrides: Partial<DiaryEntry>): DiaryEntry {
  return {
    id: 'test-id',
    date: '2026-05-01',
    mood: 'joy',
    text: '테스트 내용',
    textAlign: 'left',
    photos: [],
    createdAt: '2026-05-01T10:00:00Z',
    updatedAt: '2026-05-01T10:00:00Z',
    ...overrides,
  };
}

describe('serializeDiariesForLLM', () => {
  it('SD1: serializes a single entry with exact format', () => {
    const entry = makeDiary({
      date: '2026-05-15',
      mood: 'joy',
      text: '오늘은 기분이 좋았다',
    });

    const result = serializeDiariesForLLM([entry]);
    expect(result).toBe('[2026-05-15] 기분: 행복(😊) | 본문: 오늘은 기분이 좋았다');
  });

  it('SD2: returns empty string for empty entries array', () => {
    const result = serializeDiariesForLLM([]);
    expect(result).toBe('');
  });

  it('SD3: serializes multiple entries sorted by date ascending', () => {
    const entries = [
      makeDiary({ id: 'a', date: '2026-05-20', mood: 'sad', text: '나중 일기' }),
      makeDiary({ id: 'b', date: '2026-05-01', mood: 'joy', text: '초기 일기' }),
      makeDiary({ id: 'c', date: '2026-05-10', mood: 'calm', text: '중간 일기' }),
    ];

    const result = serializeDiariesForLLM(entries);
    const lines = result.split('\n');

    expect(lines).toHaveLength(3);
    expect(lines[0]).toContain('2026-05-01');
    expect(lines[1]).toContain('2026-05-10');
    expect(lines[2]).toContain('2026-05-20');
  });

  it('SD4: handles special characters and line breaks in text', () => {
    const entry = makeDiary({
      date: '2026-05-05',
      mood: 'anxious',
      text: '오늘은 "특수" 문자가 있어요. <태그> & 엔티티',
    });

    const result = serializeDiariesForLLM([entry]);
    expect(result).toBe(
      '[2026-05-05] 기분: 걱정(😰) | 본문: 오늘은 "특수" 문자가 있어요. <태그> & 엔티티',
    );
  });
});

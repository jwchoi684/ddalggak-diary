import { describe, it, expect } from 'vitest';
import { formatRelativeTime } from '../formatRelativeTime';

// Fixed reference point for all tests that need a stable "now"
const NOW = new Date('2026-05-22T12:00:00.000Z');

function iso(offsetMs: number): string {
  return new Date(NOW.getTime() - offsetMs).toISOString();
}

const SEC = 1000;
const MIN = 60 * SEC;
const HOUR = 60 * MIN;
const DAY = 24 * HOUR;

describe('formatRelativeTime', () => {
  it('FRT1: 0s → "방금"', () => {
    expect(formatRelativeTime(NOW.toISOString(), NOW)).toBe('방금');
  });

  it('FRT2: 59s → "방금"', () => {
    expect(formatRelativeTime(iso(59 * SEC), NOW)).toBe('방금');
  });

  it('FRT3: 60s → "1분 전"', () => {
    expect(formatRelativeTime(iso(60 * SEC), NOW)).toBe('1분 전');
  });

  it('FRT4: 30min → "30분 전"', () => {
    expect(formatRelativeTime(iso(30 * MIN), NOW)).toBe('30분 전');
  });

  it('FRT5: 2h → "2시간 전"', () => {
    expect(formatRelativeTime(iso(2 * HOUR), NOW)).toBe('2시간 전');
  });

  it('FRT6: Yesterday → "어제"', () => {
    // Use local midnight to ensure calendar-day boundary
    const referenceLocal = new Date(2026, 4, 22, 12, 0, 0); // 2026-05-22 noon local
    const yesterdayLocal = new Date(2026, 4, 21, 10, 0, 0); // 2026-05-21 10am local
    expect(formatRelativeTime(yesterdayLocal.toISOString(), referenceLocal)).toBe('어제');
  });

  it('FRT7: 3d → "3일 전"', () => {
    const referenceLocal = new Date(2026, 4, 22, 12, 0, 0);
    const threeDaysAgoLocal = new Date(2026, 4, 19, 12, 0, 0);
    expect(formatRelativeTime(threeDaysAgoLocal.toISOString(), referenceLocal)).toBe('3일 전');
  });

  it('FRT8: 8d → "YYYY.M.D" (no zero-pad)', () => {
    // 8 days before 2026-05-22 = 2026-05-14
    const referenceLocal = new Date(2026, 4, 22, 12, 0, 0);
    const eightDaysAgoLocal = new Date(2026, 4, 14, 12, 0, 0);
    const result = formatRelativeTime(eightDaysAgoLocal.toISOString(), referenceLocal);
    expect(result).toBe('2026.5.14');
  });

  it('FRT9: Negative diff (future) → "방금"', () => {
    const future = new Date(NOW.getTime() + 10 * MIN);
    expect(formatRelativeTime(future.toISOString(), NOW)).toBe('방금');
  });

  it('FRT10: Explicit now param works', () => {
    const customNow = new Date('2026-01-15T08:00:00.000Z');
    const target = new Date('2026-01-15T07:30:00.000Z'); // 30 min before
    expect(formatRelativeTime(target.toISOString(), customNow)).toBe('30분 전');
  });
});

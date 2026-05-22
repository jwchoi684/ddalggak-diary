import { describe, it, expect } from 'vitest';
import { formatListDate } from '../formatListDate';

// Verified weekdays:
//   2026-05-22 = 금요일 (Friday)
//   2026-01-01 = 목요일 (Thursday)
//   2026-03-07 = 토요일 (Saturday)
//   2026-05-25 = 월요일 (Monday)

describe('formatListDate', () => {
  it('FLD1: 2026-05-22 → "2026.05.22 금요일" (dot separator + weekday)', () => {
    expect(formatListDate('2026-05-22')).toBe('2026.05.22 금요일');
  });

  it('FLD2: 2026-01-01 → "2026.01.01 목요일" (January leading zero)', () => {
    expect(formatListDate('2026-01-01')).toBe('2026.01.01 목요일');
  });

  it('FLD3: 2026-03-07 → "2026.03.07 토요일" (month and day leading zeros preserved)', () => {
    expect(formatListDate('2026-03-07')).toBe('2026.03.07 토요일');
  });

  it('FLD4: 2026-05-25 → "2026.05.25 월요일" (non-weekend weekday)', () => {
    expect(formatListDate('2026-05-25')).toBe('2026.05.25 월요일');
  });
});

import { describe, it, expect } from 'vitest';
import { addMonths } from '../addMonths';

describe('addMonths', () => {
  it('AM1: basic forward step', () => {
    expect(addMonths('2026-05', +1)).toBe('2026-06');
  });

  it('AM2: basic backward step', () => {
    expect(addMonths('2026-05', -1)).toBe('2026-04');
  });

  it('AM3: year rollover backward (Jan → Dec previous year)', () => {
    expect(addMonths('2026-01', -1)).toBe('2025-12');
  });

  it('AM4: year rollover forward (Dec → Jan next year)', () => {
    expect(addMonths('2026-12', +1)).toBe('2027-01');
  });

  it('AM5: identity (delta zero)', () => {
    expect(addMonths('2026-05', 0)).toBe('2026-05');
  });

  it('AM6: full year advance (+12 months)', () => {
    expect(addMonths('2026-03', +12)).toBe('2027-03');
  });
});

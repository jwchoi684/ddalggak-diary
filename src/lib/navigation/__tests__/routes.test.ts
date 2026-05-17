import { describe, it, expect } from 'vitest';
import { Routes } from '@/lib/navigation';

describe('Routes — static path constants', () => {
  it('Routes.calendar equals "/"', () => {
    expect(Routes.calendar).toBe('/');
  });

  it('Routes.list equals "/list"', () => {
    expect(Routes.list).toBe('/list');
  });

  it('Routes.chat equals "/chat"', () => {
    expect(Routes.chat).toBe('/chat');
  });

  it('Routes.stats equals "/stats"', () => {
    expect(Routes.stats).toBe('/stats');
  });
});

describe('Routes.diary', () => {
  it('Routes.diary("2026-05-17") returns "/diary/2026-05-17"', () => {
    expect(Routes.diary('2026-05-17')).toBe('/diary/2026-05-17');
  });

  it('Routes.diary(date) always starts with "/diary/" and ends with the date argument unchanged', () => {
    const date = '2024-12-31';
    const result = Routes.diary(date);
    expect(result.startsWith('/diary/')).toBe(true);
    expect(result.endsWith(date)).toBe(true);
  });
});

describe('Routes.listWithFilter', () => {
  it('empty params object {} returns exactly "/list" with no trailing "?"', () => {
    expect(Routes.listWithFilter({})).toBe('/list');
  });

  it('{ month: "2026-04" } returns "/list?month=2026-04"', () => {
    expect(Routes.listWithFilter({ month: '2026-04' })).toBe('/list?month=2026-04');
  });

  it('{ sort: "asc" } returns "/list?sort=asc"', () => {
    expect(Routes.listWithFilter({ sort: 'asc' })).toBe('/list?sort=asc');
  });

  it('{ month: "2026-04", sort: "desc" } returns "/list?month=2026-04&sort=desc" (month precedes sort)', () => {
    expect(Routes.listWithFilter({ month: '2026-04', sort: 'desc' })).toBe('/list?month=2026-04&sort=desc');
  });
});

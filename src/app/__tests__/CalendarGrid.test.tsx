// @vitest-environment happy-dom
import React from 'react';
import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import { CalendarGrid } from '@/app/_components/CalendarGrid';
import { makeDiary } from '@/lib/storage/__tests__/fixtures';

afterEach(() => cleanup());

// May 2026: year=2026, month=4
// new Date(2026, 4, 1).getDay() === 5 (Friday), 31 days, startOffset=5
const BASE_PROPS = {
  year: 2026,
  month: 4,
  diaryByDate: new Map(),
  today: '2026-05-01',
  onCellTap: vi.fn(),
};

describe('CalendarGrid — May 2026 structure', () => {
  it('renders the 7-day weekday header row in Sunday-first order: 일 월 화 수 목 금 토', () => {
    render(<CalendarGrid {...BASE_PROPS} />);
    const weekdays = ['일', '월', '화', '수', '목', '금', '토'];
    for (const wd of weekdays) {
      expect(screen.getByText(wd)).toBeTruthy();
    }
  });

  it('renders exactly 31 day buttons (one per in-month day)', () => {
    render(<CalendarGrid {...BASE_PROPS} />);
    const buttons = screen.getAllByRole('button');
    expect(buttons).toHaveLength(31);
  });

  it('day 1 is preceded by exactly 5 non-interactive empty slots (Friday column)', () => {
    render(<CalendarGrid {...BASE_PROPS} />);
    // Day 1 button aria-label contains '2026-05-01'
    const day1Btn = screen.getByRole('button', { name: /2026-05-01/ });
    // Count previous siblings (empty divs before first button in grid)
    let emptyCount = 0;
    let sibling = day1Btn.previousElementSibling;
    while (sibling) {
      emptyCount++;
      sibling = sibling.previousElementSibling;
    }
    expect(emptyCount).toBe(5);
  });
});

describe('CalendarGrid — diary entry rendering', () => {
  it('day 3 cell renders MoodIcon when diaryByDate has entry for 2026-05-03; other days render numerals', () => {
    const entry = makeDiary({ date: '2026-05-03', mood: 'joy' });
    const diaryByDate = new Map([['2026-05-03', entry]]);
    render(<CalendarGrid {...BASE_PROPS} diaryByDate={diaryByDate} />);
    const imgs = screen.getAllByRole('img');
    expect(imgs).toHaveLength(1);
    // Other days render numerals
    expect(screen.getByText('1')).toBeTruthy();
    expect(screen.getByText('5')).toBeTruthy();
  });

  it('onCellTap called with "2026-05-03" when day-3 button is clicked', () => {
    const onCellTap = vi.fn();
    render(<CalendarGrid {...BASE_PROPS} onCellTap={onCellTap} />);
    const btn = screen.getByRole('button', { name: /2026-05-03/ });
    fireEvent.click(btn);
    expect(onCellTap).toHaveBeenCalledWith('2026-05-03');
  });
});

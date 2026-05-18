// @vitest-environment happy-dom
import React from 'react';
import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import { CalendarHeader } from '@/app/_components/CalendarHeader';

afterEach(() => cleanup());

const BASE_PROPS = {
  year: 2026,
  month: 4,
  onPrev: vi.fn(),
  onNext: vi.fn(),
  onSearch: vi.fn(),
  onStats: vi.fn(),
  onList: vi.fn(),
};

describe('CalendarHeader — month display', () => {
  it('renders "{month+1}월" — shows "5월" for month=4, year=2026; year is not rendered', () => {
    render(<CalendarHeader {...BASE_PROPS} />);
    expect(screen.getByText('5월')).toBeTruthy();
    expect(screen.queryByText('2026')).toBeNull();
  });
});

describe('CalendarHeader — navigation arrows', () => {
  it('이전 달 button (‹) has aria-label "이전 달" and calls onPrev when clicked', () => {
    const onPrev = vi.fn();
    render(<CalendarHeader {...BASE_PROPS} onPrev={onPrev} />);
    const btn = screen.getByRole('button', { name: '이전 달' });
    expect(btn).toBeTruthy();
    fireEvent.click(btn);
    expect(onPrev).toHaveBeenCalledTimes(1);
  });

  it('다음 달 button (›) has aria-label "다음 달" and calls onNext when clicked', () => {
    const onNext = vi.fn();
    render(<CalendarHeader {...BASE_PROPS} onNext={onNext} />);
    const btn = screen.getByRole('button', { name: '다음 달' });
    expect(btn).toBeTruthy();
    fireEvent.click(btn);
    expect(onNext).toHaveBeenCalledTimes(1);
  });
});

describe('CalendarHeader — icon buttons', () => {
  it('검색 IconButton has aria-label "검색" and calls onSearch when clicked', () => {
    const onSearch = vi.fn();
    render(<CalendarHeader {...BASE_PROPS} onSearch={onSearch} />);
    const btn = screen.getByRole('button', { name: '검색' });
    fireEvent.click(btn);
    expect(onSearch).toHaveBeenCalledTimes(1);
  });

  it('통계 IconButton has aria-label "통계" and calls onStats when clicked', () => {
    const onStats = vi.fn();
    render(<CalendarHeader {...BASE_PROPS} onStats={onStats} />);
    const btn = screen.getByRole('button', { name: '통계' });
    fireEvent.click(btn);
    expect(onStats).toHaveBeenCalledTimes(1);
  });

  it('리스트 IconButton has aria-label "리스트" and calls onList when clicked', () => {
    const onList = vi.fn();
    render(<CalendarHeader {...BASE_PROPS} onList={onList} />);
    const btn = screen.getByRole('button', { name: '리스트' });
    fireEvent.click(btn);
    expect(onList).toHaveBeenCalledTimes(1);
  });
});

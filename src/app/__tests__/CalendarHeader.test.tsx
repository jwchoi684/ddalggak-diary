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

describe('CalendarHeader — section icons removed in favour of BottomNav', () => {
  it('does not render the 검색 / 통계 / 리스트 / 설정 IconButtons anymore', () => {
    render(<CalendarHeader {...BASE_PROPS} />);
    expect(screen.queryByRole('button', { name: '검색' })).toBeNull();
    expect(screen.queryByRole('button', { name: '통계' })).toBeNull();
    expect(screen.queryByRole('button', { name: '리스트' })).toBeNull();
    expect(screen.queryByRole('button', { name: '설정' })).toBeNull();
  });
});

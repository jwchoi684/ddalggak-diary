// @vitest-environment happy-dom
import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import {
  mockRouter,
  mockUseRouter,
  mockUseSearchParams,
  mockUseParams,
  mockUsePathname,
  resetNavigationMocks,
} from '@/lib/navigation/__tests__/setupNextNavigation';

vi.mock('next/navigation', () => ({
  useRouter:       () => mockUseRouter(),
  useSearchParams: () => mockUseSearchParams(),
  useParams:       () => mockUseParams(),
  usePathname:     () => mockUsePathname(),
}));

vi.mock('@/lib/storage/useDiaries', () => ({
  useDiaries: vi.fn(() => ({ entries: [], isReady: true })),
}));

const { useDiaries } = await import('@/lib/storage/useDiaries');
const useDiariesMock = useDiaries as ReturnType<typeof vi.fn>;

const { CalendarScreen } = await import('@/app/_components/CalendarScreen');

beforeEach(() => {
  resetNavigationMocks();
  useDiariesMock.mockReturnValue({ entries: [], isReady: true });
});
afterEach(() => cleanup());

describe('CalendarScreen — initial render', () => {
  it('current month label (e.g. "5월") is visible after mount', () => {
    render(<CalendarScreen />);
    const monthLabel = `${new Date().getMonth() + 1}월`;
    expect(screen.getByText(monthLabel)).toBeTruthy();
  });

  it('CalendarGrid is suppressed while isReady=false; visible (buttons rendered) after isReady=true', () => {
    // isReady=false: no day-cell buttons
    useDiariesMock.mockReturnValue({ entries: [], isReady: false });
    const { unmount } = render(<CalendarScreen />);
    // Only FAB + 2 arrow buttons visible (no day cells)
    const buttons = screen.getAllByRole('button');
    // FAB + prev + next + 3 IconButtons = 6 buttons, no day cells
    const dayButtons = buttons.filter((b) =>
      /^\d{4}-\d{2}-\d{2}/.test(b.getAttribute('aria-label') ?? ''),
    );
    expect(dayButtons).toHaveLength(0);
    unmount();

    // isReady=true: day cell buttons rendered
    useDiariesMock.mockReturnValue({ entries: [], isReady: true });
    render(<CalendarScreen />);
    const allButtons = screen.getAllByRole('button');
    const cellButtons = allButtons.filter((b) =>
      /^\d{4}-\d{2}-\d{2}/.test(b.getAttribute('aria-label') ?? ''),
    );
    expect(cellButtons.length).toBeGreaterThanOrEqual(28);
  });
});

describe('CalendarScreen — FAB', () => {
  it('FAB is rendered with aria-label "오늘 일기 쓰기"', () => {
    render(<CalendarScreen />);
    expect(screen.getByRole('button', { name: '오늘 일기 쓰기' })).toBeTruthy();
  });

  it('FAB click calls router.push with /diary/YYYY-MM-DD for today', () => {
    render(<CalendarScreen />);
    fireEvent.click(screen.getByRole('button', { name: '오늘 일기 쓰기' }));
    const today = new Date().toLocaleDateString('sv');
    expect(mockRouter.push).toHaveBeenCalledWith(`/diary/${today}`);
  });
});

describe('CalendarScreen — month navigation via arrows', () => {
  it('이전 달 button click decrements visible month label by 1', () => {
    render(<CalendarScreen />);
    const currentMonth = new Date().getMonth() + 1;
    fireEvent.click(screen.getByRole('button', { name: '이전 달' }));
    const expected = currentMonth === 1 ? '12월' : `${currentMonth - 1}월`;
    expect(screen.getByText(expected)).toBeTruthy();
  });

  it('다음 달 button click increments visible month label by 1', () => {
    render(<CalendarScreen />);
    const currentMonth = new Date().getMonth() + 1;
    fireEvent.click(screen.getByRole('button', { name: '다음 달' }));
    const expected = currentMonth === 12 ? '1월' : `${currentMonth + 1}월`;
    expect(screen.getByText(expected)).toBeTruthy();
  });
});

describe('CalendarScreen — swipe gesture', () => {
  it('pointer swipe left (deltaX ≤ -40) increments visible month (next month)', () => {
    render(<CalendarScreen />);
    const currentMonth = new Date().getMonth() + 1;
    const main = screen.getByRole('main');
    fireEvent.pointerDown(main, { clientX: 200 });
    fireEvent.pointerUp(main, { clientX: 140 }); // delta = -60
    const expected = currentMonth === 12 ? '1월' : `${currentMonth + 1}월`;
    expect(screen.getByText(expected)).toBeTruthy();
  });

  it('pointer swipe right (deltaX ≥ +40) decrements visible month (prev month)', () => {
    render(<CalendarScreen />);
    const currentMonth = new Date().getMonth() + 1;
    const main = screen.getByRole('main');
    fireEvent.pointerDown(main, { clientX: 100 });
    fireEvent.pointerUp(main, { clientX: 160 }); // delta = +60
    const expected = currentMonth === 1 ? '12월' : `${currentMonth - 1}월`;
    expect(screen.getByText(expected)).toBeTruthy();
  });
});

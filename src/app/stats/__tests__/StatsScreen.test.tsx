// @vitest-environment happy-dom
import React from 'react';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen, fireEvent, within, cleanup } from '@testing-library/react';
import {
  mockRouter,
  mockUseRouter,
  mockUseParams,
  mockUsePathname,
  resetNavigationMocks,
} from '@/lib/navigation/__tests__/setupNextNavigation';
import type { DiaryEntry, MoodId } from '@/lib/storage';

// ─── Search-params override ───────────────────────────────────────────────────
// Mutable variable — same pattern as ListScreen.test.tsx
let currentSearchParams = new URLSearchParams();

vi.mock('next/navigation', () => ({
  useRouter:       () => mockUseRouter(),
  useSearchParams: () => currentSearchParams,
  useParams:       () => mockUseParams(),
  usePathname:     () => mockUsePathname(),
}));

vi.mock('@/lib/storage/useDiaries', () => ({
  useDiaries: vi.fn(),
}));

const { useDiaries } = await import('@/lib/storage/useDiaries');
const useDiariesMock = useDiaries as ReturnType<typeof vi.fn>;

const { default: StatsPage } = await import('@/app/stats/page');

// ─── Fixture helpers ──────────────────────────────────────────────────────────

function makeEntry(date: string, mood: MoodId, text = ''): DiaryEntry {
  return {
    id: `entry-${date}-${mood}`,
    date,
    mood,
    text,
    textAlign: 'left',
    photos: [],
    createdAt: `${date}T00:00:00.000Z`,
    updatedAt: `${date}T00:00:00.000Z`,
  };
}

// Current month used in tests that care about "today" entries
const CURRENT_MONTH = '2026-05';
function entryThisMonth(day: number, mood: MoodId): DiaryEntry {
  return makeEntry(`${CURRENT_MONTH}-${String(day).padStart(2, '0')}`, mood);
}

// ─── beforeEach / afterEach ───────────────────────────────────────────────────

beforeEach(() => {
  resetNavigationMocks();
  currentSearchParams = new URLSearchParams();
  useDiariesMock.mockReturnValue({ entries: [], isReady: true });
});
afterEach(() => cleanup());

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('StatsScreen — empty month', () => {
  it('SS1: shows empty state, no bars, nav buttons present', () => {
    currentSearchParams = new URLSearchParams('month=2026-05');
    render(<StatsPage />);

    expect(screen.getByText('이 달에는 기록이 없어요')).toBeTruthy();
    expect(screen.queryByTestId('mood-summary-row')).toBeNull();
    expect(screen.queryAllByTestId(/^mood-bar-/).length).toBe(0);
    expect(screen.getByRole('button', { name: '이전 달' })).toBeTruthy();
    expect(screen.getByRole('button', { name: '다음 달' })).toBeTruthy();
  });
});

describe('StatsScreen — bar chart ordering and widths', () => {
  it('SS2: joy×3 sad×2 → joy bar 100%, sad bar ~67%, counts visible', () => {
    currentSearchParams = new URLSearchParams(`month=${CURRENT_MONTH}`);
    useDiariesMock.mockReturnValue({
      entries: [
        entryThisMonth(1, 'joy'),
        entryThisMonth(2, 'joy'),
        entryThisMonth(3, 'joy'),
        entryThisMonth(4, 'sad'),
        entryThisMonth(5, 'sad'),
      ],
      isReady: true,
    });

    render(<StatsPage />);

    const joyBar = screen.getByTestId('mood-bar-joy');
    const sadBar = screen.getByTestId('mood-bar-sad');
    expect(joyBar).toBeTruthy();
    expect(sadBar).toBeTruthy();

    // Joy bar fill: width should be 100%
    const joyFill = joyBar.querySelector('.rounded-full.h-full') as HTMLElement;
    expect(joyFill).toBeTruthy();
    expect(joyFill.style.width).toBe('100%');

    // Sad bar fill: Math.max(8, (2/3)*100) ≈ 66.67%
    const sadFill = sadBar.querySelector('.rounded-full.h-full') as HTMLElement;
    expect(sadFill).toBeTruthy();
    const sadPct = parseFloat(sadFill.style.width);
    expect(sadPct).toBeGreaterThanOrEqual(60);
    expect(sadPct).toBeLessThanOrEqual(70);

    // Count texts
    expect(within(joyBar).getByText('3')).toBeTruthy();
    expect(within(sadBar).getByText('2')).toBeTruthy();
  });

  it('SS3: all 10 moods once each → 10 bars and 10 summary icons', () => {
    currentSearchParams = new URLSearchParams(`month=${CURRENT_MONTH}`);
    const moods: MoodId[] = [
      'joy', 'love', 'excited', 'calm', 'grateful',
      'sad', 'angry', 'anxious', 'tired', 'embarrassed',
    ];
    useDiariesMock.mockReturnValue({
      entries: moods.map((mood, i) => entryThisMonth(i + 1, mood)),
      isReady: true,
    });

    render(<StatsPage />);

    expect(screen.getAllByTestId(/^mood-bar-/).length).toBe(10);

    const summaryRow = screen.getByTestId('mood-summary-row');
    expect(summaryRow.children.length).toBe(10);

    // All count texts should be "1"
    const countTexts = screen.getAllByText('1');
    expect(countTexts.length).toBeGreaterThanOrEqual(10);
  });
});

describe('StatsScreen — month navigation', () => {
  it('SS4: prev month from Jan 2026 rolls back to Dec 2025', () => {
    currentSearchParams = new URLSearchParams('month=2026-01');
    render(<StatsPage />);

    fireEvent.click(screen.getByRole('button', { name: '이전 달' }));

    expect(screen.getByText('2025')).toBeTruthy();
    expect(screen.getByText('12월')).toBeTruthy();
  });

  it('SS5: next month from May 2026 advances to June 2026', () => {
    currentSearchParams = new URLSearchParams('month=2026-05');
    render(<StatsPage />);

    fireEvent.click(screen.getByRole('button', { name: '다음 달' }));

    expect(screen.getByText('2026')).toBeTruthy();
    expect(screen.getByText('6월')).toBeTruthy();
  });
});

describe('StatsScreen — close button', () => {
  it('SS6: clicking ✕ close calls router.back', () => {
    render(<StatsPage />);

    fireEvent.click(screen.getByRole('button', { name: '닫기' }));

    expect(mockRouter.back).toHaveBeenCalledTimes(1);
  });
});

describe('StatsScreen — URL search params', () => {
  it('SS7: ?month=2026-03 sets initial month to March 2026', () => {
    currentSearchParams = new URLSearchParams('month=2026-03');
    render(<StatsPage />);

    expect(screen.getByText('3월')).toBeTruthy();
    expect(screen.getByText('2026')).toBeTruthy();
  });
});

describe('StatsScreen — tiebreak ordering', () => {
  it('SS8: joy×2 sad×2 → joy first (MOODS master index tiebreak)', () => {
    currentSearchParams = new URLSearchParams(`month=${CURRENT_MONTH}`);
    useDiariesMock.mockReturnValue({
      entries: [
        entryThisMonth(1, 'joy'),
        entryThisMonth(2, 'joy'),
        entryThisMonth(3, 'sad'),
        entryThisMonth(4, 'sad'),
      ],
      isReady: true,
    });

    render(<StatsPage />);

    const bars = screen.getAllByTestId(/^mood-bar-/);
    expect(bars[0].getAttribute('data-testid')).toBe('mood-bar-joy');
    expect(bars[1].getAttribute('data-testid')).toBe('mood-bar-sad');
  });
});

describe('StatsScreen — loading state', () => {
  it('SS9: isReady=false shows loading placeholder, no summary row', () => {
    useDiariesMock.mockReturnValue({ entries: [], isReady: false });
    render(<StatsPage />);

    expect(screen.getByText('불러오는 중…')).toBeTruthy();
    expect(screen.queryByTestId('mood-summary-row')).toBeNull();
  });
});

describe('StatsScreen — partial mood usage', () => {
  it('SS10: only 2 moods used → summary row has exactly 2 icons, no excited bar', () => {
    currentSearchParams = new URLSearchParams(`month=${CURRENT_MONTH}`);
    useDiariesMock.mockReturnValue({
      entries: [
        entryThisMonth(1, 'joy'),
        entryThisMonth(2, 'sad'),
      ],
      isReady: true,
    });

    render(<StatsPage />);

    const summaryRow = screen.getByTestId('mood-summary-row');
    expect(summaryRow.children.length).toBe(2);
    expect(screen.queryByTestId('mood-bar-excited')).toBeNull();
  });
});

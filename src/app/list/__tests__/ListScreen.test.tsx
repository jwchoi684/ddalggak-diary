// @vitest-environment happy-dom
import React from 'react';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import {
  mockRouter,
  mockUseRouter,
  mockUseParams,
  mockUsePathname,
  resetNavigationMocks,
} from '@/lib/navigation/__tests__/setupNextNavigation';
import type { DiaryEntry, Photo } from '@/lib/storage';

// ─── Search-params override ───────────────────────────────────────────────────
// We control the search params returned per-test via this mutable variable.
let currentSearchParams = new URLSearchParams();
function mockUseSearchParams() { return currentSearchParams; }

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

const { default: ListPage } = await import('@/app/list/page');

// ─── Fixture helpers ──────────────────────────────────────────────────────────

let entryIdCounter = 0;

function makeEntry(date: string, overrides: Partial<DiaryEntry> = {}): DiaryEntry {
  return {
    id: `entry-${++entryIdCounter}`,
    date,
    mood: 'joy',
    text: '내용',
    textAlign: 'left',
    photos: [],
    createdAt: `${date}T00:00:00.000Z`,
    updatedAt: `${date}T00:00:00.000Z`,
    ...overrides,
  };
}

function fakePhoto(id = 'p1'): Photo {
  return {
    id,
    dataUrl: 'data:image/png;base64,AA==',
    width: 100,
    height: 100,
    addedAt: '2026-05-10T00:00:00.000Z',
  };
}

// ─── beforeEach / afterEach ───────────────────────────────────────────────────

beforeEach(() => {
  resetNavigationMocks();
  useDiariesMock.mockReturnValue({ entries: [], isReady: true });
  currentSearchParams = new URLSearchParams();
});
afterEach(() => cleanup());

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('ListScreen — month filter', () => {
  it('LS1: only entries matching ?month=2026-05 are shown', () => {
    const may1 = makeEntry('2026-05-01');
    const may2 = makeEntry('2026-05-20');
    const apr  = makeEntry('2026-04-15');
    useDiariesMock.mockReturnValue({ entries: [may1, may2, apr], isReady: true });
    currentSearchParams = new URLSearchParams('month=2026-05');

    render(<ListPage />);

    const cardButtons = screen
      .getAllByRole('button')
      .filter((b) => /일기 보기/.test(b.getAttribute('aria-label') ?? ''));
    expect(cardButtons).toHaveLength(2);

    const aprilCard = screen
      .queryAllByRole('button')
      .find((b) => /2026년 4월/.test(b.getAttribute('aria-label') ?? ''));
    expect(aprilCard).toBeUndefined();
  });

  it('LS2: default month = current month when ?month absent', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-05-15'));

    const mayEntry  = makeEntry('2026-05-10');
    const juneEntry = makeEntry('2026-06-01');
    useDiariesMock.mockReturnValue({ entries: [mayEntry, juneEntry], isReady: true });
    currentSearchParams = new URLSearchParams(); // no month param

    render(<ListPage />);

    const cards = screen
      .getAllByRole('button')
      .filter((b) => /일기 보기/.test(b.getAttribute('aria-label') ?? ''));
    expect(cards).toHaveLength(1);
    expect(cards[0].getAttribute('aria-label')).toMatch(/2026년 5월/);

    vi.useRealTimers();
  });
});

describe('ListScreen — sort', () => {
  it('LS3: default sort is desc (newest first)', () => {
    const early = makeEntry('2026-05-01');
    const late  = makeEntry('2026-05-20');
    useDiariesMock.mockReturnValue({ entries: [early, late], isReady: true });
    currentSearchParams = new URLSearchParams('month=2026-05');

    render(<ListPage />);

    const cards = screen
      .getAllByRole('button')
      .filter((b) => /일기 보기/.test(b.getAttribute('aria-label') ?? ''));
    expect(cards[0].getAttribute('aria-label')).toMatch(/2026년 5월 20일/);
  });

  it('LS4: sort asc after clicking sort toggle', () => {
    const early = makeEntry('2026-05-01');
    const late  = makeEntry('2026-05-20');
    useDiariesMock.mockReturnValue({ entries: [early, late], isReady: true });
    currentSearchParams = new URLSearchParams('month=2026-05');

    render(<ListPage />);

    fireEvent.click(screen.getByRole('button', { name: '정렬 변경' }));

    const cards = screen
      .getAllByRole('button')
      .filter((b) => /일기 보기/.test(b.getAttribute('aria-label') ?? ''));
    expect(cards[0].getAttribute('aria-label')).toMatch(/2026년 5월 1일/);
  });
});

describe('ListScreen — photo strip', () => {
  it('LS5: +2 overflow badge for 5 photos; exactly 3 thumbnail imgs shown', () => {
    const photos = [
      fakePhoto('p1'), fakePhoto('p2'), fakePhoto('p3'),
      fakePhoto('p4'), fakePhoto('p5'),
    ];
    useDiariesMock.mockReturnValue({
      entries: [makeEntry('2026-05-10', { photos })],
      isReady: true,
    });
    currentSearchParams = new URLSearchParams('month=2026-05');

    render(<ListPage />);

    expect(screen.getByTestId('photo-overflow-badge').textContent).toBe('+2');
    expect(screen.getAllByAltText('첨부 사진')).toHaveLength(3);
  });
});

describe('ListScreen — empty body rules', () => {
  it('LS6: shows "(내용 없음)" when text is empty AND no photos', () => {
    useDiariesMock.mockReturnValue({
      entries: [makeEntry('2026-05-10', { text: '', photos: [] })],
      isReady: true,
    });
    currentSearchParams = new URLSearchParams('month=2026-05');

    render(<ListPage />);

    expect(screen.getByText('(내용 없음)')).toBeTruthy();
  });

  it('LS7: "(내용 없음)" absent when text empty BUT photos present', () => {
    useDiariesMock.mockReturnValue({
      entries: [makeEntry('2026-05-10', { text: '', photos: [fakePhoto()] })],
      isReady: true,
    });
    currentSearchParams = new URLSearchParams('month=2026-05');

    render(<ListPage />);

    expect(screen.queryByText('(내용 없음)')).toBeNull();
    expect(screen.getByAltText('첨부 사진')).toBeTruthy();
  });
});

describe('ListScreen — empty month state', () => {
  it('LS8: shows empty title and "캘린더로 가기" CTA when no entries for month', () => {
    useDiariesMock.mockReturnValue({ entries: [], isReady: true });
    currentSearchParams = new URLSearchParams('month=2026-05');

    render(<ListPage />);

    expect(screen.getByText('이 달에는 작성된 일기가 없어요')).toBeTruthy();
    expect(screen.getByRole('button', { name: '캘린더로 가기' })).toBeTruthy();
  });
});

describe('ListScreen — navigation', () => {
  it('LS9: card tap calls router.push with /diary/[date]', () => {
    useDiariesMock.mockReturnValue({
      entries: [makeEntry('2026-05-10')],
      isReady: true,
    });
    currentSearchParams = new URLSearchParams('month=2026-05');

    render(<ListPage />);

    const card = screen.getByRole('button', { name: /일기 보기/ });
    fireEvent.click(card);

    expect(mockRouter.push).toHaveBeenCalledWith('/diary/2026-05-10');
  });

  it('LS10: next month nav pushes ?month=2026-06', () => {
    currentSearchParams = new URLSearchParams('month=2026-05');

    render(<ListPage />);

    fireEvent.click(screen.getByRole('button', { name: '다음 달' }));

    expect(mockRouter.push).toHaveBeenCalledWith(
      expect.stringContaining('month=2026-06'),
    );
  });

  it('LS11: prev month from 2026-01 rolls back to 2025-12', () => {
    currentSearchParams = new URLSearchParams('month=2026-01');

    render(<ListPage />);

    fireEvent.click(screen.getByRole('button', { name: '이전 달' }));

    expect(mockRouter.push).toHaveBeenCalledWith(
      expect.stringContaining('month=2025-12'),
    );
  });
});

describe('ListScreen — loading state', () => {
  it('LS12: isReady=false shows loading placeholder; no card buttons', () => {
    useDiariesMock.mockReturnValue({ entries: [], isReady: false });
    currentSearchParams = new URLSearchParams('month=2026-05');

    render(<ListPage />);

    expect(screen.getByText('불러오는 중…')).toBeTruthy();
    const cardButtons = screen
      .queryAllByRole('button')
      .filter((b) => /일기 보기/.test(b.getAttribute('aria-label') ?? ''));
    expect(cardButtons).toHaveLength(0);
  });
});

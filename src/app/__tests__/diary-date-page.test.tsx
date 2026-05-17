// @vitest-environment happy-dom
import React from 'react';
import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';
import {
  mockNotFound,
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
  notFound:        mockNotFound,
}));

beforeEach(() => resetNavigationMocks());
afterEach(() => cleanup());

// Import after mocking
const { default: DiaryPage } = await import('@/app/diary/[date]/page');

describe('DiaryPage — date format guard', () => {
  it('valid date "2026-05-17": renders heading containing the date; mockNotFound not called', async () => {
    const date = '2026-05-17';
    const jsx = await DiaryPage({ params: Promise.resolve({ date }) });
    render(jsx);
    const heading = screen.getByRole('heading');
    expect(heading.textContent).toContain(date);
    expect(mockNotFound).not.toHaveBeenCalled();
  });

  it('invalid format "not-a-date": awaiting the page throws Error("NEXT_NOT_FOUND"); mockNotFound called once', async () => {
    const date = 'not-a-date';
    await expect(
      DiaryPage({ params: Promise.resolve({ date }) }),
    ).rejects.toThrow('NEXT_NOT_FOUND');
    expect(mockNotFound).toHaveBeenCalledTimes(1);
  });

  it('slash-separated "2026/05/17": fails regex, awaiting throws Error("NEXT_NOT_FOUND"); mockNotFound called once', async () => {
    const date = '2026/05/17';
    await expect(
      DiaryPage({ params: Promise.resolve({ date }) }),
    ).rejects.toThrow('NEXT_NOT_FOUND');
    expect(mockNotFound).toHaveBeenCalledTimes(1);
  });

  it('out-of-range month "2026-13-01": passes /^\\d{4}-\\d{2}-\\d{2}$/, renders without calling notFound (semantic check deferred to REQ-009)', async () => {
    const date = '2026-13-01';
    const jsx = await DiaryPage({ params: Promise.resolve({ date }) });
    render(jsx);
    const heading = screen.getByRole('heading');
    expect(heading.textContent).toContain(date);
    expect(mockNotFound).not.toHaveBeenCalled();
  });
});

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

vi.mock('@/lib/storage', async (importOriginal) => {
  const original = await importOriginal<typeof import('@/lib/storage')>();
  return { ...original, readDiaries: vi.fn(() => []) };
});

let showModalMock: ReturnType<typeof vi.fn>;
let closeMock: ReturnType<typeof vi.fn>;
let origShowModal: typeof HTMLDialogElement.prototype.showModal;
let origClose: typeof HTMLDialogElement.prototype.close;

beforeEach(() => {
  origShowModal = HTMLDialogElement.prototype.showModal;
  origClose = HTMLDialogElement.prototype.close;
  showModalMock = vi.fn();
  closeMock = vi.fn();
  HTMLDialogElement.prototype.showModal = showModalMock;
  HTMLDialogElement.prototype.close = closeMock;
  resetNavigationMocks();
});

afterEach(() => {
  HTMLDialogElement.prototype.showModal = origShowModal;
  HTMLDialogElement.prototype.close = origClose;
  cleanup();
});

// Import after mocking
const { default: DiaryPage } = await import('@/app/diary/[date]/page');

describe('DiaryPage — date format guard', () => {
  it('valid date "2026-05-17": renders editor textarea; mockNotFound not called', async () => {
    const date = '2026-05-17';
    const { act } = await import('@testing-library/react');
    const jsx = await DiaryPage({ params: Promise.resolve({ date }) });
    await act(async () => { render(jsx); });
    // Editor renders a textarea (the diary body input)
    expect(document.querySelector('textarea')).toBeTruthy();
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

  it('out-of-range month "2026-13-01": passes /^\\d{4}-\\d{2}-\\d{2}$/, renders without calling notFound (semantic check deferred)', async () => {
    const date = '2026-13-01';
    const { act } = await import('@testing-library/react');
    const jsx = await DiaryPage({ params: Promise.resolve({ date }) });
    await act(async () => { render(jsx); });
    expect(document.querySelector('textarea')).toBeTruthy();
    expect(mockNotFound).not.toHaveBeenCalled();
  });
});

// @vitest-environment happy-dom
import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';
import { HorizontalDatePicker } from '@/app/diary/[date]/_components/HorizontalDatePicker';

let scrollIntoViewMock: ReturnType<typeof vi.fn>;

beforeEach(() => {
  scrollIntoViewMock = vi.fn();
  HTMLElement.prototype.scrollIntoView = scrollIntoViewMock;
});
afterEach(() => {
  delete (HTMLElement.prototype as { scrollIntoView?: unknown }).scrollIntoView;
  vi.restoreAllMocks();
  cleanup();
});

/**
 * Builds a date range of `size` items centred on `current`.
 * `current` appears at index Math.floor(size / 2).
 * Uses UTC arithmetic to avoid timezone off-by-one.
 */
function makeRange(current: string, size = 61): string[] {
  const result: string[] = [];
  const [y, m, d] = current.split('-').map(Number);
  const baseMs = Date.UTC(y, m - 1, d);
  const MS_PER_DAY = 86_400_000;
  const half = Math.floor(size / 2);
  for (let i = 0; i < size; i++) {
    const ts = baseMs + (i - half) * MS_PER_DAY;
    result.push(new Date(ts).toISOString().slice(0, 10));
  }
  return result;
}

describe('HorizontalDatePicker', () => {
  it('HP1: renders one DateCell per dateRange entry', () => {
    const currentDate = '2026-05-22';
    const dateRange = makeRange(currentDate, 61);
    render(
      <HorizontalDatePicker
        currentDate={currentDate}
        dateRange={dateRange}
        entryMap={new Map()}
        onDateSelect={vi.fn()}
      />,
    );
    const cells = screen.getAllByRole('option');
    expect(cells).toHaveLength(61);
  });

  it('HP2: only the currentDate cell has aria-selected=true', () => {
    const currentDate = '2026-05-22';
    const dateRange = makeRange(currentDate, 5); // small range for speed
    render(
      <HorizontalDatePicker
        currentDate={currentDate}
        dateRange={dateRange}
        entryMap={new Map()}
        onDateSelect={vi.fn()}
      />,
    );
    const selectedCells = screen.getAllByRole('option').filter(
      (el) => el.getAttribute('aria-selected') === 'true',
    );
    expect(selectedCells).toHaveLength(1);
    expect(selectedCells[0].getAttribute('aria-label')).toMatch(/22/);
  });

  it('HP3: container has role=listbox and aria-label in Korean', () => {
    const currentDate = '2026-05-22';
    render(
      <HorizontalDatePicker
        currentDate={currentDate}
        dateRange={makeRange(currentDate, 3)}
        entryMap={new Map()}
        onDateSelect={vi.fn()}
      />,
    );
    const listbox = screen.getByRole('listbox');
    expect(listbox).toBeTruthy();
    expect(listbox.getAttribute('aria-label')).toBe('가로 캘린더');
  });

  it('HP4: scrollIntoView called on mount to centre selected cell', () => {
    const currentDate = '2026-05-22';
    render(
      <HorizontalDatePicker
        currentDate={currentDate}
        dateRange={makeRange(currentDate, 61)}
        entryMap={new Map()}
        onDateSelect={vi.fn()}
      />,
    );
    // scrollIntoView should have been called at least once
    expect(scrollIntoViewMock).toHaveBeenCalled();
    expect(scrollIntoViewMock).toHaveBeenCalledWith(
      expect.objectContaining({ inline: 'center', behavior: 'instant' }),
    );
  });
});

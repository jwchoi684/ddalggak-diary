// @vitest-environment happy-dom
import React from 'react';
import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import { DateCell } from '@/app/diary/[date]/_components/DateCell';

const { makeDiary } = await import('@/lib/storage/__tests__/fixtures');

afterEach(() => {
  cleanup();
});

describe('DateCell', () => {
  it('DC1: entry with mood — renders MoodIcon (role=img with mood label)', () => {
    const entry = makeDiary({ date: '2026-05-22', mood: 'joy' });
    render(
      <DateCell date="2026-05-22" entry={entry} isSelected={false} isToday={false} onSelect={vi.fn()} />,
    );
    // MoodIcon renders <span role="img" aria-label="행복">
    expect(screen.getByRole('img', { name: '행복' })).toBeTruthy();
  });

  it('DC2: no entry — renders day number, no mood icon', () => {
    render(
      <DateCell date="2026-05-22" entry={undefined} isSelected={false} isToday={false} onSelect={vi.fn()} />,
    );
    expect(screen.getByRole('option').textContent).toContain('22');
    expect(screen.queryByRole('img')).toBeNull();
  });

  it('DC3: entry with falsy mood — renders • placeholder, does not crash', () => {
    const entry = makeDiary({ date: '2026-05-10', mood: undefined as unknown as 'joy' });
    render(
      <DateCell date="2026-05-10" entry={entry} isSelected={false} isToday={false} onSelect={vi.fn()} />,
    );
    expect(screen.getByRole('option').textContent).toContain('•');
  });

  it('DC4: isSelected=true → aria-selected="true"; false → "false"', () => {
    const { rerender } = render(
      <DateCell date="2026-05-22" entry={undefined} isSelected={true} isToday={false} onSelect={vi.fn()} />,
    );
    expect(screen.getByRole('option').getAttribute('aria-selected')).toBe('true');

    rerender(
      <DateCell date="2026-05-22" entry={undefined} isSelected={false} isToday={false} onSelect={vi.fn()} />,
    );
    expect(screen.getByRole('option').getAttribute('aria-selected')).toBe('false');
  });

  it('DC5: aria-label is Korean date string', () => {
    render(
      <DateCell date="2026-05-22" entry={undefined} isSelected={false} isToday={false} onSelect={vi.fn()} />,
    );
    const cell = screen.getByRole('option');
    expect(cell.getAttribute('aria-label')).toMatch(/2026.*5.*22/);
    // Must contain Korean characters (year/month/day suffixes)
    expect(cell.getAttribute('aria-label')).toMatch(/년|월|일/);
  });

  it('DC6: isSelected — peach pill class applied; not applied when false', () => {
    const { rerender } = render(
      <DateCell date="2026-05-22" entry={undefined} isSelected={true} isToday={false} onSelect={vi.fn()} />,
    );
    const cell = screen.getByRole('option');
    expect(cell.className).toMatch(/bg-peach|peach/);

    rerender(
      <DateCell date="2026-05-22" entry={undefined} isSelected={false} isToday={false} onSelect={vi.fn()} />,
    );
    expect(screen.getByRole('option').className).not.toMatch(/bg-peach|peach/);
  });

  it('DC7: today dot visible when isToday && !isSelected; hidden when isSelected', () => {
    const { rerender } = render(
      <DateCell date="2026-05-22" entry={undefined} isSelected={false} isToday={true} onSelect={vi.fn()} />,
    );
    expect(document.querySelector('[data-testid="today-dot"]')).not.toBeNull();

    rerender(
      <DateCell date="2026-05-22" entry={undefined} isSelected={true} isToday={true} onSelect={vi.fn()} />,
    );
    expect(document.querySelector('[data-testid="today-dot"]')).toBeNull();
  });

  it('DC8: clicking cell calls onSelect with the date', () => {
    const onSelect = vi.fn();
    render(
      <DateCell date="2026-05-22" entry={undefined} isSelected={false} isToday={false} onSelect={onSelect} />,
    );
    fireEvent.click(screen.getByRole('option'));
    expect(onSelect).toHaveBeenCalledTimes(1);
    expect(onSelect).toHaveBeenCalledWith('2026-05-22');
  });
});

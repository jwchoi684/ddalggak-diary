// @vitest-environment happy-dom
import React from 'react';
import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import { CalendarDayCell } from '@/app/_components/CalendarDayCell';
import { makeDiary } from '@/lib/storage/__tests__/fixtures';

afterEach(() => cleanup());

describe('CalendarDayCell — no entry, not today', () => {
  it('renders a <span> with the day number extracted from date prop', () => {
    render(
      <CalendarDayCell date="2026-05-15" isToday={false} onTap={vi.fn()} />,
    );
    expect(screen.getByText('15')).toBeTruthy();
    expect(screen.queryByRole('img')).toBeNull();
  });

  it('applies text-cell-empty class on the day numeral span', () => {
    render(
      <CalendarDayCell date="2026-05-15" isToday={false} onTap={vi.fn()} />,
    );
    const span = screen.getByText('15');
    expect(span.className).toContain('text-cell-empty');
  });
});

describe('CalendarDayCell — no entry, today', () => {
  it('applies font-bold and text-peach classes on the day numeral when isToday=true', () => {
    render(
      <CalendarDayCell date="2026-05-18" isToday={true} onTap={vi.fn()} />,
    );
    const span = screen.getByText('18');
    expect(span.className).toContain('font-bold');
    expect(span.className).toContain('text-peach');
  });
});

describe('CalendarDayCell — entry present, not today', () => {
  it('renders MoodIcon (role=img) with mood aria-label; no peach dot element', () => {
    const entry = makeDiary({ date: '2026-05-10', mood: 'joy' });
    const { container } = render(
      <CalendarDayCell date="2026-05-10" entry={entry} isToday={false} onTap={vi.fn()} />,
    );
    // MoodIcon now renders <img alt={label}> — accessible name comes from alt.
    const img = screen.getByRole('img');
    expect(img.getAttribute('alt')).toBe('행복');
    expect(container.querySelector('[class*="bg-peach"]')).toBeNull();
  });
});

describe('CalendarDayCell — entry present, today', () => {
  it('renders MoodIcon AND a peach dot element (bg-peach class) when isToday=true', () => {
    const entry = makeDiary({ date: '2026-05-18', mood: 'joy' });
    const { container } = render(
      <CalendarDayCell date="2026-05-18" entry={entry} isToday={true} onTap={vi.fn()} />,
    );
    expect(screen.getByRole('img')).toBeTruthy();
    expect(container.querySelector('[class*="bg-peach"]')).toBeTruthy();
  });
});

describe('CalendarDayCell — interactions and accessibility', () => {
  it('calls onTap with the verbatim date prop when the button is clicked', () => {
    const onTap = vi.fn();
    render(
      <CalendarDayCell date="2026-05-10" isToday={false} onTap={onTap} />,
    );
    fireEvent.click(screen.getByRole('button'));
    expect(onTap).toHaveBeenCalledWith('2026-05-10');
  });

  it('aria-label is "{date} 일기 있음" when entry present; just "{date}" when absent', () => {
    const entry = makeDiary({ date: '2026-05-10', mood: 'joy' });

    const { rerender } = render(
      <CalendarDayCell date="2026-05-10" entry={entry} isToday={false} onTap={vi.fn()} />,
    );
    expect(screen.getByRole('button').getAttribute('aria-label')).toBe('2026-05-10 일기 있음');

    rerender(
      <CalendarDayCell date="2026-05-10" isToday={false} onTap={vi.fn()} />,
    );
    expect(screen.getByRole('button').getAttribute('aria-label')).toBe('2026-05-10');
  });
});

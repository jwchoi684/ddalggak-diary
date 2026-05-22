"use client";

import React from 'react';
import type { DiaryEntry } from '@/lib/storage';
import { MoodIcon } from '@/design-system/MoodIcon';

export interface DateCellProps {
  date: string;                          // "YYYY-MM-DD"
  entry: DiaryEntry | undefined;
  isSelected: boolean;
  isToday: boolean;
  onSelect: (date: string) => void;
}

/** Korean-format aria-label: "2026년 5월 22일" */
function toKoreanDateLabel(date: string): string {
  try {
    const d = new Date(date + 'T00:00:00');
    if (isNaN(d.getTime())) return date;
    return new Intl.DateTimeFormat('ko-KR', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    }).format(d);
  } catch {
    return date;
  }
}

/** Day number: "1"–"31", never zero-padded. */
function dayNumber(date: string): string {
  return date.slice(-2).replace(/^0/, '');
}

export function DateCell({ date, entry, isSelected, isToday, onSelect }: DateCellProps) {
  const dayNum = dayNumber(date);
  const ariaLabel = toKoreanDateLabel(date);

  const showDot = isToday && !isSelected;

  return (
    <button
      type="button"
      role="option"
      aria-selected={isSelected}
      aria-label={ariaLabel}
      onClick={() => onSelect(date)}
      className={[
        'flex flex-col items-center justify-center gap-1 flex-shrink-0',
        'scroll-snap-align-center',
        isSelected ? 'bg-peach rounded-full' : '',
      ]
        .filter(Boolean)
        .join(' ')}
      style={{
        width: 44,
        height: 64,
        scrollSnapAlign: 'center',
      }}
    >
      {entry ? (
        entry.mood ? (
          <>
            <MoodIcon id={entry.mood} size={24} />
            <span className="text-xs text-meta leading-none">{dayNum}</span>
          </>
        ) : (
          <>
            <span className="text-sm text-charcoal leading-none" style={{ fontSize: 24, lineHeight: '24px' }}>
              •
            </span>
            <span className="text-xs text-meta leading-none">{dayNum}</span>
          </>
        )
      ) : (
        <>
          <span className="text-sm text-charcoal leading-none">{dayNum}</span>
          {showDot && (
            <span
              data-testid="today-dot"
              className="w-1 h-1 rounded-full bg-peach mx-auto"
            />
          )}
        </>
      )}

      {/* Today dot when entry exists — render after mood content */}
      {entry && showDot && (
        <span
          data-testid="today-dot"
          className="w-1 h-1 rounded-full bg-peach mx-auto"
        />
      )}
    </button>
  );
}

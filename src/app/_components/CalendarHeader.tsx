"use client";

import React from 'react';

export interface CalendarHeaderProps {
  /** Full year of visible month (e.g. 2026). Received but not rendered in MVP. */
  year: number;
  /** 0-based month (0=January…11=December). Rendered as `{month+1}월`. */
  month: number;
  onPrev: () => void;
  onNext: () => void;
}

/**
 * Header bar for the calendar screen.
 *
 * Simplified after BottomNav landed: previously this header held four IconButtons
 * (검색, 통계, 리스트, 설정) which duplicated the bottom-nav tabs. The right side
 * is now empty so the month navigator stays the visual anchor.
 */
export function CalendarHeader({ month, onPrev, onNext }: CalendarHeaderProps) {
  return (
    <header className="flex items-center justify-between px-4 py-3">
      <div className="flex items-center gap-2">
        <button
          type="button"
          aria-label="이전 달"
          onClick={onPrev}
          className="text-charcoal text-xl px-1 min-h-[44px] min-w-[44px] flex items-center justify-center"
        >
          ‹
        </button>
        <span className="text-3xl font-bold text-charcoal">{month + 1}월</span>
        <button
          type="button"
          aria-label="다음 달"
          onClick={onNext}
          className="text-charcoal text-xl px-1 min-h-[44px] min-w-[44px] flex items-center justify-center"
        >
          ›
        </button>
      </div>
    </header>
  );
}

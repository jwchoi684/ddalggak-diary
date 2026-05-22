"use client";

import React, { useRef, useEffect } from 'react';
import type { DiaryEntry } from '@/lib/storage';
import { DateCell } from './DateCell';

export interface HorizontalDatePickerProps {
  currentDate: string;
  dateRange: string[];
  entryMap: Map<string, DiaryEntry>;
  onDateSelect: (date: string) => void;
}

/** Today's ISO date string, computed once per render to satisfy invariant 8. */
function getTodayString(): string {
  return new Date().toISOString().slice(0, 10);
}

export function HorizontalDatePicker({
  currentDate,
  dateRange,
  entryMap,
  onDateSelect,
}: HorizontalDatePickerProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const today = getTodayString();

  // Scroll selected cell into view on mount (behavior:'instant' to avoid jank)
  useEffect(() => {
    const container = scrollRef.current;
    if (!container) return;
    const selected = container.querySelector<HTMLElement>('[aria-selected="true"]');
    selected?.scrollIntoView({ inline: 'center', block: 'nearest', behavior: 'instant' });
  }, []);

  return (
    <div
      ref={scrollRef}
      role="listbox"
      aria-label="가로 캘린더"
      className="flex overflow-x-auto px-2 mb-2 animate-[slideDown_150ms_ease-out] no-scrollbar"
      style={{
        height: 72,
        scrollSnapType: 'x mandatory',
        WebkitOverflowScrolling: 'touch',
        gap: 4,
      }}
    >
      {dateRange.map((date) => (
        <DateCell
          key={date}
          date={date}
          entry={entryMap.get(date)}
          isSelected={date === currentDate}
          isToday={date === today}
          onSelect={onDateSelect}
        />
      ))}
    </div>
  );
}

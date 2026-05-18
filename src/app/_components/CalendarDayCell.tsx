"use client";

import React from 'react';
import type { DiaryEntry } from '@/lib/storage';
import { MoodIcon } from '@/design-system/MoodIcon';

export interface CalendarDayCellProps {
  /** YYYY-MM-DD. Passed verbatim to onTap. Used as aria-label base. */
  date: string;
  /**
   * Entry for this date if exists.
   * Present: render MoodIcon(id=entry.mood, size=32).
   * Absent: render grey numeral extracted from date.
   */
  entry?: DiaryEntry;
  /**
   * Today emphasis:
   * - entry present: 4px peach dot below MoodIcon
   * - entry absent: font-bold text-peach numeral instead of text-cell-empty
   */
  isToday: boolean;
  /** Called when tapped. Fires regardless of entry presence. */
  onTap: (date: string) => void;
}

/**
 * Single day cell. React.memo-wrapped — re-renders only when props change.
 * Touch target: <button> with min-h-[44px].
 * aria-label: "{date}" or "{date} 일기 있음" based on entry.
 */
export const CalendarDayCell = React.memo(function CalendarDayCell({
  date,
  entry,
  isToday,
  onTap,
}: CalendarDayCellProps) {
  const day = Number(date.slice(8));

  return (
    <button
      type="button"
      aria-label={`${date}${entry ? ' 일기 있음' : ''}`}
      onClick={() => onTap(date)}
      className="flex flex-col items-center justify-center py-2 min-h-[44px] w-full"
    >
      {entry ? (
        <>
          <MoodIcon id={entry.mood} size={32} />
          {isToday && (
            <span className="mt-0.5 w-1.5 h-1.5 rounded-full bg-peach block" />
          )}
        </>
      ) : (
        <span
          className={
            isToday
              ? 'text-sm font-bold text-peach'
              : 'text-sm text-cell-empty'
          }
        >
          {day}
        </span>
      )}
    </button>
  );
});

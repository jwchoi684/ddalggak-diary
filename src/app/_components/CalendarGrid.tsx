import React from 'react';
import type { DiaryEntry } from '@/lib/storage';
import { CalendarDayCell } from './CalendarDayCell';

export interface CalendarGridProps {
  /** Full year (e.g. 2026). Used for date math, not displayed. */
  year: number;
  /** 0-based month (0=January…11=December). */
  month: number;
  /**
   * Lookup map of diary entries keyed by "YYYY-MM-DD".
   * Built by caller via useMemo for O(1) per-cell lookup.
   * May be empty.
   */
  diaryByDate: Map<string, DiaryEntry>;
  /** Today's date "YYYY-MM-DD" (local TZ). */
  today: string;
  /** Called when any in-month cell tapped. */
  onCellTap: (date: string) => void;
}

const WEEKDAYS = ['일', '월', '화', '수', '목', '금', '토'];

/**
 * Pure 7-column monthly grid.
 * Renders 일·월·화·수·목·금·토 weekday header (Sunday-first) + 7×N day grid.
 * Out-of-month leading/trailing slots are non-interactive empty <div>.
 */
export function CalendarGrid({
  year,
  month,
  diaryByDate,
  today,
  onCellTap,
}: CalendarGridProps) {
  const firstDay = new Date(year, month, 1);
  const startOffset = firstDay.getDay(); // 0=Sun…6=Sat
  const lastDate = new Date(year, month + 1, 0).getDate();

  const totalCells = Math.ceil((startOffset + lastDate) / 7) * 7;
  const slots: (number | null)[] = [];

  for (let i = 0; i < startOffset; i++) slots.push(null);
  for (let d = 1; d <= lastDate; d++) slots.push(d);
  while (slots.length < totalCells) slots.push(null);

  return (
    <div>
      <div className="grid grid-cols-7 mb-1">
        {WEEKDAYS.map((wd) => (
          <div
            key={wd}
            className="text-center text-xs text-meta py-1"
          >
            {wd}
          </div>
        ))}
      </div>
      <div className="grid grid-cols-7 gap-y-1">
        {slots.map((day, idx) => {
          if (day === null) {
            return <div key={`empty-${idx}`} />;
          }
          const dateKey = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
          return (
            <CalendarDayCell
              key={dateKey}
              date={dateKey}
              entry={diaryByDate.get(dateKey)}
              isToday={dateKey === today}
              onTap={onCellTap}
            />
          );
        })}
      </div>
    </div>
  );
}

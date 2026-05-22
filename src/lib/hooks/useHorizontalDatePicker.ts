"use client";

import { useState, useMemo, useCallback } from 'react';
import { readDiaries } from '@/lib/storage';
import type { DiaryEntry, MoodId, Photo } from '@/lib/storage';

// AutosaveValue matches the shape used in Editor.tsx
export type AutosaveValue = {
  mood: MoodId | undefined;
  text: string;
  textAlign: 'left' | 'center';
  photos: Photo[];
};

export interface UseHorizontalDatePickerOptions {
  currentDate: string;                   // "YYYY-MM-DD"
  saveFn: (v: AutosaveValue) => void;    // same saveFn from Editor.tsx
  autosaveValue: AutosaveValue;          // { mood, text, textAlign }
  onDateChange: (newDate: string) => void; // calls setCurrentDate in Editor
  onSaveError: (msg: string) => void;    // calls toast.show(...)
}

export interface UseHorizontalDatePickerReturn {
  isOpen: boolean;
  toggle: () => void;
  close: () => void;
  dateRange: string[];                   // ISO strings, 61 items: -30d to +30d
  entryMap: Map<string, DiaryEntry>;     // date string → entry
  handleDateSelect: (newDate: string) => void;
}

/** Builds a 61-element date array centred on `centreDate` (index 30 = centreDate).
 *  Uses UTC arithmetic throughout so results are timezone-independent.
 *  Returns a single-element array with `centreDate` if the date is invalid.
 */
function buildDateRange(centreDate: string): string[] {
  // Parse as UTC midnight to avoid timezone-induced off-by-one in toISOString()
  const [y, m, d] = centreDate.split('-').map(Number);
  const centreUtcMs = Date.UTC(y, m - 1, d);
  if (isNaN(centreUtcMs)) return [centreDate];
  const MS_PER_DAY = 86_400_000;
  const result: string[] = [];
  for (let i = 0; i < 61; i++) {
    const ts = centreUtcMs + (i - 30) * MS_PER_DAY;
    result.push(new Date(ts).toISOString().slice(0, 10));
  }
  return result;
}

/** Builds an O(1) lookup map from the raw diary array. */
function buildEntryMap(entries: DiaryEntry[]): Map<string, DiaryEntry> {
  return new Map(entries.map((e) => [e.date, e]));
}

export function useHorizontalDatePicker(
  opts: UseHorizontalDatePickerOptions,
): UseHorizontalDatePickerReturn {
  const { currentDate, saveFn, autosaveValue, onDateChange, onSaveError } = opts;

  const [isOpen, setIsOpen] = useState(false);

  const toggle = useCallback(() => setIsOpen((v) => !v), []);
  const close = useCallback(() => setIsOpen(false), []);

  // Re-derive date range when currentDate changes
  const dateRange = useMemo(() => buildDateRange(currentDate), [currentDate]);

  // Re-read from storage on each open (isOpen flips true) to ensure fresh data
  const entryMap = useMemo(
    () => buildEntryMap(readDiaries()),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [isOpen],
  );

  const handleDateSelect = useCallback(
    (newDate: string) => {
      // Same-date tap: save (may be a no-op if no mood) then close; do NOT navigate
      if (newDate === currentDate) {
        try {
          saveFn(autosaveValue);
        } catch {
          // save failed on same-date — still close (no nav either way)
          onSaveError('저장에 실패했어요. 다시 시도해주세요.');
          return;
        }
        setIsOpen(false);
        return;
      }

      // Different-date tap: save first, then navigate
      try {
        saveFn(autosaveValue);
      } catch {
        onSaveError('저장에 실패했어요. 다시 시도해주세요.');
        return; // do NOT setCurrentDate, do NOT close
      }
      onDateChange(newDate);
      setIsOpen(false);
    },
    [currentDate, saveFn, autosaveValue, onDateChange, onSaveError],
  );

  return { isOpen, toggle, close, dateRange, entryMap, handleDateSelect };
}

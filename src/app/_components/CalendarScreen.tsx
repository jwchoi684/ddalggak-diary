"use client";

import React, { useState, useMemo, useCallback, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useDiaries } from '@/lib/storage/useDiaries';
import { Routes } from '@/lib/navigation';
import { FAB } from '@/design-system/FAB';
import { BottomNav } from '@/design-system/BottomNav';
import { CalendarHeader } from './CalendarHeader';
import { CalendarGrid } from './CalendarGrid';

// Pen icon for FAB (24×24, Feather-style inline SVG)
const PenIcon = (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none"
    stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
    <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
  </svg>
);

/**
 * Root screen component for `/`.
 * Owns: visible-month state, today, diary loading, swipe, navigation callbacks.
 * Renders: CalendarHeader + (when isReady) CalendarGrid + FAB.
 */
export function CalendarScreen() {
  const router = useRouter();
  const today = new Date().toLocaleDateString('sv'); // YYYY-MM-DD

  const now = new Date();
  const [visibleMonth, setVisibleMonth] = useState(
    new Date(now.getFullYear(), now.getMonth(), 1),
  );

  const { entries, isReady } = useDiaries();

  const diaryByDate = useMemo(() => {
    const map = new Map<string, (typeof entries)[number]>();
    for (const e of entries) map.set(e.date, e);
    return map;
  }, [entries]);

  const prevMonth = useCallback(() => {
    setVisibleMonth((m) => new Date(m.getFullYear(), m.getMonth() - 1, 1));
  }, []);

  const nextMonth = useCallback(() => {
    setVisibleMonth((m) => new Date(m.getFullYear(), m.getMonth() + 1, 1));
  }, []);

  const onCellTap = useCallback(
    (date: string) => router.push(Routes.diary(date)),
    [router],
  );

  const onFAB = useCallback(
    () => router.push(Routes.diary(today)),
    [router, today],
  );

  // Prefetch the editor route for dates with an entry + today so taps feel
  // instant. Editor is a heavy client bundle (PhotoCarousel, MoodPickerSheet,
  // HorizontalDatePicker); without prefetch the first tap blocks ~300-800ms
  // on bundle download.
  useEffect(() => {
    if (!isReady) return;
    router.prefetch(Routes.diary(today));
    for (const e of entries) router.prefetch(Routes.diary(e.date));
  }, [isReady, entries, router, today]);

  // Pointer-event swipe (threshold ±40px, vertical scroll unaffected)
  const pointerStartX = useRef<number | null>(null);

  const onPointerDown = useCallback((e: React.PointerEvent) => {
    pointerStartX.current = e.clientX;
  }, []);

  const onPointerUp = useCallback(
    (e: React.PointerEvent) => {
      if (pointerStartX.current === null) return;
      const delta = e.clientX - pointerStartX.current;
      pointerStartX.current = null;
      if (delta <= -40) nextMonth();
      else if (delta >= 40) prevMonth();
    },
    [nextMonth, prevMonth],
  );

  return (
    <div className="min-h-[100dvh] flex flex-col">
      <main
        onPointerDown={onPointerDown}
        onPointerUp={onPointerUp}
        className="flex-1 pb-20"
      >
        <CalendarHeader
          year={visibleMonth.getFullYear()}
          month={visibleMonth.getMonth()}
          onPrev={prevMonth}
          onNext={nextMonth}
        />
        {isReady && (
          <CalendarGrid
            year={visibleMonth.getFullYear()}
            month={visibleMonth.getMonth()}
            diaryByDate={diaryByDate}
            today={today}
            onCellTap={onCellTap}
          />
        )}
        <FAB icon={PenIcon} label="오늘 일기 쓰기" onClick={onFAB} className="!bottom-24" />
      </main>
      <BottomNav />
    </div>
  );
}

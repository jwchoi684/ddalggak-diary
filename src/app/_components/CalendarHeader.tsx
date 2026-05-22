"use client";

import React from 'react';
import { IconButton } from '@/design-system/IconButton';

// Inline SVG icon constants (24×24, Feather-style)
const SearchIcon = (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none"
    stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="11" cy="11" r="8" />
    <line x1="21" y1="21" x2="16.65" y2="16.65" />
  </svg>
);

const StatsIcon = (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none"
    stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="18" y="3" width="4" height="18" />
    <rect x="11" y="9" width="4" height="12" />
    <rect x="4" y="14" width="4" height="7" />
  </svg>
);

const ListIcon = (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none"
    stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <line x1="8" y1="6" x2="21" y2="6" />
    <line x1="8" y1="12" x2="21" y2="12" />
    <line x1="8" y1="18" x2="21" y2="18" />
    <line x1="3" y1="6" x2="3.01" y2="6" />
    <line x1="3" y1="12" x2="3.01" y2="12" />
    <line x1="3" y1="18" x2="3.01" y2="18" />
  </svg>
);

const SettingsIcon = (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none"
    stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="3" />
    <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
  </svg>
);

export interface CalendarHeaderProps {
  /** Full year of visible month (e.g. 2026). Received but not rendered in MVP. */
  year: number;
  /** 0-based month (0=January…11=December). Rendered as `{month+1}월`. */
  month: number;
  onPrev: () => void;
  onNext: () => void;
  onSearch: () => void;
  onStats: () => void;
  onList: () => void;
  onSettings?: () => void;
}

/**
 * Header bar for calendar screen.
 * Left: ‹ + "{month+1}월" (text-3xl font-bold) + ›
 * Right: 3 IconButtons (검색, 통계, 리스트).
 */
export function CalendarHeader({
  month,
  onPrev,
  onNext,
  onSearch,
  onStats,
  onList,
  onSettings,
}: CalendarHeaderProps) {
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
      <div className="flex items-center gap-2">
        <IconButton icon={SearchIcon} label="검색" onClick={onSearch} />
        <IconButton icon={StatsIcon} label="통계" onClick={onStats} />
        <IconButton icon={ListIcon} label="리스트" onClick={onList} />
        {onSettings && (
          <IconButton icon={SettingsIcon} label="설정" onClick={onSettings} />
        )}
      </div>
    </header>
  );
}

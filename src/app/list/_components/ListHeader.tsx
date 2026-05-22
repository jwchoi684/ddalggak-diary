"use client";

import React from 'react';
import { IconButton } from '@/design-system/IconButton';

export interface ListHeaderProps {
  month: string;          // "YYYY-MM"
  sort: 'asc' | 'desc';
  onBack: () => void;
  onMonthChange: (month: string) => void;
  onSortToggle: () => void;
}

function addMonths(yearMonth: string, delta: number): string {
  const [y, m] = yearMonth.split('-').map(Number);
  const d = new Date(y, m - 1 + delta, 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

const ChevronLeft = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <polyline points="15 18 9 12 15 6" />
  </svg>
);

const ChevronRight = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <polyline points="9 18 15 12 9 6" />
  </svg>
);

/**
 * Sticky header for the list screen: back nav + month navigator + sort toggle.
 */
export function ListHeader({ month, sort, onBack, onMonthChange, onSortToggle }: ListHeaderProps) {
  const [y, m] = month.split('-');
  const label = `${y}년 ${Number(m)}월`;
  const sortLabel = sort === 'desc' ? '최신순 ↓' : '오래된순 ↑';

  return (
    <header className="sticky top-0 z-10 bg-cream px-4 py-2 flex items-center justify-between">
      <IconButton
        icon={<ChevronLeft />}
        label="뒤로 가기"
        onClick={onBack}
      />

      <div className="flex items-center gap-1">
        <IconButton
          icon={<ChevronLeft />}
          label="이전 달"
          onClick={() => onMonthChange(addMonths(month, -1))}
        />
        <span className="text-charcoal font-medium text-sm min-w-[80px] text-center">
          {label}
        </span>
        <IconButton
          icon={<ChevronRight />}
          label="다음 달"
          onClick={() => onMonthChange(addMonths(month, +1))}
        />
      </div>

      <button
        type="button"
        aria-label="정렬 변경"
        onClick={onSortToggle}
        className="text-sm text-charcoal font-medium min-w-[72px] text-right"
        style={{ minHeight: 44 }}
      >
        {sortLabel}
      </button>
    </header>
  );
}

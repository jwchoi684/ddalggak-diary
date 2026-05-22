"use client";

import React from 'react';
import { IconButton } from '@/design-system/IconButton';
import { addMonths } from '@/lib/utils/addMonths';

export interface StatsHeaderProps {
  month: string;                        // "YYYY-MM"
  onMonthChange: (month: string) => void;
  onClose: () => void;
}

const ChevronLeft = () => (
  <svg
    width="24"
    height="24"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden="true"
  >
    <polyline points="15 18 9 12 15 6" />
  </svg>
);

const ChevronRight = () => (
  <svg
    width="24"
    height="24"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden="true"
  >
    <polyline points="9 18 15 12 9 6" />
  </svg>
);

const CloseIcon = () => (
  <svg
    width="24"
    height="24"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    aria-hidden="true"
  >
    <line x1="18" y1="6" x2="6" y2="18" />
    <line x1="6" y1="6" x2="18" y2="18" />
  </svg>
);

/**
 * Header for the Stats screen: year + "M월" month navigator + ✕ close button.
 * Fully controlled — no internal state.
 */
export function StatsHeader({ month, onMonthChange, onClose }: StatsHeaderProps) {
  const [y, m] = month.split('-');

  return (
    <header className="relative flex flex-col items-center pt-4 pb-3 bg-cream">
      <IconButton
        icon={<CloseIcon />}
        label="닫기"
        onClick={onClose}
        className="absolute top-4 right-4"
      />

      <p className="text-meta text-sm">{y}</p>

      <div className="flex items-center gap-1">
        <IconButton
          icon={<ChevronLeft />}
          label="이전 달"
          onClick={() => onMonthChange(addMonths(month, -1))}
        />
        <span className="text-charcoal font-semibold text-lg min-w-[60px] text-center">
          {Number(m)}월
        </span>
        <IconButton
          icon={<ChevronRight />}
          label="다음 달"
          onClick={() => onMonthChange(addMonths(month, +1))}
        />
      </div>
    </header>
  );
}

"use client";

import React from 'react';
import type { PickerId } from '@/lib/storage';
import { MOODS } from '@/design-system/moods';
import { BottomSheet } from '@/design-system/BottomSheet';
import { IconButton } from '@/design-system/IconButton';
import { MoodIcon } from '@/design-system/MoodIcon';

const WEEKDAY_FMT = new Intl.DateTimeFormat('ko-KR', { weekday: 'short' });

function formatSheetDate(date: string): string {
  const d = new Date(date + 'T00:00:00');
  if (isNaN(d.getTime())) return date.replace(/-/g, '.');
  return `${date.replace(/-/g, '.')} ${WEEKDAY_FMT.format(d)}`;
}

const CloseIcon = (
  <svg viewBox="0 0 24 24" width={20} height={20} fill="none"
       stroke="currentColor" strokeWidth={2} strokeLinecap="round">
    <line x1="6" y1="6" x2="18" y2="18" />
    <line x1="6" y1="18" x2="18" y2="6" />
  </svg>
);

export interface MoodPickerSheetProps {
  /** Controlled open state. When false the sheet slides down; component stays mounted. */
  open: boolean;
  /** ISO 'YYYY-MM-DD' date string (local timezone). Rendered as 'YYYY.MM.DD 요일'. */
  date: string;
  /** Currently selected picker id to highlight. Undefined in 'initial' mode. */
  selectedId?: PickerId;
  /** 'initial' — auto-opened on new entry; 'change' — user re-tapped to swap mood. */
  mode: 'initial' | 'change';
  /** Called when the user taps a mood cell. onClose() follows immediately. */
  onSelect: (id: PickerId) => void;
  /** Always fires on close. Also fires after onSelect. */
  onClose: () => void;
  /** Only fires when mode='initial' AND closed without selection. Fires before onClose. */
  onCancelInitial?: () => void;
}

export function MoodPickerSheet({
  open,
  date,
  selectedId,
  mode,
  onSelect,
  onClose,
  onCancelInitial,
}: MoodPickerSheetProps) {
  function handleCancel() {
    if (mode === 'initial') onCancelInitial?.();
    onClose();
  }

  function handleSelect(id: PickerId) {
    onSelect(id);
    onClose();
  }

  return (
    <BottomSheet open={open} onClose={handleCancel}>
      <div className="flex items-start justify-between mb-4">
        <div>
          <p className="text-xs text-meta">{formatSheetDate(date)}</p>
          <h2 className="text-lg font-medium text-charcoal">오늘은 어떤 하루였나요?</h2>
        </div>
        <IconButton icon={CloseIcon} label="닫기" onClick={handleCancel} />
      </div>

      <div className="grid grid-cols-4 gap-3">
        {MOODS.map((item) => (
          <button
            key={item.id}
            type="button"
            aria-label={item.label}
            onClick={() => handleSelect(item.id)}
            className={`flex flex-col items-center gap-1 p-1 rounded-[var(--radius-card)] min-h-[44px]${
              item.id === selectedId ? ' ring-2 ring-peach bg-peach-light/30' : ''
            }`}
          >
            <MoodIcon id={item.id} size={56} />
            <span className="text-xs text-charcoal">{item.label}</span>
          </button>
        ))}
      </div>
    </BottomSheet>
  );
}

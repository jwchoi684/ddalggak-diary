"use client";

import React from 'react';
import type { MoodId } from '@/lib/storage';
import { MOODS } from '@/design-system/moods';
import { BottomSheet } from '@/design-system/BottomSheet';
import { Toast } from '@/design-system/Toast';
import { useToast } from '@/design-system/useToast';
import { IconButton } from '@/design-system/IconButton';
import { MoodIcon } from '@/design-system/MoodIcon';

const WEEKDAY_FMT = new Intl.DateTimeFormat('ko-KR', { weekday: 'short' });

function formatSheetDate(date: string): string {
  const d = new Date(date + 'T00:00:00');
  return `${date.replace(/-/g, '.')} ${WEEKDAY_FMT.format(d)}`;
}

const CloseIcon = (
  <svg viewBox="0 0 24 24" width={20} height={20} fill="none"
       stroke="currentColor" strokeWidth={2} strokeLinecap="round">
    <line x1="6" y1="6" x2="18" y2="18" />
    <line x1="6" y1="18" x2="18" y2="6" />
  </svg>
);

function MoodPickerTabs({ onInactiveTap }: { onInactiveTap: () => void }) {
  return (
    <div className="mb-4">
      <div className="flex gap-4 mb-1">
        <button type="button"
          className="text-sm font-medium text-charcoal border-b-2 border-charcoal pb-1 min-h-[44px] px-2">
          기본
        </button>
        <button type="button" onClick={onInactiveTap}
          className="text-sm text-meta pb-1 min-h-[44px] px-2">
          테마
        </button>
      </div>
      <div className="flex gap-4">
        <button type="button"
          className="text-xs font-medium text-charcoal border-b-2 border-charcoal pb-1 min-h-[44px] px-2">
          기분
        </button>
        <button type="button" onClick={onInactiveTap}
          className="text-xs text-meta pb-1 min-h-[44px] px-2">
          일상
        </button>
      </div>
    </div>
  );
}

export interface MoodPickerSheetProps {
  /** Controlled open state. When false the sheet slides down; component stays mounted. */
  open: boolean;
  /** ISO 'YYYY-MM-DD' date string (local timezone). Rendered as 'YYYY.MM.DD 요일'. */
  date: string;
  /** Currently selected mood to highlight. Undefined in 'initial' mode. */
  selectedMoodId?: MoodId;
  /** 'initial' — auto-opened on new entry; 'change' — user re-tapped to swap mood. */
  mode: 'initial' | 'change';
  /** Called when the user taps a mood cell. onClose() follows immediately. */
  onSelect: (moodId: MoodId) => void;
  /** Always fires on close. Also fires after onSelect. */
  onClose: () => void;
  /** Only fires when mode='initial' AND closed without selection. Fires before onClose. */
  onCancelInitial?: () => void;
}

export function MoodPickerSheet({
  open,
  date,
  selectedMoodId,
  mode,
  onSelect,
  onClose,
  onCancelInitial,
}: MoodPickerSheetProps) {
  const toast = useToast();

  function handleCancel() {
    if (mode === 'initial') onCancelInitial?.();
    onClose();
  }

  function handleSelect(moodId: MoodId) {
    onSelect(moodId);
    onClose();
  }

  return (
    <BottomSheet open={open} onClose={handleCancel}>
      <div className="flex items-start justify-between mb-2">
        <div>
          <p className="text-xs text-meta">{formatSheetDate(date)}</p>
          <h2 className="text-lg font-medium text-charcoal">오늘은 어떤 하루였나요?</h2>
        </div>
        <IconButton icon={CloseIcon} label="닫기" onClick={handleCancel} />
      </div>

      <MoodPickerTabs onInactiveTap={() => toast.show('곧 만나요!')} />

      <div className="grid grid-cols-3 gap-4">
        {MOODS.map((mood) => (
          <button
            key={mood.id}
            type="button"
            aria-label={mood.label}
            onClick={() => handleSelect(mood.id)}
            className={`flex flex-col items-center gap-2 p-2 rounded-[var(--radius-card)] min-h-[44px]${
              mood.id === selectedMoodId ? ' ring-2 ring-peach bg-peach-light/30' : ''
            }`}
          >
            <MoodIcon id={mood.id} size={72} />
            <span className="text-sm text-charcoal">{mood.label}</span>
          </button>
        ))}
      </div>

      <Toast
        message={toast.message}
        open={toast.open}
        onClose={toast.hide}
        className="!bottom-6 left-1/2 -translate-x-1/2"
      />
    </BottomSheet>
  );
}

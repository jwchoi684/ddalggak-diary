"use client";

import React from 'react';
import { BottomSheet } from '@/design-system/BottomSheet';

interface EditorMoreMenuProps {
  open: boolean;
  hasSavedEntry: boolean;
  onClose: () => void;
  onNavigateList: () => void;
  onDeleteTap: () => void;
}

export function EditorMoreMenu({
  open,
  hasSavedEntry,
  onClose,
  onNavigateList,
  onDeleteTap,
}: EditorMoreMenuProps) {
  return (
    <BottomSheet open={open} onClose={onClose}>
      <div className="flex flex-col gap-2">
        <button
          type="button"
          onClick={() => { onClose(); onNavigateList(); }}
          className="flex items-center gap-3 w-full text-left px-2 py-3 text-charcoal text-base min-h-[44px] rounded-[var(--radius-card)] hover:bg-cream"
        >
          📋 일기 리스트 보기
        </button>

        {hasSavedEntry && (
          <button
            type="button"
            aria-label="일기 삭제"
            onClick={() => { onClose(); onDeleteTap(); }}
            className="flex items-center gap-3 w-full text-left px-2 py-3 text-base min-h-[44px] rounded-[var(--radius-card)] hover:bg-cream"
            style={{ color: 'var(--color-danger)' }}
          >
            🗑 일기 삭제
          </button>
        )}
      </div>
    </BottomSheet>
  );
}

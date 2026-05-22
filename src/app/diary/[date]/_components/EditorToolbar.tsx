"use client";

import React from 'react';

const GalleryIcon = (
  <svg viewBox="0 0 24 24" width={24} height={24} fill="none"
       stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
    <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
    <circle cx="8.5" cy="8.5" r="1.5" />
    <polyline points="21 15 16 10 5 21" />
  </svg>
);

const AlignLeftIcon = (
  <svg viewBox="0 0 24 24" width={24} height={24} fill="none"
       stroke="currentColor" strokeWidth={2} strokeLinecap="round">
    <line x1="3" y1="6" x2="21" y2="6" />
    <line x1="3" y1="12" x2="15" y2="12" />
    <line x1="3" y1="18" x2="18" y2="18" />
  </svg>
);

const AlignCenterIcon = (
  <svg viewBox="0 0 24 24" width={24} height={24} fill="none"
       stroke="currentColor" strokeWidth={2} strokeLinecap="round">
    <line x1="3" y1="6" x2="21" y2="6" />
    <line x1="6" y1="12" x2="18" y2="12" />
    <line x1="4" y1="18" x2="20" y2="18" />
  </svg>
);

const TimeIcon = (
  <svg viewBox="0 0 24 24" width={24} height={24} fill="none"
       stroke="currentColor" strokeWidth={2} strokeLinecap="round">
    <circle cx="12" cy="12" r="9" />
    <polyline points="12 7 12 12 15 15" />
  </svg>
);

const SaveIcon = (
  <svg viewBox="0 0 24 24" width={24} height={24} fill="none"
       stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round">
    <polyline points="20 6 9 17 4 12" />
  </svg>
);

interface EditorToolbarProps {
  isDirty: boolean;
  textAlign: 'left' | 'center';
  onAlignToggle: () => void;
  onTimeInsert: () => void;
  onGalleryTap: () => void;
  onExplicitSave: () => void;
  galleryDisabled?: boolean;
}

export function EditorToolbar({
  isDirty,
  textAlign,
  onAlignToggle,
  onTimeInsert,
  onGalleryTap,
  onExplicitSave,
  galleryDisabled = false,
}: EditorToolbarProps) {
  return (
    <div
      className="sticky bottom-0 bg-paper border-t border-meta/20 flex items-center px-4 py-3 gap-4 shrink-0"
      style={{ paddingBottom: 'max(12px, env(safe-area-inset-bottom, 0px))' }}
    >
      <button
        type="button"
        aria-label="갤러리"
        onClick={onGalleryTap}
        disabled={galleryDisabled}
        className={`text-meta min-h-[44px] min-w-[44px] inline-flex items-center justify-center${galleryDisabled ? ' opacity-50 cursor-not-allowed' : ''}`}
      >
        {GalleryIcon}
      </button>

      <button
        type="button"
        aria-label="정렬 변경"
        onClick={onAlignToggle}
        className="text-meta min-h-[44px] min-w-[44px] inline-flex items-center justify-center"
      >
        {textAlign === 'left' ? AlignLeftIcon : AlignCenterIcon}
      </button>

      <button
        type="button"
        aria-label="현재 시간 삽입"
        onClick={onTimeInsert}
        className="text-meta min-h-[44px] min-w-[44px] inline-flex items-center justify-center"
      >
        {TimeIcon}
      </button>

      {isDirty && (
        <button
          type="button"
          aria-label="저장"
          onClick={onExplicitSave}
          className="text-charcoal min-h-[44px] min-w-[44px] inline-flex items-center justify-center ml-auto"
        >
          {SaveIcon}
        </button>
      )}
    </div>
  );
}

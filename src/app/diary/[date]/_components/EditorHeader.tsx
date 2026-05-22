"use client";

import React from 'react';
import { IconButton } from '@/design-system/IconButton';

const BackIcon = (
  <svg viewBox="0 0 24 24" width={24} height={24} fill="none"
       stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
    <polyline points="15 18 9 12 15 6" />
  </svg>
);

const MoreIcon = (
  <svg viewBox="0 0 24 24" width={24} height={24} fill="currentColor">
    <circle cx="5" cy="12" r="1.5" />
    <circle cx="12" cy="12" r="1.5" />
    <circle cx="19" cy="12" r="1.5" />
  </svg>
);

interface EditorHeaderProps {
  onBack: () => void;
  onMoreMenu: () => void;
}

export function EditorHeader({ onBack, onMoreMenu }: EditorHeaderProps) {
  return (
    <header className="flex items-center justify-between px-4 py-3 shrink-0">
      <IconButton icon={BackIcon} label="뒤로가기" onClick={onBack} />
      <IconButton icon={MoreIcon} label="더보기" onClick={onMoreMenu} />
    </header>
  );
}

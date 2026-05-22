"use client";

import React from 'react';
import { IconButton } from '@/design-system/IconButton';

export interface ChatListHeaderProps {
  onBack: () => void;
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

/**
 * Sticky header for the chat list screen: back button + "대화 기록" title.
 */
export function ChatListHeader({ onBack }: ChatListHeaderProps) {
  return (
    <header className="sticky top-0 z-10 bg-cream px-4 py-2">
      {/* Hidden landmark heading for screen readers */}
      <h1 className="sr-only">대화 기록</h1>

      <div className="flex items-center justify-between">
        <IconButton
          icon={<ChevronLeft />}
          label="뒤로 가기"
          onClick={onBack}
        />
        <span className="text-charcoal font-medium text-base">대화 기록</span>
        {/* Spacer to center the title */}
        <div style={{ width: 44 }} aria-hidden="true" />
      </div>
    </header>
  );
}

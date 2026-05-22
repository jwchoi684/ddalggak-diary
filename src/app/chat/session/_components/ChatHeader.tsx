"use client";

import React from 'react';
import { IconButton } from '@/design-system/IconButton';
import type { Persona } from '@/lib/storage';

interface ChatHeaderProps {
  persona: Persona;
  onBack: () => void;
  onDone: () => void;
}

function BackIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 20 20" aria-hidden="true">
      <path
        d="M13 16 L7 10 L13 4"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />
    </svg>
  );
}

/**
 * ChatHeader — header for the active chat session screen.
 *
 * Left:   ‹ back button (aria "뒤로 가기") → ends session
 * Center: persona emoji + label (no persona-change entry point per PRD §4.6.6)
 * Right:  "완료" button (aria "대화 완료") → explicit session end
 */
export function ChatHeader({ persona, onBack, onDone }: ChatHeaderProps) {
  return (
    <header className="flex items-center justify-between px-4 pt-4 pb-2">
      <IconButton
        icon={<BackIcon />}
        label="뒤로 가기"
        onClick={onBack}
      />

      <div className="flex flex-col items-center gap-0.5">
        <span className="text-2xl" aria-hidden="true">
          {persona.emoji}
        </span>
        <span className="text-sm font-medium text-charcoal">{persona.label}</span>
      </div>

      <button
        type="button"
        aria-label="대화 완료"
        onClick={onDone}
        className="text-sm font-medium text-peach-dark px-3 py-2 rounded-lg"
        style={{ minWidth: 44, minHeight: 44 }}
      >
        완료
      </button>
    </header>
  );
}

"use client";

import React from 'react';
import { IconButton } from '@/design-system/IconButton';
import type { Persona } from '@/lib/storage';

interface ReadOnlyChatHeaderProps {
  persona: Persona;
  onBack: () => void;
  onDelete?: () => void;
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

function TrashIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 20 20" aria-hidden="true">
      <polyline points="5 7 15 7" stroke="currentColor" strokeWidth="1.8"
        strokeLinecap="round" fill="none" />
      <path d="M8 7V5h4v2" stroke="currentColor" strokeWidth="1.8"
        strokeLinecap="round" strokeLinejoin="round" fill="none" />
      <rect x="6" y="7" width="8" height="9" rx="1.5"
        stroke="currentColor" strokeWidth="1.8" fill="none" />
    </svg>
  );
}

/**
 * ReadOnlyChatHeader — header for the read-only (mode D) past conversation screen.
 *
 * Left:   ‹ back button
 * Center: persona emoji + "{label} (종료됨)"
 * Right:  optional 🗑 delete button
 */
export function ReadOnlyChatHeader({
  persona,
  onBack,
  onDelete,
}: ReadOnlyChatHeaderProps) {
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
        <span className="text-sm font-medium text-charcoal">
          {persona.label} (종료됨)
        </span>
      </div>

      {onDelete ? (
        <IconButton
          icon={<TrashIcon />}
          label="대화 삭제"
          onClick={onDelete}
        />
      ) : (
        <div style={{ width: 44 }} aria-hidden="true" />
      )}
    </header>
  );
}

"use client";

import React from 'react';
import { IconButton } from '@/design-system/IconButton';
import type { Persona } from '@/lib/storage';

interface ChatHeaderProps {
  persona: Persona;
  /** Opens the past-conversations list. */
  onListTap: () => void;
  /** When provided, the center persona label becomes tappable and opens a picker. */
  onPersonaTap?: () => void;
}

function ListIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 20 20" aria-hidden="true" fill="none"
      stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="7" y1="5" x2="17" y2="5" />
      <line x1="7" y1="10" x2="17" y2="10" />
      <line x1="7" y1="15" x2="17" y2="15" />
      <line x1="3" y1="5" x2="3.01" y2="5" />
      <line x1="3" y1="10" x2="3.01" y2="10" />
      <line x1="3" y1="15" x2="3.01" y2="15" />
    </svg>
  );
}

/**
 * ChatHeader — header for the active chat session screen.
 *
 * Left:   ☰ list button (aria "리스트 보기") → past conversations
 * Center: persona emoji + label — tappable when onPersonaTap is provided, opens picker
 * Right:  empty spacer (kept for the layout's justify-between to stay centered).
 *
 * There is no "complete" / "end session" affordance — the conversation auto-saves
 * on every message and on leave; the user just navigates away.
 */
export function ChatHeader({ persona, onListTap, onPersonaTap }: ChatHeaderProps) {
  const centerInner = (
    <>
      <span className="text-2xl" aria-hidden="true">
        {persona.emoji}
      </span>
      <span className="text-sm font-medium text-charcoal flex items-center gap-1">
        {persona.label}
        {onPersonaTap && <span aria-hidden="true" className="text-meta text-xs">▾</span>}
      </span>
    </>
  );

  return (
    <header className="flex items-center justify-between px-4 pt-4 pb-2">
      <IconButton
        icon={<ListIcon />}
        label="리스트 보기"
        onClick={onListTap}
      />

      {onPersonaTap ? (
        <button
          type="button"
          aria-label="페르소나 변경"
          onClick={onPersonaTap}
          className="flex flex-col items-center gap-0.5 px-2 py-1 rounded-lg"
          data-testid="chat-persona-button"
        >
          {centerInner}
        </button>
      ) : (
        <div className="flex flex-col items-center gap-0.5">
          {centerInner}
        </div>
      )}

      <span aria-hidden="true" style={{ minWidth: 44, minHeight: 44 }} />
    </header>
  );
}

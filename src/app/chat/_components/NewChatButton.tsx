"use client";

import React from 'react';

export interface NewChatButtonProps {
  onClick: () => void;
}

/**
 * Full-width pill button that starts a new AI chat conversation.
 */
export function NewChatButton({ onClick }: NewChatButtonProps) {
  return (
    <button
      type="button"
      aria-label="새 대화 시작"
      data-testid="new-chat-button"
      onClick={onClick}
      className="w-full bg-paper p-4 text-charcoal font-medium text-base"
      style={{
        borderRadius: 'var(--radius-card)',
        boxShadow: 'var(--shadow-card)',
        minHeight: 44,
      }}
    >
      ➕&nbsp; 새 대화 시작
    </button>
  );
}

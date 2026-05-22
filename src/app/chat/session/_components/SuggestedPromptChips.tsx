"use client";

import React from 'react';

const FALLBACK_PROMPTS = [
  '오늘 기분 어땠어?',
  '이번 달에 자주 느낀 감정은?',
  '최근 좋았던 일은?',
];

interface SuggestedPromptChipsProps {
  /** Optional persona-specific suggested questions. Falls back to 3 defaults. */
  suggestedQuestions?: string[];
  onSelect: (prompt: string) => void;
}

/**
 * SuggestedPromptChips — shown when there are no messages in the session yet.
 *
 * Tapping a chip fills the composer input (does NOT auto-send per PRD §REQ-017).
 * Uses persona.suggestedQuestions if available, otherwise falls back to 3 generic prompts.
 */
export function SuggestedPromptChips({
  suggestedQuestions,
  onSelect,
}: SuggestedPromptChipsProps) {
  const prompts =
    suggestedQuestions && suggestedQuestions.length > 0
      ? suggestedQuestions.slice(0, 5)
      : FALLBACK_PROMPTS;

  return (
    <div
      className="flex flex-wrap gap-2 px-4 py-3"
      data-testid="suggested-prompt-chips"
    >
      {prompts.map((prompt) => (
        <button
          key={prompt}
          type="button"
          onClick={() => onSelect(prompt)}
          className="px-3 py-1.5 rounded-full text-sm bg-paper text-charcoal border border-meta/30"
          style={{ boxShadow: 'var(--shadow-card)', minHeight: 36 }}
        >
          {prompt}
        </button>
      ))}
    </div>
  );
}

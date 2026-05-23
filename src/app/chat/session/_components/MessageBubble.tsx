"use client";

import React, { useMemo } from 'react';
import type { ChatMessage } from '@/lib/storage';
import { CitedDiaryChip } from './CitedDiaryChip';
import { renderContentWithDateLinks } from './renderContentWithDateLinks';

interface MessageBubbleProps {
  message: ChatMessage;
  onCitedDiaryTap?: (diaryId: string) => void;
  /** Maps diary id → ISO "YYYY-MM-DD". Used to render chip labels like "5월 23일". */
  diaryDateById?: Map<string, string>;
}

function chipLabel(diaryId: string, dateMap?: Map<string, string>): string {
  const iso = dateMap?.get(diaryId);
  if (!iso) return `📌 ${diaryId}`;
  const [, m, d] = iso.split('-');
  return `📌 ${Number(m)}월 ${Number(d)}일`;
}

/**
 * MessageBubble — renders a single chat message.
 *
 * User messages: right-aligned, peach background.
 * Assistant messages: left-aligned, white/paper background.
 * Cited diary chips rendered below assistant message content.
 */
export function MessageBubble({ message, onCitedDiaryTap, diaryDateById }: MessageBubbleProps) {
  const isUser = message.role === 'user';

  // Build a date → diaryId reverse lookup so dates that the LLM puts inline in
  // its prose (e.g. "5월 23일") become tappable, not just the chip below.
  const dateToDiaryId = useMemo(() => {
    const m = new Map<string, string>();
    if (diaryDateById) {
      for (const [id, date] of diaryDateById) m.set(date, id);
    }
    return m;
  }, [diaryDateById]);

  const renderedContent =
    !isUser && onCitedDiaryTap
      ? renderContentWithDateLinks(message.content, dateToDiaryId, onCitedDiaryTap)
      : message.content;

  return (
    <div
      className={`flex flex-col gap-1 ${isUser ? 'items-end' : 'items-start'}`}
      data-testid={`message-bubble-${message.id}`}
    >
      <div
        className={`max-w-[80%] px-4 py-3 rounded-2xl text-sm leading-relaxed whitespace-pre-wrap ${
          isUser
            ? 'bg-peach text-charcoal rounded-br-sm'
            : 'bg-paper text-charcoal rounded-bl-sm'
        }`}
        style={{ boxShadow: isUser ? undefined : 'var(--shadow-card)' }}
      >
        {renderedContent}
      </div>

      {!isUser &&
        message.citedDiaryIds &&
        message.citedDiaryIds.length > 0 && (
          <div className="flex flex-wrap gap-1 mt-1">
            {message.citedDiaryIds.map((diaryId) => (
              <CitedDiaryChip
                key={diaryId}
                diaryId={diaryId}
                label={chipLabel(diaryId, diaryDateById)}
                onTap={onCitedDiaryTap}
              />
            ))}
          </div>
        )}
    </div>
  );
}

/**
 * LoadingBubble — placeholder bubble shown while AI is responding.
 */
export function LoadingBubble() {
  return (
    <div className="flex items-start" data-testid="loading-bubble">
      <div
        className="max-w-[80%] px-4 py-3 rounded-2xl rounded-bl-sm text-sm text-meta bg-paper"
        style={{ boxShadow: 'var(--shadow-card)' }}
      >
        답변 작성 중…
      </div>
    </div>
  );
}

/**
 * ErrorBubble — shown when an API call fails.
 * Preserves the user's message; allows retry.
 */
export function ErrorBubble({ onRetry }: { onRetry: () => void }) {
  return (
    <div className="flex items-start" data-testid="error-bubble">
      <div
        className="max-w-[80%] px-4 py-3 rounded-2xl rounded-bl-sm text-sm bg-paper"
        style={{ boxShadow: 'var(--shadow-card)' }}
      >
        <p className="text-danger mb-2">응답을 받지 못했어요.</p>
        <button
          type="button"
          onClick={onRetry}
          className="text-sm font-medium text-peach-dark underline"
        >
          다시 시도
        </button>
      </div>
    </div>
  );
}

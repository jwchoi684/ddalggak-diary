"use client";

import React from 'react';
import { Card } from '@/design-system/Card';
import { getPersona } from '@/design-system/personas';
import { formatRelativeTime } from '@/lib/utils/formatRelativeTime';
import type { SearchConversation } from '@/lib/storage/types';

export interface ConversationCardProps {
  conversation: SearchConversation;
  onTap: () => void;
  /** When provided, renders a small "delete" affordance in the card's top-right. */
  onDelete?: () => void;
}

const TRUNCATE_LENGTH = 30;

function getFirstUserMessage(conversation: SearchConversation): string {
  const userMsg = conversation.messages.find((m) => m.role === 'user');
  if (!userMsg) {
    return '(빈 대화)';
  }
  const text = userMsg.content;
  return text.length > TRUNCATE_LENGTH
    ? text.slice(0, TRUNCATE_LENGTH) + '…'
    : text;
}

/**
 * Card button representing a single AI chat conversation in the list.
 */
export function ConversationCard({ conversation, onTap, onDelete }: ConversationCardProps) {
  const persona = getPersona(conversation.personaId);
  const relativeTime = formatRelativeTime(conversation.lastMessageAt);
  const preview = getFirstUserMessage(conversation);
  const ariaLabel = `${persona.label} 대화 보기, ${relativeTime}`;

  // Use a div (not button) so the delete affordance can be a real button without
  // nesting interactive elements. Click target is the entire card via onClick +
  // role=button; delete button stops propagation.
  return (
    <div
      role="button"
      tabIndex={0}
      aria-label={ariaLabel}
      data-testid={`conversation-card-${conversation.id}`}
      onClick={onTap}
      onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onTap(); } }}
      className="w-full text-left cursor-pointer"
    >
      <Card className="p-4 relative">
        <div className="flex items-center gap-2 mb-1 pr-8">
          <span aria-hidden="true">{persona.emoji}</span>
          <span className="text-charcoal font-medium text-sm">{persona.label}</span>
          <span className="text-meta text-sm" aria-hidden="true">·</span>
          <time
            dateTime={conversation.lastMessageAt}
            className="text-meta text-sm"
          >
            {relativeTime}
          </time>
        </div>
        <p className="text-charcoal text-sm">{preview}</p>

        {onDelete && (
          <button
            type="button"
            aria-label="대화 삭제"
            data-testid={`conversation-delete-${conversation.id}`}
            onClick={(e) => { e.stopPropagation(); onDelete(); }}
            className="absolute top-2 right-2 min-h-[36px] min-w-[36px] flex items-center justify-center text-meta hover:text-danger"
          >
            <svg width="18" height="18" viewBox="0 0 20 20" aria-hidden="true" fill="none"
              stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="3 6 17 6" />
              <path d="M8 6V4a1 1 0 0 1 1-1h2a1 1 0 0 1 1 1v2" />
              <path d="M5 6l1 11a2 2 0 0 0 2 2h4a2 2 0 0 0 2-2l1-11" />
            </svg>
          </button>
        )}
      </Card>
    </div>
  );
}

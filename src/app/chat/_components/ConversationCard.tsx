"use client";

import React from 'react';
import { Card } from '@/design-system/Card';
import { getPersona } from '@/design-system/personas';
import { formatRelativeTime } from '@/lib/utils/formatRelativeTime';
import type { SearchConversation } from '@/lib/storage/types';

export interface ConversationCardProps {
  conversation: SearchConversation;
  onTap: () => void;
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
export function ConversationCard({ conversation, onTap }: ConversationCardProps) {
  const persona = getPersona(conversation.personaId);
  const relativeTime = formatRelativeTime(conversation.lastMessageAt);
  const preview = getFirstUserMessage(conversation);
  const ariaLabel = `${persona.label} 대화 보기, ${relativeTime}`;

  return (
    <button
      type="button"
      aria-label={ariaLabel}
      data-testid={`conversation-card-${conversation.id}`}
      onClick={onTap}
      className="w-full text-left"
    >
      <Card className="p-4">
        <div className="flex items-center gap-2 mb-1">
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
      </Card>
    </button>
  );
}

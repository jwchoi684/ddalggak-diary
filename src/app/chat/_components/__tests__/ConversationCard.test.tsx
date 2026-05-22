// @vitest-environment happy-dom
import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import type { SearchConversation, ChatMessage } from '@/lib/storage/types';

// We need to mock formatRelativeTime to get predictable output in tests
vi.mock('@/lib/utils/formatRelativeTime', () => ({
  formatRelativeTime: vi.fn(() => '방금'),
}));

const { ConversationCard } = await import('../ConversationCard');

function makeMessage(role: 'user' | 'assistant', content: string): ChatMessage {
  return {
    id: `msg-${Math.random()}`,
    role,
    content,
    timestamp: new Date().toISOString(),
  };
}

function makeConversation(overrides?: Partial<SearchConversation>): SearchConversation {
  return {
    id: 'conv-1',
    personaId: 'friend',
    title: '대화 1',
    messages: [],
    startedAt: new Date().toISOString(),
    lastMessageAt: new Date().toISOString(),
    isClosed: false,
    ...overrides,
  };
}

beforeEach(() => {
  cleanup();
});

describe('ConversationCard', () => {
  it('CC1: renders persona emoji and label', () => {
    const conv = makeConversation({ personaId: 'friend' });
    render(<ConversationCard conversation={conv} onTap={vi.fn()} />);

    // friend persona: emoji 👯, label 친구
    expect(screen.getByText('👯')).toBeTruthy();
    expect(screen.getByText('친구')).toBeTruthy();
  });

  it('CC2: renders relative time via formatRelativeTime', () => {
    const conv = makeConversation();
    render(<ConversationCard conversation={conv} onTap={vi.fn()} />);

    // formatRelativeTime is mocked to return '방금'
    expect(screen.getByText('방금')).toBeTruthy();
  });

  it('CC3: truncates a long first user message to 30 chars + "…"', () => {
    const longContent = 'A'.repeat(40);
    const conv = makeConversation({
      messages: [makeMessage('user', longContent)],
    });
    render(<ConversationCard conversation={conv} onTap={vi.fn()} />);

    const expected = 'A'.repeat(30) + '…';
    expect(screen.getByText(expected)).toBeTruthy();
  });

  it('CC4: uses first user message (not assistant message)', () => {
    const conv = makeConversation({
      messages: [
        makeMessage('assistant', '안녕하세요!'),
        makeMessage('user', '사용자 메시지'),
      ],
    });
    render(<ConversationCard conversation={conv} onTap={vi.fn()} />);

    expect(screen.getByText('사용자 메시지')).toBeTruthy();
    expect(screen.queryByText('안녕하세요!')).toBeNull();
  });

  it('CC5: shows "(빈 대화)" fallback when no user message', () => {
    const conv = makeConversation({
      messages: [makeMessage('assistant', 'AI response only')],
    });
    render(<ConversationCard conversation={conv} onTap={vi.fn()} />);

    expect(screen.getByText('(빈 대화)')).toBeTruthy();
  });

  it('CC6: click fires onTap callback', () => {
    const onTap = vi.fn();
    const conv = makeConversation();
    render(<ConversationCard conversation={conv} onTap={onTap} />);

    const button = screen.getByTestId('conversation-card-conv-1');
    fireEvent.click(button);

    expect(onTap).toHaveBeenCalledTimes(1);
  });
});

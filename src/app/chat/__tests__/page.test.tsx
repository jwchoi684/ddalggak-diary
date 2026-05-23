// @vitest-environment happy-dom
import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import {
  mockRouter,
  mockUseRouter,
  mockUseParams,
  mockUsePathname,
  resetNavigationMocks,
} from '@/lib/navigation/__tests__/setupNextNavigation';
import type { SearchConversation, ChatMessage } from '@/lib/storage/types';

// Force the list view in tests so the auto-redirect to the latest conversation
// doesn't fire — these tests are about the list UI itself.
vi.mock('next/navigation', () => ({
  useRouter: () => mockUseRouter(),
  useSearchParams: () => new URLSearchParams('list=1'),
  useParams: () => mockUseParams(),
  usePathname: () => mockUsePathname(),
}));

vi.mock('@/lib/storage/useConversations', () => ({
  useConversations: vi.fn(() => ({ conversations: [], isReady: true })),
}));

vi.mock('@/lib/storage/useSettings', () => ({
  useSettings: vi.fn(() => ({ settings: {}, isReady: true, update: vi.fn() })),
}));

// Mock formatRelativeTime to avoid time-sensitive output in page tests
vi.mock('@/lib/utils/formatRelativeTime', () => ({
  formatRelativeTime: vi.fn(() => '방금'),
}));

const { useConversations } = await import('@/lib/storage/useConversations');
const useConversationsMock = useConversations as ReturnType<typeof vi.fn>;

const { default: ChatPage } = await import('@/app/chat/page');

// ─── Fixture helpers ──────────────────────────────────────────────────────────

let idCounter = 0;

function makeConv(
  lastMessageAt: string,
  overrides?: Partial<SearchConversation>,
): SearchConversation {
  idCounter += 1;
  return {
    id: `conv-${idCounter}`,
    personaId: 'friend',
    title: `대화 ${idCounter}`,
    messages: [],
    startedAt: new Date().toISOString(),
    lastMessageAt,
    isClosed: false,
    ...overrides,
  };
}

function makeUserMsg(content: string): ChatMessage {
  return {
    id: `msg-${Math.random()}`,
    role: 'user',
    content,
    timestamp: new Date().toISOString(),
  };
}

// ─── Setup / teardown ─────────────────────────────────────────────────────────

beforeEach(() => {
  resetNavigationMocks();
  idCounter = 0;
  useConversationsMock.mockReturnValue({ conversations: [], isReady: true });
});

afterEach(() => cleanup());

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('ChatPage — empty state', () => {
  it('CL1: shows empty state message and new chat button when no conversations', () => {
    useConversationsMock.mockReturnValue({ conversations: [], isReady: true });

    render(<ChatPage />);

    expect(screen.getByTestId('conversation-list-empty')).toBeTruthy();
    expect(
      screen.getByText('아직 대화가 없어요. 위의 새 대화 버튼을 눌러 시작해보세요'),
    ).toBeTruthy();
    expect(screen.getByTestId('new-chat-button')).toBeTruthy();
  });
});

describe('ChatPage — sorting', () => {
  it('CL2: sorts conversations by lastMessageAt DESC', () => {
    const older = makeConv('2026-05-20T10:00:00.000Z', {
      messages: [makeUserMsg('오래된 대화')],
    });
    const newer = makeConv('2026-05-22T10:00:00.000Z', {
      messages: [makeUserMsg('최신 대화')],
    });
    useConversationsMock.mockReturnValue({
      conversations: [older, newer],
      isReady: true,
    });

    render(<ChatPage />);

    const cards = screen
      .getAllByRole('button')
      .filter((b) => b.getAttribute('data-testid')?.startsWith('conversation-card-'));

    // The first card should be the newer one
    expect(cards[0].getAttribute('data-testid')).toBe(
      `conversation-card-${newer.id}`,
    );
    expect(cards[1].getAttribute('data-testid')).toBe(
      `conversation-card-${older.id}`,
    );
  });

  it('CL3: single conversation renders correctly', () => {
    const conv = makeConv('2026-05-22T10:00:00.000Z', {
      messages: [makeUserMsg('단일 대화')],
    });
    useConversationsMock.mockReturnValue({
      conversations: [conv],
      isReady: true,
    });

    render(<ChatPage />);

    expect(screen.getByTestId(`conversation-card-${conv.id}`)).toBeTruthy();
    expect(screen.queryByTestId('conversation-list-empty')).toBeNull();
  });

  it('CL4: multiple conversations render in correct DESC order', () => {
    const conv1 = makeConv('2026-05-22T10:00:00.000Z', {
      messages: [makeUserMsg('최신')],
    });
    const conv2 = makeConv('2026-05-21T10:00:00.000Z', {
      messages: [makeUserMsg('중간')],
    });
    const conv3 = makeConv('2026-05-20T10:00:00.000Z', {
      messages: [makeUserMsg('오래됨')],
    });
    useConversationsMock.mockReturnValue({
      conversations: [conv3, conv1, conv2], // unsorted input
      isReady: true,
    });

    render(<ChatPage />);

    const cards = screen
      .getAllByRole('button')
      .filter((b) => b.getAttribute('data-testid')?.startsWith('conversation-card-'));

    expect(cards[0].getAttribute('data-testid')).toBe(`conversation-card-${conv1.id}`);
    expect(cards[1].getAttribute('data-testid')).toBe(`conversation-card-${conv2.id}`);
    expect(cards[2].getAttribute('data-testid')).toBe(`conversation-card-${conv3.id}`);
  });
});

describe('ChatPage — navigation', () => {
  it('CL5: new chat button routes to /chat/new when no lastPersonaId', () => {
    render(<ChatPage />);

    fireEvent.click(screen.getByTestId('new-chat-button'));

    expect(mockRouter.push).toHaveBeenCalledWith('/chat/new');
  });

  it('CL6: card click resumes the chat session for that conversation', () => {
    const conv = makeConv('2026-05-22T10:00:00.000Z', {
      id: 'test-conv-id',
      personaId: 'friend',
      messages: [makeUserMsg('클릭 테스트')],
    });
    useConversationsMock.mockReturnValue({
      conversations: [conv],
      isReady: true,
    });

    render(<ChatPage />);

    fireEvent.click(screen.getByTestId('conversation-card-test-conv-id'));

    expect(mockRouter.push).toHaveBeenCalledWith(
      '/chat/session?personaId=friend&conversationId=test-conv-id',
    );
  });
});

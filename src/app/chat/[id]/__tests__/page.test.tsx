// @vitest-environment happy-dom
import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, cleanup, act } from '@testing-library/react';
import type { SearchConversation, ChatMessage } from '@/lib/storage/types';
import {
  mockRouter,
  mockUseRouter,
  mockUseParams,
  mockUsePathname,
  resetNavigationMocks,
} from '@/lib/navigation/__tests__/setupNextNavigation';

// ─── Navigation mock ─────────────────────────────────────────────────────────
let mockParamsValue: Record<string, string> = { id: 'conv-readonly-1' };

vi.mock('next/navigation', () => ({
  useRouter: () => mockUseRouter(),
  useParams: () => mockParamsValue,
  usePathname: () => mockUsePathname(),
  useSearchParams: () => new URLSearchParams(),
  notFound: vi.fn(() => { throw new Error('NEXT_NOT_FOUND'); }),
}));

// ─── Storage mocks ───────────────────────────────────────────────────────────
vi.mock('@/lib/storage/useConversations', () => ({
  useConversations: vi.fn(() => ({ conversations: [], isReady: true })),
}));

vi.mock('@/lib/storage/useDiaries', () => ({
  useDiaries: vi.fn(() => ({ entries: [], isReady: true })),
}));

vi.mock('@/lib/storage', async (importOriginal) => {
  const original = await importOriginal<typeof import('@/lib/storage')>();
  return {
    ...original,
    removeConversation: vi.fn(),
  };
});

// ─── Import after mocks ───────────────────────────────────────────────────────
const { useConversations } = await import('@/lib/storage/useConversations');
const useConversationsMock = useConversations as ReturnType<typeof vi.fn>;

const { removeConversation } = await import('@/lib/storage');
const removeConversationMock = removeConversation as ReturnType<typeof vi.fn>;

const { default: ReadOnlyChatPage } = await import('../page');

// ─── Fixtures ─────────────────────────────────────────────────────────────────

function makeMessage(
  role: 'user' | 'assistant',
  content: string,
  citedDiaryIds?: string[],
): ChatMessage {
  return {
    id: `msg-${Math.random()}`,
    role,
    content,
    timestamp: new Date().toISOString(),
    ...(citedDiaryIds ? { citedDiaryIds } : {}),
  };
}

function makeConversation(overrides?: Partial<SearchConversation>): SearchConversation {
  return {
    id: 'conv-readonly-1',
    personaId: 'friend',
    title: '친구 대화',
    messages: [],
    startedAt: new Date().toISOString(),
    lastMessageAt: new Date().toISOString(),
    isClosed: true,
    ...overrides,
  };
}

// ─── Setup / teardown ─────────────────────────────────────────────────────────

beforeEach(() => {
  cleanup();
  resetNavigationMocks();
  vi.clearAllMocks();
  mockParamsValue = { id: 'conv-readonly-1' };
  useConversationsMock.mockReturnValue({ conversations: [], isReady: true });
});

afterEach(() => {
  cleanup();
});

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('ReadOnlyChatPage (REQ-018)', () => {
  it('RC1: renders messages from a seeded conversation', async () => {
    const conv = makeConversation({
      messages: [
        makeMessage('user', '안녕, 지난 대화야'),
        makeMessage('assistant', '그래, 기억나지!'),
      ],
    });
    useConversationsMock.mockReturnValue({ conversations: [conv], isReady: true });

    await act(async () => {
      render(<ReadOnlyChatPage />);
    });

    expect(screen.getByText('안녕, 지난 대화야')).toBeTruthy();
    expect(screen.getByText('그래, 기억나지!')).toBeTruthy();
  });

  it('RC2: NO textarea or input[type=text] in DOM', async () => {
    const conv = makeConversation({
      messages: [makeMessage('user', '메시지')],
    });
    useConversationsMock.mockReturnValue({ conversations: [conv], isReady: true });

    await act(async () => {
      render(<ReadOnlyChatPage />);
    });

    // Textarea must not exist
    expect(document.querySelector('textarea')).toBeNull();
    // input[type=text] must not exist
    expect(document.querySelector('input[type="text"]')).toBeNull();
  });

  it('RC3: header shows "{label} (종료됨)" for the persona', async () => {
    const conv = makeConversation({ personaId: 'friend' }); // friend → 친구
    useConversationsMock.mockReturnValue({ conversations: [conv], isReady: true });

    await act(async () => {
      render(<ReadOnlyChatPage />);
    });

    // Friend persona label is "친구"
    expect(screen.getByText('친구 (종료됨)')).toBeTruthy();
  });

  it('RC4: delete button + confirm → removeConversation called → router.push to /chat', async () => {
    const conv = makeConversation({
      messages: [makeMessage('user', '삭제될 대화')],
    });
    useConversationsMock.mockReturnValue({ conversations: [conv], isReady: true });

    await act(async () => {
      render(<ReadOnlyChatPage />);
    });

    // Click trash button
    fireEvent.click(screen.getByRole('button', { name: '대화 삭제' }));

    // Confirm dialog appears - click confirm (삭제 button)
    const confirmBtn = screen.getByRole('button', { name: '삭제' });
    await act(async () => {
      fireEvent.click(confirmBtn);
    });

    expect(removeConversationMock).toHaveBeenCalledWith('conv-readonly-1');
    expect(mockRouter.push).toHaveBeenCalledWith('/chat');
  });

  it('RC5: unknown id → notFound() is called', async () => {
    // No conversation in store — id doesn't match anything
    useConversationsMock.mockReturnValue({ conversations: [], isReady: true });
    mockParamsValue = { id: 'nonexistent-id' };

    const nextNav = await import('next/navigation');
    const notFoundMock = nextNav.notFound as unknown as ReturnType<typeof vi.fn>;

    // notFound() throws 'NEXT_NOT_FOUND' during synchronous render
    expect(() => render(<ReadOnlyChatPage />)).toThrow('NEXT_NOT_FOUND');
    expect(notFoundMock).toHaveBeenCalled();
  });
});

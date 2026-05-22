// @vitest-environment happy-dom
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { makeConversation } from './fixtures';

// Mock conversations module before importing the hook
vi.mock('@/lib/storage/conversations', () => ({
  readConversations: vi.fn(() => []),
}));

const { readConversations } = await import('@/lib/storage/conversations');
const readConversationsMock = readConversations as ReturnType<typeof vi.fn>;

const { useConversations } = await import('@/lib/storage/useConversations');

describe('useConversations — initial state', () => {
  beforeEach(() => {
    readConversationsMock.mockReturnValue([]);
  });

  it('UC1: isReady becomes true and conversations=[] after effect flushes (empty store)', async () => {
    const { result } = renderHook(() => useConversations());
    await act(async () => {});
    expect(result.current.isReady).toBe(true);
    expect(result.current.conversations).toEqual([]);
  });
});

describe('useConversations — after mount effect', () => {
  beforeEach(() => {
    readConversationsMock.mockReturnValue([]);
  });

  it('UC2: populates conversations from mocked readConversations after mount', async () => {
    const conv1 = makeConversation({ id: 'c-1', personaId: 'friend' });
    const conv2 = makeConversation({ id: 'c-2', personaId: 'therapist' });
    readConversationsMock.mockReturnValue([conv1, conv2]);

    const { result } = renderHook(() => useConversations());
    await act(async () => {});

    expect(result.current.isReady).toBe(true);
    expect(result.current.conversations).toHaveLength(2);
    expect(result.current.conversations[0].id).toBe('c-1');
    expect(result.current.conversations[1].id).toBe('c-2');
  });
});

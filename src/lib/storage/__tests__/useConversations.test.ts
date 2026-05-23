// @vitest-environment happy-dom
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { makeConversation } from './fixtures';

// useConversations now reads from Supabase. Mock the remote module + the legacy
// local one used only by the migration branch.
vi.mock('@/lib/storage/conversations-remote', () => ({
  listConversationsRemote: vi.fn(async () => []),
  upsertConversationRemote: vi.fn(async () => undefined),
  removeConversationRemote: vi.fn(async () => undefined),
}));
vi.mock('@/lib/storage/conversations', () => ({
  readConversations: vi.fn(() => []),
  writeAllConversations: vi.fn(),
}));

const { listConversationsRemote } = await import('@/lib/storage/conversations-remote');
const listMock = listConversationsRemote as ReturnType<typeof vi.fn>;

const { useConversations } = await import('@/lib/storage/useConversations');

beforeEach(() => {
  listMock.mockReset();
  listMock.mockResolvedValue([]);
  if (typeof window !== 'undefined') {
    window.localStorage.setItem(
      'ddalkkak:conversations:migrated-to-supabase:v1',
      '1',
    );
  }
});

describe('useConversations (Supabase-backed)', () => {
  it('UC1: isReady becomes true and conversations=[] for empty remote', async () => {
    const { result } = renderHook(() => useConversations());
    await act(async () => {});
    expect(result.current.isReady).toBe(true);
    expect(result.current.conversations).toEqual([]);
  });

  it('UC2: populates conversations from listConversationsRemote', async () => {
    const conv1 = makeConversation({ id: 'c-1', personaId: 'friend' });
    const conv2 = makeConversation({ id: 'c-2', personaId: 'therapist' });
    listMock.mockResolvedValue([conv1, conv2]);

    const { result } = renderHook(() => useConversations());
    await act(async () => {});

    expect(result.current.isReady).toBe(true);
    expect(result.current.conversations).toHaveLength(2);
    expect(result.current.conversations[0].id).toBe('c-1');
    expect(result.current.conversations[1].id).toBe('c-2');
  });
});

import { describe, it, expect } from 'vitest';
import {
  readConversations,
  upsertConversation,
  removeConversation,
} from '@/lib/storage';
import { makeConversation } from './fixtures';

const CONVERSATIONS_KEY = 'ddalkkak:conversations:v1';

describe('readConversations — resilience', () => {
  it('returns [] when the key is absent', () => {
    expect(readConversations()).toEqual([]);
  });

  it('returns [] when stored value is corrupt JSON', () => {
    localStorage.setItem(CONVERSATIONS_KEY, '{bad');
    const result = readConversations();
    expect(result).toEqual([]);
    // Key must be left intact
    expect(localStorage.getItem(CONVERSATIONS_KEY)).toBe('{bad');
  });

  it('returns [] when stored value is non-array JSON', () => {
    localStorage.setItem(CONVERSATIONS_KEY, '"hello"');
    expect(readConversations()).toEqual([]);
  });
});

describe('upsertConversation — id dedup only', () => {
  it('appends a conversation when storage is empty', () => {
    const s1 = makeConversation();
    upsertConversation(s1);
    expect(readConversations()).toHaveLength(1);
  });

  it('replaces a conversation with the same id', () => {
    const s1 = makeConversation();
    upsertConversation(s1);
    const s1Updated = { ...s1, title: '업데이트된 제목' };
    upsertConversation(s1Updated);
    const result = readConversations();
    expect(result).toHaveLength(1);
    expect(result[0]?.title).toBe('업데이트된 제목');
  });

  it('allows two conversations with the same startedAt date (regression guard)', () => {
    const sharedTime = '2026-05-17T10:00:00Z';
    const s1 = makeConversation({ startedAt: sharedTime });
    const s2 = makeConversation({ startedAt: sharedTime });
    upsertConversation(s1);
    upsertConversation(s2);
    const result = readConversations();
    expect(result).toHaveLength(2);
  });

  it('does not treat startedAt as a uniqueness key', () => {
    const sharedTime = '2026-05-17T10:00:00Z';
    const s1 = makeConversation({ startedAt: sharedTime });
    const s2 = makeConversation({ startedAt: sharedTime });
    upsertConversation(s1);
    upsertConversation(s2);
    const result = readConversations();
    const ids = result.map((s) => s.id);
    expect(ids).toContain(s1.id);
    expect(ids).toContain(s2.id);
  });
});

describe('removeConversation', () => {
  it('removes a conversation that exists', () => {
    const s1 = makeConversation();
    upsertConversation(s1);
    removeConversation(s1.id);
    expect(readConversations()).toEqual([]);
  });

  it('is a no-op when the id does not exist', () => {
    const s1 = makeConversation();
    upsertConversation(s1);
    removeConversation('missing');
    expect(readConversations()).toHaveLength(1);
  });
});

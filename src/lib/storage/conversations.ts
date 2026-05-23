import { CONVERSATIONS_KEY } from './keys';
import { safeGet, safeSet } from './ssr';
import type { SearchConversation } from './types';

/**
 * Reads all chat sessions from localStorage.
 *
 * @returns Parsed array of SearchConversation. Returns `[]` when the key is
 *          absent, when JSON is corrupt, or when parsed value is not an array.
 *          Returns `[]` during SSR.
 * @throws  Never.
 */
export function readConversations(): SearchConversation[] {
  const raw = safeGet(CONVERSATIONS_KEY);
  if (raw === null) return [];
  try {
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed as SearchConversation[];
  } catch {
    return [];
  }
}

/**
 * Replaces the entire conversations collection in localStorage.
 *
 * @param sessions - Complete replacement array.
 * @returns void
 * @throws  `DOMException` (`QuotaExceededError`). Not caught.
 *          No-op during SSR.
 */
export function writeAllConversations(sessions: SearchConversation[]): void {
  safeSet(CONVERSATIONS_KEY, JSON.stringify(sessions));
  if (typeof window !== 'undefined' && typeof StorageEvent === 'function') {
    try {
      window.dispatchEvent(new StorageEvent('storage', { key: CONVERSATIONS_KEY }));
    } catch {
      // best-effort
    }
  }
}

/**
 * Inserts or replaces a single chat session, deduplicating by `id` only.
 * There is no date-based dedup for conversations (unlike diaries).
 *
 * Dedup logic: if an existing session shares `session.id` → replace it.
 * Otherwise → append.
 *
 * @param session - The SearchConversation to insert or update.
 * @returns void
 * @throws  `DOMException` (`QuotaExceededError`). Not caught.
 *          No-op during SSR.
 */
export function upsertConversation(session: SearchConversation): void {
  const current = readConversations();
  const index = current.findIndex((s) => s.id === session.id);
  if (index !== -1) {
    current[index] = session;
    writeAllConversations(current);
  } else {
    writeAllConversations([...current, session]);
  }
}

/**
 * Removes the conversation with the given id. No-op if not found.
 *
 * @param id - The `SearchConversation.id` to remove.
 * @returns void
 * @throws  `DOMException` (`QuotaExceededError`). Not caught.
 *          No-op during SSR.
 */
export function removeConversation(id: string): void {
  const current = readConversations();
  const filtered = current.filter((s) => s.id !== id);
  if (filtered.length !== current.length) {
    writeAllConversations(filtered);
  }
}

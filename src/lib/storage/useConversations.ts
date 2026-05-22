// React hook — client-only. Direct import only;
// NOT re-exported from @/lib/storage/index.ts (that barrel is SSR-safe).
"use client";

import { useEffect, useState } from 'react';
import { readConversations } from '@/lib/storage/conversations';
import type { SearchConversation } from '@/lib/storage/types';

/**
 * Reads all conversations from localStorage once on mount.
 *
 * Returns `isReady: false` on initial SSR/hydration render so callers can
 * suppress hydration-mismatch content. Transitions to `isReady: true`
 * synchronously after first effect.
 *
 * Never throws. If localStorage unavailable, `readConversations()` returns []
 * and `isReady` still becomes true.
 *
 * Always import via: import { useConversations } from '@/lib/storage/useConversations'
 */
export function useConversations(): { conversations: SearchConversation[]; isReady: boolean } {
  const [conversations, setConversations] = useState<SearchConversation[]>([]);
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    setConversations(readConversations());
    setIsReady(true);
  }, []);

  return { conversations, isReady };
}

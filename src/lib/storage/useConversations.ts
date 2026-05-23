// React hook — client-only. Direct import only;
// NOT re-exported from @/lib/storage/index.ts (that barrel is SSR-safe).
"use client";

import { useEffect, useState } from 'react';
import { readConversations } from '@/lib/storage/conversations';
import type { SearchConversation } from '@/lib/storage/types';

export function useConversations(): { conversations: SearchConversation[]; isReady: boolean } {
  const [conversations, setConversations] = useState<SearchConversation[]>([]);
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    setConversations(readConversations());
    setIsReady(true);

    // Re-read on cross-tab edits and on same-tab synthetic events dispatched
    // by writeAllConversations (so deleting a chat from the list updates the
    // UI immediately without a reload).
    function handleStorage(e: StorageEvent) {
      if (e.key === null || e.key.includes('conversations')) {
        setConversations(readConversations());
      }
    }
    window.addEventListener('storage', handleStorage);
    return () => window.removeEventListener('storage', handleStorage);
  }, []);

  return { conversations, isReady };
}

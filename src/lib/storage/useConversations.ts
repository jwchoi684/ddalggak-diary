"use client";

import { useEffect, useState, useCallback } from 'react';
import {
  readConversations as readLocalConversations,
  writeAllConversations as writeAllLocalConversations,
} from '@/lib/storage/conversations';
import {
  listConversationsRemote,
  upsertConversationRemote,
} from '@/lib/storage/conversations-remote';
import type { SearchConversation } from '@/lib/storage/types';

const MIGRATED_KEY = 'ddalkkak:conversations:migrated-to-supabase:v1';
const CONVERSATIONS_CHANGED_EVENT = 'ddalkkak:conversations-changed';

let cache: SearchConversation[] = [];
let cacheReady = false;
let inflight: Promise<SearchConversation[]> | null = null;

function _resetCache() { cache = []; cacheReady = false; inflight = null; }

async function fetchAndCache(): Promise<SearchConversation[]> {
  if (inflight) return inflight;
  inflight = listConversationsRemote()
    .then((fresh) => { cache = fresh; cacheReady = true; return fresh; })
    .finally(() => { inflight = null; });
  return inflight;
}

export function useConversations(): {
  conversations: SearchConversation[];
  isReady: boolean;
} {
  const [conversations, setConversations] = useState<SearchConversation[]>(cache);
  const [isReady, setIsReady] = useState(cacheReady);

  const refresh = useCallback(async () => {
    try {
      const fresh = await fetchAndCache();
      setConversations(fresh);
    } finally {
      setIsReady(true);
    }
  }, []);

  useEffect(() => {
    let cancelled = false;

    async function init() {
      try {
        if (
          typeof window !== 'undefined' &&
          window.localStorage.getItem(MIGRATED_KEY) !== '1'
        ) {
          const local = readLocalConversations();
          if (local.length > 0) {
            for (const conv of local) {
              try { await upsertConversationRemote(conv); }
              catch (err) { console.warn('[useConversations] migrate one failed', err); }
            }
          }
          window.localStorage.setItem(MIGRATED_KEY, '1');
          writeAllLocalConversations([]);
          _resetCache();
        }
      } catch (err) {
        console.warn('[useConversations] migration check failed', err);
      }
      if (cancelled) return;
      await refresh();
    }

    init();

    function handleRefresh() { void refresh(); }
    window.addEventListener(CONVERSATIONS_CHANGED_EVENT, handleRefresh);
    return () => {
      cancelled = true;
      window.removeEventListener(CONVERSATIONS_CHANGED_EVENT, handleRefresh);
    };
  }, [refresh]);

  return { conversations, isReady };
}

export function emitConversationsChanged(): void {
  if (typeof window === 'undefined') return;
  _resetCache();
  try { window.dispatchEvent(new CustomEvent(CONVERSATIONS_CHANGED_EVENT)); }
  catch { /* best-effort */ }
}

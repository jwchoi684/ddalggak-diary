"use client";

import React, { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useSettings } from '@/lib/storage/useSettings';
import { PERSONA_MAP } from '@/design-system/personas';

/**
 * Entry point for the chat tab. Always launches a session directly:
 *   - lastPersonaId set → /chat/session?personaId=<last>
 *   - first time → /chat/new (persona picker)
 *
 * Past conversations live at /chat/list, reachable from the active chat header.
 */
export default function ChatPage() {
  const router = useRouter();
  const { settings, isReady } = useSettings();

  useEffect(() => {
    if (!isReady) return;
    const last = settings.lastPersonaId;
    if (last && PERSONA_MAP[last]) {
      router.replace(`/chat/session?personaId=${last}`);
    } else {
      router.replace('/chat/new');
    }
  }, [isReady, settings.lastPersonaId, router]);

  return <div className="min-h-[100dvh] bg-cream" data-testid="chat-page" />;
}

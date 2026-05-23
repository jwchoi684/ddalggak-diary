"use client";

import React, { Suspense, useEffect, useMemo } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useConversations } from '@/lib/storage/useConversations';
import { useSettings } from '@/lib/storage/useSettings';
import { PERSONA_MAP } from '@/design-system/personas';
import { ChatListHeader } from './_components/ChatListHeader';
import { NewChatButton } from './_components/NewChatButton';
import { ConversationCard } from './_components/ConversationCard';
import { BottomNav } from '@/design-system/BottomNav';

/**
 * Chat tab landing page.
 *
 * Default: jump straight to the most recent conversation. The list itself is
 * still browsable at /chat?list=1 (reached from the active chat header). The
 * "새 대화 +" button is the only entry point that creates a brand-new session.
 */
function ChatPageInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const showList = searchParams.get('list') === '1';
  const { conversations, isReady } = useConversations();
  const { settings } = useSettings();

  const sorted = useMemo(
    () => [...conversations].sort((a, b) => b.lastMessageAt.localeCompare(a.lastMessageAt)),
    [conversations],
  );
  const latest = sorted[0];

  // Auto-jump into the most recent conversation unless the user asked to see the list.
  useEffect(() => {
    if (!isReady) return;
    if (showList) return;
    if (latest) {
      router.replace(
        `/chat/session?personaId=${latest.personaId}&conversationId=${latest.id}`,
      );
    }
  }, [isReady, showList, latest, router]);

  function handleNewChat() {
    const last = settings.lastPersonaId;
    if (last && PERSONA_MAP[last]) {
      router.push(`/chat/session?personaId=${last}`);
    } else {
      router.push('/chat/new');
    }
  }

  // While the redirect is in flight, render nothing rather than flash the list.
  const willRedirect = isReady && !showList && latest;
  if (willRedirect) {
    return <div className="min-h-[100dvh] bg-cream" data-testid="chat-page" />;
  }

  return (
    <div className="min-h-[100dvh] bg-cream flex flex-col" data-testid="chat-page">
      <ChatListHeader onBack={() => router.back()} />

      <main className="flex-1 px-4 pt-4 pb-8">
        <div className="mb-3">
          <NewChatButton onClick={handleNewChat} />
        </div>

        {!isReady && (
          <p className="text-center text-meta py-8">불러오는 중…</p>
        )}

        {isReady && sorted.length === 0 && (
          <p
            data-testid="conversation-list-empty"
            className="text-center text-meta py-8"
          >
            아직 대화가 없어요. 위의 새 대화 버튼을 눌러 시작해보세요
          </p>
        )}

        {isReady && sorted.length > 0 && (
          <div className="space-y-3">
            {sorted.map((conv) => (
              <ConversationCard
                key={conv.id}
                conversation={conv}
                onTap={() =>
                  router.push(
                    `/chat/session?personaId=${conv.personaId}&conversationId=${conv.id}`,
                  )
                }
              />
            ))}
          </div>
        )}
      </main>
      <BottomNav />
    </div>
  );
}

export default function ChatPage() {
  return (
    <Suspense fallback={<div className="min-h-[100dvh] bg-cream" />}>
      <ChatPageInner />
    </Suspense>
  );
}

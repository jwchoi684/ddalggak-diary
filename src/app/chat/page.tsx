"use client";

import React from 'react';
import { useRouter } from 'next/navigation';
import { useConversations } from '@/lib/storage/useConversations';
import { useSettings } from '@/lib/storage/useSettings';
import { PERSONA_MAP } from '@/design-system/personas';
import { ChatListHeader } from './_components/ChatListHeader';
import { NewChatButton } from './_components/NewChatButton';
import { ConversationCard } from './_components/ConversationCard';
import { BottomNav } from '@/design-system/BottomNav';

/**
 * Chat tab landing page. Shows past conversations + a "새 대화 +" button. The
 * button is the only entry point that starts a fresh session — entering the
 * tab itself never creates one.
 *
 * "새 대화 +" sends you straight to a session with lastPersonaId when set, or
 * to the persona picker on first use.
 */
export default function ChatPage() {
  const router = useRouter();
  const { conversations, isReady } = useConversations();
  const { settings } = useSettings();

  const sorted = [...conversations].sort((a, b) =>
    b.lastMessageAt.localeCompare(a.lastMessageAt),
  );

  function handleNewChat() {
    const last = settings.lastPersonaId;
    if (last && PERSONA_MAP[last]) {
      router.push(`/chat/session?personaId=${last}`);
    } else {
      router.push('/chat/new');
    }
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
                onTap={() => router.push('/chat/' + conv.id)}
              />
            ))}
          </div>
        )}
      </main>
      <BottomNav />
    </div>
  );
}

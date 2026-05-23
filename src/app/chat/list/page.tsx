"use client";

import React from 'react';
import { useRouter } from 'next/navigation';
import { useConversations } from '@/lib/storage/useConversations';
import { ChatListHeader } from '../_components/ChatListHeader';
import { NewChatButton } from '../_components/NewChatButton';
import { ConversationCard } from '../_components/ConversationCard';
import { BottomNav } from '@/design-system/BottomNav';

/**
 * Past conversations browser. Reached from the active chat header's 리스트 button.
 * /chat itself is now a redirect to either a new session (when lastPersonaId is
 * set) or the persona picker.
 */
export default function ChatListPage() {
  const router = useRouter();
  const { conversations, isReady } = useConversations();

  const sorted = [...conversations].sort((a, b) =>
    b.lastMessageAt.localeCompare(a.lastMessageAt),
  );

  return (
    <div className="min-h-[100dvh] bg-cream flex flex-col" data-testid="chat-list-page">
      <ChatListHeader onBack={() => router.back()} />

      <main className="flex-1 px-4 pt-4 pb-8">
        <div className="mb-3">
          <NewChatButton onClick={() => router.push('/chat')} />
        </div>

        {!isReady && (
          <p className="text-center text-meta py-8">불러오는 중…</p>
        )}

        {isReady && sorted.length === 0 && (
          <p
            data-testid="conversation-list-empty"
            className="text-center text-meta py-8"
          >
            아직 대화가 없어요. AI에게 일기에 대해 물어보세요
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

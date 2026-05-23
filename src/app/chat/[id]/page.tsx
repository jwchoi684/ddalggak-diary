"use client";

import React, { useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { notFound } from 'next/navigation';
import { EmptyState } from '@/design-system/EmptyState';
import { ConfirmDialog } from '@/design-system/ConfirmDialog';
import { PERSONA_MAP } from '@/design-system/personas';
import { removeConversationRemote } from '@/lib/storage/conversations-remote';
import { emitConversationsChanged } from '@/lib/storage/useConversations';
import { useConversations } from '@/lib/storage/useConversations';
import { useDiaries } from '@/lib/storage/useDiaries';
import { Routes } from '@/lib/navigation';
import { ReadOnlyChatHeader } from './_components/ReadOnlyChatHeader';
import { MessageBubble } from '../session/_components/MessageBubble';

export default function ReadOnlyChatPage() {
  const router = useRouter();
  const params = useParams<{ id: string }>();
  const conversationId = params?.id ?? '';

  const { conversations, isReady } = useConversations();
  const { entries: diaryEntries } = useDiaries();

  const [deleteOpen, setDeleteOpen] = useState(false);

  const conversation = conversations.find((c) => c.id === conversationId);
  const persona = conversation ? PERSONA_MAP[conversation.personaId] : undefined;

  if (isReady && !conversation) {
    notFound();
  }

  if (!isReady) {
    return (
      <div className="min-h-screen bg-cream flex items-center justify-center px-4">
        <p className="text-meta text-sm">불러오는 중…</p>
      </div>
    );
  }

  if (!persona) {
    return (
      <div className="min-h-screen bg-cream flex items-center justify-center px-4">
        <EmptyState
          title="대화를 찾을 수 없습니다."
          action={
            <button
              type="button"
              onClick={() => router.push(Routes.chat)}
              className="px-4 py-2 rounded-xl bg-peach text-charcoal text-sm font-medium"
            >
              대화 목록으로
            </button>
          }
        />
      </div>
    );
  }

  function handleDelete() {
    setDeleteOpen(false);
    void (async () => {
      try {
        await removeConversationRemote(conversationId);
        emitConversationsChanged();
      } catch (err) {
        console.warn('[chat/[id]] remove failed', err);
      }
    })();
    router.push(Routes.chat);
  }

  return (
    <div className="min-h-screen bg-cream flex flex-col" data-testid="readonly-chat-page">
      <ReadOnlyChatHeader
        persona={persona}
        onBack={() => router.push(Routes.chat)}
        onDelete={() => setDeleteOpen(true)}
      />

      <div className="flex-1 overflow-y-auto px-4 py-2 flex flex-col gap-3">
        {conversation!.messages.map((msg) => (
          <MessageBubble
            key={msg.id}
            message={msg}
            onCitedDiaryTap={(diaryId) => {
              const entry = diaryEntries.find((d) => d.id === diaryId);
              if (entry) router.push(Routes.diary(entry.date));
            }}
          />
        ))}
      </div>

      <div className="px-4 py-3 bg-paper border-t border-meta/10">
        <p className="text-sm text-meta text-center mb-2">
          종료된 대화입니다. 추가 질문은 새 대화에서 해주세요.
        </p>
        <button
          type="button"
          data-testid="new-chat-from-readonly"
          onClick={() => router.push('/chat/new')}
          className="w-full py-2.5 rounded-xl bg-peach text-charcoal text-sm font-medium"
        >
          새 대화 시작
        </button>
      </div>

      <ConfirmDialog
        open={deleteOpen}
        message="이 대화를 삭제하시겠어요? 복구할 수 없습니다."
        confirmLabel="삭제"
        cancelLabel="취소"
        destructive
        onConfirm={handleDelete}
        onCancel={() => setDeleteOpen(false)}
      />
    </div>
  );
}

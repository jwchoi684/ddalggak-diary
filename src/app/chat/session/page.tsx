"use client";

import React, { Suspense, useEffect, useRef, useCallback, useMemo, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { EmptyState } from '@/design-system/EmptyState';
import { PERSONA_MAP } from '@/design-system/personas';
import { useDiaries } from '@/lib/storage/useDiaries';
import { useSettings } from '@/lib/storage/useSettings';
import { useConversations } from '@/lib/storage/useConversations';
import type { ChatMessage, PersonaId } from '@/lib/storage';
import { Routes } from '@/lib/navigation';
import { useChatSession, persistSession } from './_hooks/useChatSession';
import { ChatHeader } from './_components/ChatHeader';
import { MessageBubble, LoadingBubble, ErrorBubble } from './_components/MessageBubble';
import { SuggestedPromptChips } from './_components/SuggestedPromptChips';
import { ChatComposer } from './_components/ChatComposer';
import { PersonaChangeSheet } from './_components/PersonaChangeSheet';

/**
 * Wrapper. When the URL has ?conversationId=..., we wait for the conversation
 * list to hydrate from localStorage before mounting the chat hook — useReducer's
 * init runs once at mount, so the prior messages must be in hand before that.
 */
function ActiveChatPageInner() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const initialPersonaId = searchParams.get('personaId') as PersonaId | null;
  const resumeId = searchParams.get('conversationId') ?? undefined;

  const { conversations, isReady: convReady } = useConversations();

  if (!initialPersonaId || !PERSONA_MAP[initialPersonaId]) {
    return (
      <div className="min-h-screen bg-cream flex items-center justify-center px-4">
        <EmptyState
          title="페르소나를 찾을 수 없습니다."
          action={
            <button type="button" onClick={() => router.push(Routes.chat)}
              className="px-4 py-2 rounded-xl bg-peach text-charcoal text-sm font-medium">
              채팅으로 가기
            </button>
          }
        />
      </div>
    );
  }

  if (resumeId && !convReady) {
    return <div className="min-h-screen bg-cream" data-testid="active-chat-page" />;
  }

  const resumed = resumeId ? conversations.find((c) => c.id === resumeId) : undefined;
  // If the URL pointed at a conversation that doesn't exist any more, fall back
  // to a fresh session rather than 404.
  const effectivePersonaId = (resumed?.personaId ?? initialPersonaId) as PersonaId;

  return (
    <ChatSessionContent
      initialPersonaId={effectivePersonaId}
      resumeConversationId={resumed ? resumeId : undefined}
      initialMessages={resumed?.messages}
    />
  );
}

interface ChatSessionContentProps {
  initialPersonaId: PersonaId;
  resumeConversationId?: string;
  initialMessages?: ChatMessage[];
}

function ChatSessionContent({
  initialPersonaId,
  resumeConversationId,
  initialMessages,
}: ChatSessionContentProps) {
  const router = useRouter();
  // Persona is held in state so the user can swap it mid-session from the header.
  const [currentPersonaId, setCurrentPersonaId] = useState<PersonaId>(initialPersonaId);
  const persona = PERSONA_MAP[currentPersonaId];

  const [personaSheetOpen, setPersonaSheetOpen] = useState(false);

  const { entries: diaryEntries, isReady } = useDiaries();
  const { settings, update: updateSettings } = useSettings();
  const userName = typeof settings.userName === 'string' ? settings.userName : undefined;
  const gender =
    settings.gender === 'male' || settings.gender === 'female' || settings.gender === 'neutral'
      ? settings.gender
      : undefined;

  const startedAtRef = useRef<string>(new Date().toISOString());
  const scrollBottomRef = useRef<HTMLDivElement>(null);

  const { state, conversationId, dispatch, sendMessage, handleRetry } = useChatSession({
    persona,
    diaryEntries,
    userName,
    gender,
    initialConversationId: resumeConversationId,
    initialMessages,
    onSessionEnd: () => {},
  });

  const diaryDateById = useMemo(() => {
    const m = new Map<string, string>();
    for (const e of diaryEntries) m.set(e.id, e.date);
    return m;
  }, [diaryEntries]);

  useEffect(() => {
    scrollBottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [state.messages, state.isLoading]);

  // Auto-persist on every message change so navigating away (back gesture,
  // bottom-nav tap) doesn't drop the conversation. The "완료" button is gone.
  useEffect(() => {
    if (state.messages.length === 0) return;
    persistSession(conversationId, persona, state.messages, startedAtRef.current);
  }, [state.messages, conversationId, persona]);

  const openList = useCallback(() => {
    // Persist before leaving so the list view shows the latest exchanges.
    persistSession(conversationId, persona, state.messages, startedAtRef.current);
    router.push('/chat?list=1');
  }, [conversationId, persona, state.messages, router]);

  if (isReady && diaryEntries.length === 0) {
    return (
      <div className="min-h-screen bg-cream flex flex-col" data-testid="active-chat-page">
        <ChatHeader persona={persona} onListTap={openList}
          onPersonaTap={() => setPersonaSheetOpen(true)} />
        <div className="flex-1 flex items-center justify-center px-4">
          <EmptyState
            title="아직 일기가 없어요. 먼저 일기를 써보세요."
            action={
              <button type="button" onClick={() => router.push(Routes.calendar)}
                className="px-4 py-2 rounded-xl bg-peach text-charcoal text-sm font-medium"
                data-testid="go-to-calendar-btn">
                캘린더로 가기
              </button>
            }
          />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-cream flex flex-col" data-testid="active-chat-page">
      <ChatHeader persona={persona} onListTap={openList}
        onPersonaTap={() => setPersonaSheetOpen(true)} />
      <div className="flex-1 overflow-y-auto px-4 py-2 flex flex-col gap-3">
        {state.messages.map((msg) => (
          <MessageBubble key={msg.id} message={msg}
            diaryDateById={diaryDateById}
            onCitedDiaryTap={(id) => {
              const e = diaryEntries.find((d) => d.id === id);
              if (e) router.push(Routes.diary(e.date));
            }}
          />
        ))}
        {state.isLoading && !state.isStreaming && <LoadingBubble />}
        {state.hasError && <ErrorBubble onRetry={handleRetry} />}
        <div ref={scrollBottomRef} />
      </div>
      {state.messages.length === 0 && !state.isLoading && (
        <SuggestedPromptChips
          onSelect={(p) => dispatch({ type: 'SET_INPUT', payload: p })}
        />
      )}
      <ChatComposer value={state.input}
        onChange={(v) => dispatch({ type: 'SET_INPUT', payload: v })}
        onSend={() => sendMessage()} disabled={state.isLoading || state.isStreaming} />
      <PersonaChangeSheet
        open={personaSheetOpen}
        currentPersonaId={persona.id}
        onSelect={(id) => {
          setCurrentPersonaId(id);
          updateSettings({ lastPersonaId: id });
          setPersonaSheetOpen(false);
        }}
        onClose={() => setPersonaSheetOpen(false)}
      />
    </div>
  );
}

export default function ActiveChatPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-cream" />}>
      <ActiveChatPageInner />
    </Suspense>
  );
}

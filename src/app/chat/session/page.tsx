"use client";

import React, { useEffect, useRef, useCallback, useMemo, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { EmptyState } from '@/design-system/EmptyState';
import { PERSONA_MAP } from '@/design-system/personas';
import { useDiaries } from '@/lib/storage/useDiaries';
import type { PersonaId } from '@/lib/storage';
import { Routes } from '@/lib/navigation';
import { useChatSession, persistSession } from './_hooks/useChatSession';
import { ChatHeader } from './_components/ChatHeader';
import { MessageBubble, LoadingBubble, ErrorBubble } from './_components/MessageBubble';
import { SuggestedPromptChips } from './_components/SuggestedPromptChips';
import { ChatComposer } from './_components/ChatComposer';
import { PersonaChangeSheet } from './_components/PersonaChangeSheet';

export default function ActiveChatPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const initialPersonaId = searchParams.get('personaId') as PersonaId | null;

  // Persona is held in state so the user can swap it mid-session from the header.
  // Initial value comes from the ?personaId query param (set by /chat/new).
  const [currentPersonaId, setCurrentPersonaId] = useState<PersonaId | null>(initialPersonaId);
  const persona = currentPersonaId ? PERSONA_MAP[currentPersonaId] : undefined;

  const [personaSheetOpen, setPersonaSheetOpen] = useState(false);

  const { entries: diaryEntries, isReady } = useDiaries();

  const startedAtRef = useRef<string>(new Date().toISOString());
  const scrollBottomRef = useRef<HTMLDivElement>(null);

  const { state, conversationId, dispatch, sendMessage, handleRetry } = useChatSession({
    persona: persona!,
    diaryEntries,
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

  const endSession = useCallback(() => {
    if (persona) {
      persistSession(conversationId, persona, state.messages, startedAtRef.current);
    }
    router.push(Routes.chat);
  }, [conversationId, persona, state.messages, router]);

  if (!persona) {
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

  if (isReady && diaryEntries.length === 0) {
    return (
      <div className="min-h-screen bg-cream flex flex-col" data-testid="active-chat-page">
        <ChatHeader persona={persona} onBack={endSession} onDone={endSession}
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
      <ChatHeader persona={persona} onBack={endSession} onDone={endSession}
        onPersonaTap={() => setPersonaSheetOpen(true)} />
      <div className="flex-1 overflow-y-auto px-4 py-2 flex flex-col gap-3">
        {state.messages.length === 0 && (
          <div className="flex items-start">
            <div className="max-w-[80%] px-4 py-3 rounded-2xl rounded-bl-sm text-sm text-charcoal bg-paper leading-relaxed"
              style={{ boxShadow: 'var(--shadow-card)' }}>
              {persona.sampleGreeting}
            </div>
          </div>
        )}
        {state.messages.map((msg) => (
          <MessageBubble key={msg.id} message={msg}
            diaryDateById={diaryDateById}
            onCitedDiaryTap={(id) => {
              const e = diaryEntries.find((d) => d.id === id);
              if (e) router.push(Routes.diary(e.date));
            }}
          />
        ))}
        {state.isLoading && <LoadingBubble />}
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
        onSend={() => sendMessage()} disabled={state.isLoading} />
      <PersonaChangeSheet
        open={personaSheetOpen}
        currentPersonaId={persona.id}
        onSelect={(id) => {
          setCurrentPersonaId(id);
          setPersonaSheetOpen(false);
        }}
        onClose={() => setPersonaSheetOpen(false)}
      />
    </div>
  );
}

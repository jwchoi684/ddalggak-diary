"use client";

import { useReducer, useRef, useCallback } from 'react';
import { generateId, upsertConversation } from '@/lib/storage';
import type { ChatMessage, DiaryEntry, Persona } from '@/lib/storage';
import { serializeDiariesForLLM } from '@/lib/ai/serializeDiaries';
import { buildChatMessages } from '@/lib/ai/buildChatMessages';
import { callChat } from '@/lib/ai/callChat';
import { extractCitedDates, buildEntryDateMap } from '@/lib/ai/extractCitedDates';

// ─── State / Reducer ──────────────────────────────────────────────────────────

export interface ChatState {
  messages: ChatMessage[];
  input: string;
  isLoading: boolean;
  hasError: boolean;
  pendingUserMessage: ChatMessage | null;
}

type ChatAction =
  | { type: 'SET_INPUT'; payload: string }
  | { type: 'SEND_MESSAGE'; payload: ChatMessage }
  | { type: 'START_LOADING' }
  | { type: 'RECEIVE_RESPONSE'; payload: ChatMessage }
  | { type: 'SET_ERROR' }
  | { type: 'RETRY' };

function chatReducer(state: ChatState, action: ChatAction): ChatState {
  switch (action.type) {
    case 'SET_INPUT':
      return { ...state, input: action.payload };
    case 'SEND_MESSAGE':
      return {
        ...state,
        messages: [...state.messages, action.payload],
        input: '',
        hasError: false,
        pendingUserMessage: action.payload,
      };
    case 'START_LOADING':
      return { ...state, isLoading: true };
    case 'RECEIVE_RESPONSE':
      return {
        ...state,
        messages: [...state.messages, action.payload],
        isLoading: false,
        hasError: false,
        pendingUserMessage: null,
      };
    case 'SET_ERROR':
      return { ...state, isLoading: false, hasError: true };
    case 'RETRY':
      return { ...state, hasError: false };
    default:
      return state;
  }
}

const INITIAL_STATE: ChatState = {
  messages: [],
  input: '',
  isLoading: false,
  hasError: false,
  pendingUserMessage: null,
};

// ─── Hook ─────────────────────────────────────────────────────────────────────

interface UseChatSessionParams {
  persona: Persona;
  diaryEntries: DiaryEntry[];
  onSessionEnd: (messages: ChatMessage[], conversationId: string, startedAt: string) => void;
}

export interface UseChatSessionResult {
  state: ChatState;
  conversationId: string;
  dispatch: React.Dispatch<ChatAction>;
  sendMessage: (overrideText?: string) => Promise<void>;
  handleRetry: () => Promise<void>;
}

async function callLLM(
  persona: Persona,
  sessionMessages: ChatMessage[],
  diaryEntries: DiaryEntry[],
): Promise<ChatMessage> {
  const diariesText = serializeDiariesForLLM(diaryEntries);
  const entryDateMap = buildEntryDateMap(diaryEntries);

  // CONTEXT ISOLATION INVARIANT: only sessionMessages (this session only) are passed.
  const llmMessages = buildChatMessages({
    persona,
    diariesText,
    sessionMessages,
  });

  const result = await callChat({
    system: llmMessages[0]?.content ?? '',
    messages: llmMessages,
  });

  const citedIds = extractCitedDates(result.content, entryDateMap);

  return {
    id: generateId(),
    role: 'assistant',
    content: result.content,
    timestamp: new Date().toISOString(),
    ...(citedIds.length > 0 ? { citedDiaryIds: citedIds } : {}),
  };
}

export function useChatSession({
  persona,
  diaryEntries,
  onSessionEnd,
}: UseChatSessionParams): UseChatSessionResult {
  const [state, dispatch] = useReducer(chatReducer, INITIAL_STATE);
  const conversationIdRef = useRef<string>(generateId());
  const startedAtRef = useRef<string>(new Date().toISOString());

  const sendMessage = useCallback(
    async (overrideText?: string) => {
      const text = (overrideText ?? state.input).trim();
      if (!text) return;

      const userMessage: ChatMessage = {
        id: generateId(),
        role: 'user',
        content: text,
        timestamp: new Date().toISOString(),
      };

      dispatch({ type: 'SEND_MESSAGE', payload: userMessage });
      dispatch({ type: 'START_LOADING' });

      try {
        const assistantMessage = await callLLM(
          persona,
          [...state.messages, userMessage],
          diaryEntries,
        );
        dispatch({ type: 'RECEIVE_RESPONSE', payload: assistantMessage });
      } catch {
        dispatch({ type: 'SET_ERROR' });
      }
    },
    [persona, state.input, state.messages, diaryEntries],
  );

  const handleRetry = useCallback(async () => {
    if (!state.pendingUserMessage) return;
    dispatch({ type: 'RETRY' });
    dispatch({ type: 'START_LOADING' });

    try {
      const assistantMessage = await callLLM(persona, state.messages, diaryEntries);
      dispatch({ type: 'RECEIVE_RESPONSE', payload: assistantMessage });
    } catch {
      dispatch({ type: 'SET_ERROR' });
    }
  }, [state.pendingUserMessage, state.messages, persona, diaryEntries]);

  return {
    state,
    conversationId: conversationIdRef.current,
    dispatch,
    sendMessage,
    handleRetry,
  };
}

/**
 * Persists the session to localStorage as a closed conversation.
 * INVARIANT: Only called when messages.length > 0.
 */
export function persistSession(
  conversationId: string,
  persona: Persona,
  messages: ChatMessage[],
  startedAt: string,
): void {
  if (messages.length === 0) return;

  const firstUserMsg = messages.find((m) => m.role === 'user');
  const title = firstUserMsg ? firstUserMsg.content.slice(0, 30) : '새 대화';

  upsertConversation({
    id: conversationId,
    personaId: persona.id,
    title,
    messages,
    startedAt,
    lastMessageAt: messages[messages.length - 1]?.timestamp ?? startedAt,
    isClosed: true,
  });
}

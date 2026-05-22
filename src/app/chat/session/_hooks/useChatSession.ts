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
  /** True while a request is in flight AND no chunks have arrived yet. */
  isLoading: boolean;
  /** True while we are actively appending stream chunks to the last assistant message. */
  isStreaming: boolean;
  hasError: boolean;
  pendingUserMessage: ChatMessage | null;
}

type ChatAction =
  | { type: 'SET_INPUT'; payload: string }
  | { type: 'SEND_MESSAGE'; payload: ChatMessage }
  | { type: 'START_LOADING' }
  | { type: 'START_STREAMING'; payload: ChatMessage }
  | { type: 'APPEND_CHUNK'; chunk: string }
  | { type: 'END_STREAMING'; citedDiaryIds?: string[] }
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
      return { ...state, isLoading: true, isStreaming: false };
    case 'START_STREAMING':
      return {
        ...state,
        messages: [...state.messages, action.payload],
        isLoading: false,
        isStreaming: true,
      };
    case 'APPEND_CHUNK': {
      const len = state.messages.length;
      if (len === 0) return state;
      const last = state.messages[len - 1];
      if (last.role !== 'assistant') return state;
      const updated: ChatMessage = { ...last, content: last.content + action.chunk };
      return {
        ...state,
        messages: [...state.messages.slice(0, len - 1), updated],
      };
    }
    case 'END_STREAMING': {
      const len = state.messages.length;
      const cited = action.citedDiaryIds;
      if (len === 0 || !cited || cited.length === 0) {
        return {
          ...state,
          isLoading: false,
          isStreaming: false,
          pendingUserMessage: null,
        };
      }
      const last = state.messages[len - 1];
      if (last.role !== 'assistant') {
        return {
          ...state,
          isLoading: false,
          isStreaming: false,
          pendingUserMessage: null,
        };
      }
      const updated: ChatMessage = { ...last, citedDiaryIds: cited };
      return {
        ...state,
        messages: [...state.messages.slice(0, len - 1), updated],
        isLoading: false,
        isStreaming: false,
        pendingUserMessage: null,
      };
    }
    case 'SET_ERROR':
      return { ...state, isLoading: false, isStreaming: false, hasError: true };
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
  isStreaming: false,
  hasError: false,
  pendingUserMessage: null,
};

// ─── Hook ─────────────────────────────────────────────────────────────────────

interface UseChatSessionParams {
  persona: Persona;
  diaryEntries: DiaryEntry[];
  /** Optional user display name. When provided, injected into the system prompt so personas address the user by name. */
  userName?: string;
  onSessionEnd: (messages: ChatMessage[], conversationId: string, startedAt: string) => void;
}

export interface UseChatSessionResult {
  state: ChatState;
  conversationId: string;
  dispatch: React.Dispatch<ChatAction>;
  sendMessage: (overrideText?: string) => Promise<void>;
  handleRetry: () => Promise<void>;
}

function buildSystemPromptWithUser(persona: Persona, userName?: string): string {
  const trimmed = userName?.trim();
  if (!trimmed) return persona.systemPrompt;
  const directive =
    `\n\n[사용자 정보]\n사용자의 이름은 "${trimmed}"입니다. 이 이름으로 사용자를 부르세요. ` +
    `당신의 톤에 맞게 호칭(님/씨/야 등)을 자연스럽게 붙여도 좋습니다.`;
  return persona.systemPrompt + directive;
}

async function streamLLM(
  persona: Persona,
  sessionMessages: ChatMessage[],
  diaryEntries: DiaryEntry[],
  userName: string | undefined,
  dispatch: React.Dispatch<ChatAction>,
): Promise<void> {
  const diariesText = serializeDiariesForLLM(diaryEntries);
  const entryDateMap = buildEntryDateMap(diaryEntries);

  // Build messages, then override system prompt with the user-name-augmented version.
  // CONTEXT ISOLATION INVARIANT: only sessionMessages (this session only) are passed.
  const llmMessages = buildChatMessages({ persona, diariesText, sessionMessages });
  const userAwareSystem = `${buildSystemPromptWithUser(persona, userName)}\n\n[일기 목록]\n${diariesText}`;
  if (llmMessages.length > 0) {
    llmMessages[0] = { ...llmMessages[0], content: userAwareSystem };
  }

  const assistantId = generateId();
  let started = false;
  let full = '';

  const result = await callChat({
    system: userAwareSystem,
    messages: llmMessages,
    onChunk: (chunk) => {
      if (!started) {
        started = true;
        const placeholder: ChatMessage = {
          id: assistantId,
          role: 'assistant',
          content: chunk,
          timestamp: new Date().toISOString(),
        };
        dispatch({ type: 'START_STREAMING', payload: placeholder });
      } else {
        dispatch({ type: 'APPEND_CHUNK', chunk });
      }
      full += chunk;
    },
  });

  if (!started) {
    // Server returned an empty stream — append the full content (if any) as a single bubble.
    const placeholder: ChatMessage = {
      id: assistantId,
      role: 'assistant',
      content: result.content,
      timestamp: new Date().toISOString(),
    };
    dispatch({ type: 'START_STREAMING', payload: placeholder });
    full = result.content;
  }

  const citedIds = extractCitedDates(full, entryDateMap);
  dispatch({ type: 'END_STREAMING', citedDiaryIds: citedIds });
}

export function useChatSession({
  persona,
  diaryEntries,
  userName,
  onSessionEnd: _onSessionEnd,
}: UseChatSessionParams): UseChatSessionResult {
  void _onSessionEnd; // reserved for future end-of-session hooks
  const [state, dispatch] = useReducer(chatReducer, INITIAL_STATE);
  const conversationIdRef = useRef<string>(generateId());

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
        await streamLLM(
          persona,
          [...state.messages, userMessage],
          diaryEntries,
          userName,
          dispatch,
        );
      } catch {
        dispatch({ type: 'SET_ERROR' });
      }
    },
    [persona, state.input, state.messages, diaryEntries, userName],
  );

  const handleRetry = useCallback(async () => {
    if (!state.pendingUserMessage) return;
    dispatch({ type: 'RETRY' });
    dispatch({ type: 'START_LOADING' });

    try {
      await streamLLM(persona, state.messages, diaryEntries, userName, dispatch);
    } catch {
      dispatch({ type: 'SET_ERROR' });
    }
  }, [state.pendingUserMessage, state.messages, persona, diaryEntries, userName]);

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

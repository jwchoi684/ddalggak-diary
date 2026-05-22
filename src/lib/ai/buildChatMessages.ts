import type { Persona } from '@/lib/storage';
import type { ChatMessage } from '@/lib/storage';

/**
 * OpenAI-compatible message shape for the Chat Completions API.
 * Using a local type to avoid SDK dependency.
 */
export interface LLMMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface BuildChatMessagesParams {
  persona: Persona;
  diariesText: string;
  /** Only the messages from THIS session. MUST NOT include other sessions. */
  sessionMessages: ChatMessage[];
}

/**
 * Builds the messages array to be sent to the OpenAI Chat Completions API.
 *
 * CONTEXT ISOLATION INVARIANT (PRD §4.6.5, §4.6.7):
 *   The returned array is exactly:
 *     [system: persona.systemPrompt + diary corpus, ...sessionMessages only]
 *
 *   Messages from any other session are NEVER included.
 *   This function receives only `sessionMessages`; it has no access to other
 *   sessions and cannot include them even by mistake.
 *
 * System prompt structure:
 *   {persona.systemPrompt}
 *
 *   [일기 목록]
 *   {diariesText || "(일기 없음)"}
 *
 * @param params.persona        - Persona locked at session start.
 * @param params.diariesText    - Serialized diary corpus (from serializeDiariesForLLM).
 * @param params.sessionMessages - Ordered messages from THIS session only.
 * @returns LLMMessage[] ready for the OpenAI messages field.
 */
export function buildChatMessages({
  persona,
  diariesText,
  sessionMessages,
}: BuildChatMessagesParams): LLMMessage[] {
  const diarySection = diariesText.length > 0 ? diariesText : '(일기 없음)';
  const systemContent = `${persona.systemPrompt}\n\n[일기 목록]\n${diarySection}`;

  const system: LLMMessage = { role: 'system', content: systemContent };

  const history: LLMMessage[] = sessionMessages.map((msg) => ({
    role: msg.role,
    content: msg.content,
  }));

  return [system, ...history];
}

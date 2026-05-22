import type { LLMMessage } from './buildChatMessages';

export interface CallChatParams {
  system: string;
  messages: LLMMessage[];
}

export interface CallChatResult {
  content: string;
}

/**
 * Client-side fetch wrapper for the serverless proxy at POST /api/chat.
 *
 * SECURITY: This function NEVER calls OpenAI directly. It calls the internal
 * Next.js API route which holds OPENAI_API_KEY server-side only.
 *
 * @param params.system   - Assembled system prompt (persona + diary corpus).
 * @param params.messages - Full LLM messages array (system + session history).
 * @throws Error with descriptive message on HTTP error or network failure.
 * @returns {content: string} — the assistant's reply text.
 */
export async function callChat(params: CallChatParams): Promise<CallChatResult> {
  const response = await fetch('/api/chat', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(params),
  });

  if (!response.ok) {
    let errorMessage = `API 오류 (${response.status})`;
    try {
      const body = (await response.json()) as { error?: string };
      if (body.error) {
        errorMessage = body.error;
      }
    } catch {
      // ignore parse error, use status-based message
    }
    throw new Error(errorMessage);
  }

  const data = (await response.json()) as { content: string };
  return { content: data.content };
}

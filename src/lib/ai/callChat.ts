import type { LLMMessage } from './buildChatMessages';

export interface CallChatParams {
  system: string;
  messages: LLMMessage[];
  /**
   * Optional streaming callback. Invoked once per text chunk as the assistant
   * response streams in from the server. The callback receives the new chunk
   * only (not the accumulated string); the final return value contains the
   * full concatenated content.
   */
  onChunk?: (chunk: string) => void;
}

export interface CallChatResult {
  content: string;
}

/**
 * Client-side fetch wrapper for the serverless proxy at POST /api/chat.
 *
 * Always streams under the hood: the server returns a text/plain ReadableStream
 * of UTF-8 chunks of the assistant message content. If `onChunk` is provided,
 * it fires for every chunk; otherwise the function still consumes the stream
 * and returns the full content at the end.
 *
 * SECURITY: This function NEVER calls OpenAI directly. It calls the internal
 * Next.js API route which holds OPENAI_API_KEY server-side only.
 *
 * @throws Error with descriptive message on HTTP error or network failure.
 */
export async function callChat(params: CallChatParams): Promise<CallChatResult> {
  const { onChunk, ...body } = params;

  const response = await fetch('/api/chat', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    let errorMessage = `API 오류 (${response.status})`;
    try {
      const errorBody = (await response.json()) as { error?: string };
      if (errorBody.error) errorMessage = errorBody.error;
    } catch {
      // ignore parse error, use status-based message
    }
    throw new Error(errorMessage);
  }

  if (!response.body) {
    throw new Error('API 응답 본문이 비어 있습니다.');
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let full = '';

  // eslint-disable-next-line no-constant-condition
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    const chunk = decoder.decode(value, { stream: true });
    if (chunk.length === 0) continue;
    full += chunk;
    onChunk?.(chunk);
  }
  // Flush any remaining bytes from the decoder.
  const tail = decoder.decode();
  if (tail.length > 0) {
    full += tail;
    onChunk?.(tail);
  }

  return { content: full };
}

import { NextRequest, NextResponse } from 'next/server';
import type { LLMMessage } from '@/lib/ai/buildChatMessages';

/**
 * POST /api/chat — serverless streaming proxy for OpenAI Chat Completions.
 *
 * SECURITY INVARIANTS:
 *   - OPENAI_API_KEY is read from process.env only (server-side).
 *   - The key is NEVER included in any response body or header.
 *   - If the env var is missing, returns HTTP 500 with a helpful message.
 *
 * Request body: { system: string; messages: LLMMessage[] }
 * Response (success): text/plain stream — UTF-8 chunks of the assistant message
 *                     content as it arrives from OpenAI.
 * Response (error): JSON { error: string } with appropriate status.
 *
 * Model: gpt-4o-mini, temperature: 0.7, max_tokens: 500
 */

interface RequestBody {
  system: string;
  messages: LLMMessage[];
}

interface OpenAIStreamChunk {
  choices: Array<{ delta?: { content?: string } }>;
}

export async function POST(req: NextRequest): Promise<Response> {
  const apiKey = process.env.OPENAI_API_KEY;

  if (!apiKey) {
    return NextResponse.json(
      {
        error:
          'OpenAI API 키가 설정되지 않았습니다. .env.local 파일에 OPENAI_API_KEY를 추가해주세요.',
      },
      { status: 500 },
    );
  }

  let body: RequestBody;
  try {
    body = (await req.json()) as RequestBody;
  } catch {
    return NextResponse.json(
      { error: '요청 본문을 파싱할 수 없습니다.' },
      { status: 400 },
    );
  }

  const { messages } = body;
  if (!Array.isArray(messages) || messages.length === 0) {
    return NextResponse.json(
      { error: 'messages 배열이 필요합니다.' },
      { status: 400 },
    );
  }

  let openAIResponse: Response;
  try {
    openAIResponse = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages,
        temperature: 0.7,
        max_tokens: 500,
        stream: true,
      }),
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json(
      { error: `OpenAI 연결 오류: ${message}` },
      { status: 502 },
    );
  }

  if (!openAIResponse.ok || !openAIResponse.body) {
    return NextResponse.json(
      { error: `OpenAI 오류 (${openAIResponse.status})` },
      { status: 502 },
    );
  }

  // Pipe OpenAI's SSE stream into a plain-text chunk stream so the client can
  // read the assistant message as it's generated. We extract `choices[0].delta.content`
  // from each `data: {...}` line and forward only the content text.
  const upstream = openAIResponse.body;
  const encoder = new TextEncoder();
  const decoder = new TextDecoder();
  let sseBuffer = '';

  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      const reader = upstream.getReader();
      try {
        // eslint-disable-next-line no-constant-condition
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          sseBuffer += decoder.decode(value, { stream: true });

          // SSE messages are separated by blank lines (\n\n).
          let sepIdx: number;
          while ((sepIdx = sseBuffer.indexOf('\n\n')) !== -1) {
            const rawEvent = sseBuffer.slice(0, sepIdx);
            sseBuffer = sseBuffer.slice(sepIdx + 2);

            for (const line of rawEvent.split('\n')) {
              if (!line.startsWith('data:')) continue;
              const payload = line.slice(5).trim();
              if (payload === '' || payload === '[DONE]') continue;
              try {
                const json = JSON.parse(payload) as OpenAIStreamChunk;
                const piece = json.choices?.[0]?.delta?.content;
                if (typeof piece === 'string' && piece.length > 0) {
                  controller.enqueue(encoder.encode(piece));
                }
              } catch {
                // skip malformed lines silently
              }
            }
          }
        }
      } catch (err) {
        const message = err instanceof Error ? err.message : 'stream error';
        controller.error(new Error(message));
        return;
      } finally {
        reader.releaseLock();
      }
      controller.close();
    },
  });

  return new Response(stream, {
    status: 200,
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
      'Cache-Control': 'no-cache, no-transform',
      'X-Accel-Buffering': 'no',
    },
  });
}

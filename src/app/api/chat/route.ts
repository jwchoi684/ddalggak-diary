import { NextRequest, NextResponse } from 'next/server';
import type { LLMMessage } from '@/lib/ai/buildChatMessages';

/**
 * POST /api/chat — serverless proxy for OpenAI Chat Completions.
 *
 * SECURITY INVARIANTS:
 *   - OPENAI_API_KEY is read from process.env only (server-side).
 *   - The key is NEVER included in any response body or header.
 *   - If the env var is missing, returns HTTP 500 with a helpful message.
 *
 * Request body: { system: string; messages: LLMMessage[] }
 * Response body: { content: string }
 *
 * Model: gpt-4o-mini, temperature: 0.7, max_tokens: 500
 */

interface RequestBody {
  system: string;
  messages: LLMMessage[];
}

interface OpenAIChoice {
  message: {
    content: string | null;
  };
}

interface OpenAIResponse {
  choices: OpenAIChoice[];
}

export async function POST(req: NextRequest): Promise<NextResponse> {
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
      }),
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json(
      { error: `OpenAI 연결 오류: ${message}` },
      { status: 502 },
    );
  }

  if (!openAIResponse.ok) {
    return NextResponse.json(
      { error: `OpenAI 오류 (${openAIResponse.status})` },
      { status: 502 },
    );
  }

  const data = (await openAIResponse.json()) as OpenAIResponse;
  const content = data.choices[0]?.message?.content ?? '';

  return NextResponse.json({ content });
}

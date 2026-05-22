import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { NextRequest } from 'next/server';

// We import the route handler after setting up env/mocks
async function importRoute() {
  const mod = await import('../route');
  return mod.POST;
}

function makeRequest(body: unknown): NextRequest {
  return new NextRequest('http://localhost/api/chat', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}

describe('POST /api/chat', () => {
  const originalEnv = { ...process.env };

  beforeEach(() => {
    vi.resetModules();
    vi.restoreAllMocks();
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    process.env = originalEnv;
    vi.restoreAllMocks();
  });

  it('RC1: happy path — streams content chunks from OpenAI SSE', async () => {
    process.env.OPENAI_API_KEY = 'test-key-123';

    // Build a fake OpenAI SSE body that emits three delta chunks then [DONE].
    const sseLines = [
      'data: {"choices":[{"delta":{"content":"AI"}}]}\n\n',
      'data: {"choices":[{"delta":{"content":" 응답"}}]}\n\n',
      'data: {"choices":[{"delta":{"content":" 내용"}}]}\n\n',
      'data: [DONE]\n\n',
    ];
    const encoder = new TextEncoder();
    const upstreamBody = new ReadableStream<Uint8Array>({
      start(controller) {
        for (const line of sseLines) controller.enqueue(encoder.encode(line));
        controller.close();
      },
    });

    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      body: upstreamBody,
    });
    vi.stubGlobal('fetch', mockFetch);

    const POST = await importRoute();
    const req = makeRequest({
      system: '시스템 프롬프트',
      messages: [{ role: 'system', content: '시스템 프롬프트' }],
    });

    const res = await POST(req);
    expect(res.status).toBe(200);
    expect(res.headers.get('Content-Type')).toContain('text/plain');

    // Consume the streamed body
    const text = await res.text();
    expect(text).toBe('AI 응답 내용');

    // OpenAI fetch was called with stream:true
    const fetchCall = mockFetch.mock.calls[0];
    expect(fetchCall).toBeDefined();
    const fetchOptions = fetchCall[1] as RequestInit;
    const headers = fetchOptions.headers as Record<string, string>;
    expect(headers['Authorization']).toBe('Bearer test-key-123');
    const bodyJson = JSON.parse(fetchOptions.body as string) as { stream: boolean };
    expect(bodyJson.stream).toBe(true);

    // Key must not appear in streamed response
    expect(text).not.toContain('test-key-123');
  });

  it('RC2: returns 500 when OPENAI_API_KEY is not set', async () => {
    delete process.env.OPENAI_API_KEY;

    const POST = await importRoute();
    const req = makeRequest({
      messages: [{ role: 'system', content: 'test' }],
    });

    const res = await POST(req);
    const body = await res.json() as { error: string };

    expect(res.status).toBe(500);
    expect(body.error).toBeTruthy();
  });

  it('RC3: returns 400 when messages array is missing', async () => {
    process.env.OPENAI_API_KEY = 'test-key-123';

    const POST = await importRoute();
    const req = makeRequest({ system: '시스템 프롬프트' });

    const res = await POST(req);
    expect(res.status).toBe(400);
  });

  it('RC4: returns 502 when OpenAI fetch throws a network error', async () => {
    process.env.OPENAI_API_KEY = 'test-key-123';

    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('Network failure')));

    const POST = await importRoute();
    const req = makeRequest({
      system: '시스템 프롬프트',
      messages: [{ role: 'system', content: 'test' }],
    });

    const res = await POST(req);
    expect(res.status).toBe(502);
  });
});

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

  it('RC1: happy path — returns content from OpenAI', async () => {
    process.env.OPENAI_API_KEY = 'test-key-123';

    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        choices: [{ message: { content: 'AI 응답 내용' } }],
      }),
    });
    vi.stubGlobal('fetch', mockFetch);

    const POST = await importRoute();
    const req = makeRequest({
      system: '시스템 프롬프트',
      messages: [{ role: 'system', content: '시스템 프롬프트' }],
    });

    const res = await POST(req);
    const body = await res.json() as { content: string };

    expect(res.status).toBe(200);
    expect(body.content).toBe('AI 응답 내용');

    // Verify API key is in Authorization header, NOT in response
    const fetchCall = mockFetch.mock.calls[0];
    expect(fetchCall).toBeDefined();
    const fetchOptions = fetchCall[1] as RequestInit;
    const headers = fetchOptions.headers as Record<string, string>;
    expect(headers['Authorization']).toBe('Bearer test-key-123');
    // Key must not appear in response body
    const responseText = JSON.stringify(body);
    expect(responseText).not.toContain('test-key-123');
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

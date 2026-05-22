import { describe, it, expect, vi, afterEach } from 'vitest';
import { callChat } from '@/lib/ai/callChat';

afterEach(() => {
  vi.restoreAllMocks();
});

/**
 * Test helper — builds a ReadableStream that emits the given UTF-8 chunks
 * synchronously and then closes, mirroring the streaming body the production
 * /api/chat route returns.
 */
function streamFromChunks(chunks: string[]): ReadableStream<Uint8Array> {
  const encoder = new TextEncoder();
  return new ReadableStream<Uint8Array>({
    start(controller) {
      for (const c of chunks) controller.enqueue(encoder.encode(c));
      controller.close();
    },
  });
}

describe('callChat', () => {
  it('CC1: concatenates streamed chunks and returns full content', async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      body: streamFromChunks(['안녕', '하세요', '!']),
    });
    vi.stubGlobal('fetch', mockFetch);

    const seenChunks: string[] = [];
    const result = await callChat({
      system: '시스템 프롬프트',
      messages: [{ role: 'system', content: '시스템 프롬프트' }],
      onChunk: (c) => seenChunks.push(c),
    });

    expect(result.content).toBe('안녕하세요!');
    expect(seenChunks).toEqual(['안녕', '하세요', '!']);
    expect(mockFetch).toHaveBeenCalledWith('/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: expect.stringContaining('"messages"'),
    });
  });

  it('CC2: throws on non-ok response, exposing server error message', async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 500,
      json: async () => ({ error: 'API 키가 없습니다' }),
    });
    vi.stubGlobal('fetch', mockFetch);

    await expect(
      callChat({
        system: '시스템 프롬프트',
        messages: [{ role: 'system', content: '시스템 프롬프트' }],
      }),
    ).rejects.toThrow('API 키가 없습니다');
  });

  it('CC3: onChunk is optional — caller can still get full content', async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      body: streamFromChunks(['a', 'b', 'c']),
    });
    vi.stubGlobal('fetch', mockFetch);

    const result = await callChat({
      system: 's',
      messages: [{ role: 'system', content: 's' }],
    });

    expect(result.content).toBe('abc');
  });
});

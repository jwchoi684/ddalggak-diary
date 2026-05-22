import { describe, it, expect, vi, afterEach } from 'vitest';
import { callChat } from '@/lib/ai/callChat';

afterEach(() => {
  vi.restoreAllMocks();
});

describe('callChat', () => {
  it('CC1: returns content on successful response', async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ content: '안녕하세요!' }),
    });
    vi.stubGlobal('fetch', mockFetch);

    const result = await callChat({
      system: '시스템 프롬프트',
      messages: [{ role: 'system', content: '시스템 프롬프트' }],
    });

    expect(result.content).toBe('안녕하세요!');
    expect(mockFetch).toHaveBeenCalledWith('/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: expect.stringContaining('"messages"'),
    });
  });

  it('CC2: throws an Error on non-ok response', async () => {
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
    ).rejects.toThrow();
  });
});
